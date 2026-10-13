import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CityRule, WorkParams, CostParams, PersonalParams, ScenarioResult, CompensationResult } from '../types'
import { ScenarioService } from '../application/scenario/ScenarioService'
import { hydrateParams } from '../utils/params'

export const CITIES = [
  { value: 'guangzhou', label: '广州' },
  { value: 'shenzhen', label: '深圳' },
  { value: 'dongguan', label: '东莞' },
]

interface CustomPlan {
  id: string
  name: string
  work: WorkParams
  costs: CostParams
}

const PARAMS_KEY = 'flexcalc_params_v1'

const DEFAULT_WORK: WorkParams = {
  city: 'guangzhou', dailyHours: 10, dailyOrders: 35,
  avgDistance: 2.5, workDaysMonth: 26, rainDaysMonth: 3, holidayDaysMonth: 2,
}
const DEFAULT_COSTS: CostParams = {
  vehicleType: 'electric', fuelCostMonth: 0,
  electricityCostMonth: 300, maintenanceMonth: 200,
  insuranceMonth: 100, phoneCostMonth: 100, foodCostMonth: 800,
  trafficFineMonth: 50, vehicleDepreciationMonth: 300, otherCostMonth: 100,
}
const DEFAULT_PERSONAL: PersonalParams = {
  currentAge: 25, expectedRetireAge: 60, hasSocialInsurance: false,
  specialDeductionMonth: 0,
  // 可选键必须显式出现在 fallback 中：hydrate 的白名单取自 fallback 的键，
  // 缺键会让写入端存下、读取端静默丢弃（medicalTierId 曾因此每次刷新都丢）
  medicalTierId: undefined,
  pensionBase: undefined,
  medicalBase: undefined,
}

