/**
 * 规则文件加载 — 网络适配器
 *
 * 架构说明（重要）：
 * domain 层定义的 *RuleProvider 是**同步**接口（引擎计算必须同步完成），
 * 而 HTTP 加载天然是异步的。此处不把异步泄漏进 domain，而是分成两层：
 *
 *   RuleRepository（异步，本文件）  —— 负责取回 + 校验 + 缓存原始 CityRule JSON
 *        ↓ load() 完成后
 *   RuleSnapshot（同步，本文件内）  —— 基于已加载快照实现四个同步 RuleProvider 端口
 *
 * 这样引擎保持纯同步、可单测，网络不确定性被隔离在边界之外。
 */

import { ok, err, type Result } from '../../domain/shared/result'
import type { CityRule } from '../../types'
import type { RuleCache } from '../persistence/IndexedDBAdapter'

/** 网络错误 */
export interface NetworkError {
  code: 'ABORTED' | 'HTTP_ERROR' | 'INVALID_CONTENT_TYPE' | 'INVALID_JSON' | 'CITY_MISMATCH' | 'NETWORK_ERROR'
  message: string
  status?: number
  cause?: unknown
}

function netError(code: NetworkError['code'], message: string, extra?: Partial<NetworkError>): NetworkError {
  return { code, message, ...extra }
}

/** 异步规则仓库端口 */
export interface RuleRepository {
  getCityRule(city: string, opts?: { signal?: AbortSignal }): Promise<Result<CityRule, NetworkError>>
  listCities(): string[]
}

/** 极简运行时校验：只拦结构性缺失，不做全量 schema 校验（schema 由 CI 校验 JSON 文件保证） */
function assertCityRule(data: unknown, expectedCity: string): Result<CityRule, NetworkError> {
  if (typeof data !== 'object' || data === null) {
    return err(netError('INVALID_JSON', '规则文件不是对象'))
  }
  const r = data as Record<string, unknown>
  for (const key of ['city', 'income', 'tax', 'benefit', 'retirement', 'soleProprietorship', 'sources']) {
    if (!(key in r)) {
      return err(netError('INVALID_JSON', `规则文件缺少必需字段：${key}`))
    }
  }
  // CDN 边缘节点可能返回错版本缓存，cityName 与用户所选城市静默不一致是本项目反复要防的事故
  if (r['city'] !== expectedCity) {
    return err(netError('CITY_MISMATCH', `规则文件与请求城市不一致（期望 ${expectedCity}，实际 ${String(r['city'])}）`))
  }
  return ok(data as CityRule)
}

export class HttpRuleRepository implements RuleRepository {
  private readonly basePath: string
  private readonly supportedCities: string[]
  private readonly cache: RuleCache | null
  private readonly timeoutMs: number
  /** 已加载快照，供同步 RuleProvider 读取 */
  private readonly snapshot = new Map<string, CityRule>()

  constructor(basePath = '/rules', cities = ['guangzhou', 'shenzhen', 'dongguan'], cache: RuleCache | null = null, timeoutMs = 12_000) {
    this.basePath = basePath.replace(/\/$/, '')
    this.supportedCities = cities
    this.cache = cache
    this.timeoutMs = timeoutMs
  }

  listCities(): string[] {
    return [...this.supportedCities]
  }

  async getCityRule(city: string, opts: { signal?: AbortSignal } = {}): Promise<Result<CityRule, NetworkError>> {
    // 命中内存快照：同一次会话内重复取同一城市不再发请求
    const cached = this.snapshot.get(city)
    if (cached) return ok(cached)

    // 先查离线缓存，命中即可跳过网络（弱网/离线体验）
    if (this.cache) {
      const offline = await this.cache.get<CityRule>(`rule:${city}`)
      if (offline.ok && offline.value) {
        const validated = assertCityRule(offline.value, city)
        if (validated.ok) {
          this.snapshot.set(city, validated.value)
          return ok(validated.value)
        }
      }
    }

    const controller = new AbortController()
    const onAbort = () => controller.abort()
    opts.signal?.addEventListener('abort', onAbort)
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await fetch(`${this.basePath}/${city}.json`, { signal: controller.signal })
      if (!res.ok) {
        return err(netError('HTTP_ERROR', `规则文件加载失败（HTTP ${res.status}）`, { status: res.status }))
      }
      // 静态托管的 SPA 回退会用 200 + HTML 应答缺失文件，仅判断 res.ok 拦不住
      const ctype = res.headers.get('content-type') || ''
      if (!ctype.includes('json')) {
        return err(netError('INVALID_CONTENT_TYPE', `未找到 ${city} 的规则文件`))
      }
      let data: unknown
      try {
        data = await res.json()
      } catch (e) {
        return err(netError('INVALID_JSON', `${city} 规则文件不是合法 JSON`, { cause: e }))
      }
      const validated = assertCityRule(data, city)
      if (!validated.ok) return err(validated.error)

      this.snapshot.set(city, validated.value)
      if (this.cache) void this.cache.set(`rule:${city}`, validated.value)
      return ok(validated.value)
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'AbortError'
      return aborted
        ? err(netError('ABORTED', `加载超时（${this.timeoutMs / 1000}秒），请检查网络后重试`))
        : err(netError('NETWORK_ERROR', e instanceof Error ? e.message : '网络错误', { cause: e }))
    } finally {
      clearTimeout(timer)
      opts.signal?.removeEventListener('abort', onAbort)
    }
  }

  /** 同步读取已加载快照，供同步 Provider 使用 */
  peek(city: string): CityRule | null {
    return this.snapshot.get(city) ?? null
  }

  /** 供同步 Provider 使用的快照视图 */
  snapshotOf(): RuleSnapshot {
    return new RuleSnapshot(this.snapshot, this.supportedCities)
  }
}

/**
 * 同步规则快照：把已加载的 CityRule 提供给展示层同步读取
 *
 * 注意：这里刻意 **不** `implements` domain 的 *RuleProvider 端口。
 * domain 层为保证类型安全，用品牌类型（Cent/Rate）重新声明了 IncomeRule 等结构，
 * 与 src/types 的同名字段类型不兼容；强行实现端口需要一份 JSON→品牌的转换器，
 * 而该转换器已由各 domain 引擎自带的 Json*RuleProvider 承担。
 * 本类的职责仅是：让 UI 在同步上下文里读到已加载规则，避免重复 fetch。
 */
export class RuleSnapshot {
  constructor(
    private readonly rules: Map<string, CityRule>,
    private readonly cities: string[],
  ) {}

  listCities(): string[] {
    return [...this.cities]
  }

  getRule(cityId: string): CityRule | null {
    return this.rules.get(cityId) ?? null
  }

  getIncomeRule(cityId: string): CityRule['income'] | null {
    return this.rules.get(cityId)?.income ?? null
  }

  getBenefitRule(cityId: string): CityRule['benefit'] | null {
    return this.rules.get(cityId)?.benefit ?? null
  }

  getRetirementRule(cityId: string): CityRule['retirement'] | null {
    return this.rules.get(cityId)?.retirement ?? null
  }

  getSoleProprietorshipRule(cityId: string): CityRule['soleProprietorship'] | null {
    return this.rules.get(cityId)?.soleProprietorship ?? null
  }
}

/** 工厂 */
export function createRuleRepository(cache?: RuleCache): HttpRuleRepository {
  return new HttpRuleRepository('/rules', ['guangzhou', 'shenzhen', 'dongguan'], cache ?? null)
}