function loadParams() {
  try {
    const raw = localStorage.getItem(PARAMS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Record<string, unknown>
  } catch { return null }
}

export const useMainStore = defineStore('main', () => {
  const rule = ref<CityRule | null>(null)
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const paramsRestored = ref(false)
  let loadSeq = 0
  let persistTimer: ReturnType<typeof setTimeout> | undefined
  const saved = loadParams()

  const work = ref<WorkParams>(hydrateParams(saved?.work, DEFAULT_WORK))
  const costs = ref<CostParams>(hydrateParams(saved?.costs, DEFAULT_COSTS))
  const personal = ref<PersonalParams>(hydrateParams(saved?.personal, DEFAULT_PERSONAL))
  paramsRestored.value = !!saved

  /** 自定义方案是嵌套结构，数组不能走 hydrate 的键值白名单，需单独校验必要字段 */
  const customPlans = ref<CustomPlan[]>(
    Array.isArray(saved?.customPlans)
      ? (saved!.customPlans as unknown[]).filter((p): p is CustomPlan => {
          const o = p as Record<string, unknown> | null
          return !!o && typeof o.id === 'string' && typeof o.name === 'string'
            && !!o.work && typeof o.work === 'object' && !!o.costs && typeof o.costs === 'object'
        }).map(p => ({ id: p.id, name: p.name, work: hydrateParams(p.work, DEFAULT_WORK), costs: hydrateParams(p.costs, DEFAULT_COSTS) }))
      : []
  )

  /** 补偿计算面板的最近一次「用户已确认」结果，文书生成器据此填充真实金额 */
  const compensation = ref<CompensationResult | null>(null)
  function setCompensation(r: CompensationResult | null) { compensation.value = r }

  // 编排走 application 层 ScenarioService（内部已切到 domain 引擎），
  // 与旧 ScenarioEngine 的数值等价性由 tests/parity/old-vs-domain.spec.ts 保证
  const engine = computed(() => rule.value ? new ScenarioService(rule.value) : null)

  /** 取出 Result 的成功值；失败时返回 null，让 UI 走空态而不是抛错白屏 */
  function unwrap<T>(r: { ok: true; value: T } | { ok: false }): T | null {
    return r.ok ? r.value : null
  }

  async function loadRule(city: string) {
    const seq = ++loadSeq
    loading.value = true
    loadError.value = null
    // 无超时的 fetch 在弱网或 SPA 回退挂起时会让 finally 不执行，loading 永久为 true，
    // 城市选择器被禁用后用户无法自救，只能靠手动刷新
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    try {
      const res = await fetch(`/rules/${city}.json`, { signal: controller.signal })
      const ctype = res.headers.get('content-type') || ''
      if (!res.ok) throw new Error(`规则文件加载失败（HTTP ${res.status}）`)
      // 静态托管的 SPA 回退会用 200 + HTML 应答缺失文件，仅判断 res.ok 拦不住
      if (!ctype.includes('json')) throw new Error(`未找到 ${city} 的规则文件`)
      const data = await res.json() as CityRule
      // CDN 边缘节点返回错版本时，规则里的 cityName 会与用户选的城市静默不一致，
      // 而侧边栏显示的是 work.city —— 正是本项目反复要防的"深圳抄广州"类事故
      if (data.city !== city) throw new Error(`规则文件与请求城市不一致（期望 ${city}，实际 ${data.city}）`)
      if (seq !== loadSeq) return
      rule.value = data
      // 医保档次与缴费基数是各城规则文件自己的条目，切换城市后旧值在新城中无意义
      const tierId = personal.value.medicalTierId
      if (tierId && !data.benefit.medicalTiers?.some(t => t.id === tierId)) {
        personal.value.medicalTierId = undefined
      }
      personal.value.pensionBase = undefined
      personal.value.medicalBase = undefined
    } catch (err) {
      if (seq !== loadSeq) return
      rule.value = null
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      loadError.value = aborted ? '加载超时（12秒），请检查网络后重试' : (err instanceof Error ? err.message : String(err))
    } finally {
      clearTimeout(timer)
      if (seq === loadSeq) loading.value = false
    }
  }

  function setCity(city: string) {
    work.value.city = city
    customPlans.value = []
    // 补偿金额含按本城社保基数做的封顶/保底，跨城沿用会得出错误的主张数额
    compensation.value = null
    return loadRule(city)
  }

  /** 参数是用户逐项调出来的，刷新即丢会让"方案对比"无法复现，故落本地存储 */
  watch([work, costs, personal, customPlans], () => {
    clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(PARAMS_KEY, JSON.stringify({
          work: work.value, costs: costs.value, personal: personal.value, customPlans: customPlans.value,
        }))
      } catch { /* 隐私模式或配额耗尽时静默降级为不持久化 */ }
    }, 300)
  }, { deep: true })

  function resetParams() {
    // 保留当前城市：DEFAULT_WORK.city 是 guangzhou，直接展开会把用户从深圳/东莞静默切回广州
    const keepCity = work.value.city
    work.value = { ...DEFAULT_WORK, city: keepCity }
    costs.value = { ...DEFAULT_COSTS }
    personal.value = { ...DEFAULT_PERSONAL }
    customPlans.value = []
    paramsRestored.value = false
    return loadRule(keepCity)
  }

  const scenarios = computed<ScenarioResult[]>(() => {
    const eng = engine.value
    if (!eng) return []
    const list = [
      { id: 'current', name: '当前方案', work: work.value, costs: costs.value, personal: personal.value },
      { id: 'more_hours', name: '多跑2小时', work: { ...work.value, dailyHours: Math.min(work.value.dailyHours + 2, 14) }, costs: costs.value, personal: personal.value },
      { id: 'more_orders', name: '多接5单', work: { ...work.value, dailyOrders: work.value.dailyOrders + 5 }, costs: costs.value, personal: personal.value },
    ]
    const results = list
      .map(s => unwrap(eng.runScenario(s)))
      .filter((s): s is ScenarioResult => s !== null)

    if (!personal.value.hasSocialInsurance) {
      const insured = unwrap(eng.runScenario({ id: 'with_insurance', name: '缴齐社保', work: work.value, costs: costs.value, personal: { ...personal.value, hasSocialInsurance: true } }))
      if (insured) results.push(insured)
    }

    for (const p of customPlans.value) {
      const custom = unwrap(eng.runScenario({ id: p.id, name: p.name, work: p.work, costs: p.costs, personal: personal.value }))
      if (custom) results.push(custom)
    }

    return results
  })

  function addScenario(name: string, w: WorkParams, c: CostParams) {
    customPlans.value.push({ id: `custom_${Date.now()}`, name, work: { ...w }, costs: { ...c } })
  }

  function removeScenario(id: string) {
    customPlans.value = customPlans.value.filter(p => p.id !== id)
  }

  const comparison = computed(() => {
    const eng = engine.value
    const list = scenarios.value
    if (!eng || list.length === 0) return null
    return unwrap(eng.compare({
      scenarios: list.map(s => ({ id: s.id, name: s.name, work: s.work, costs: s.costs, personal: personal.value })),
    }))
  })

  return { rule, loading, loadError, paramsRestored, work, costs, personal, customPlans, compensation, setCompensation, scenarios, comparison, loadRule, setCity, resetParams, addScenario, removeScenario }
})
