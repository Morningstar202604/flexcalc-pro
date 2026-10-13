/**
 * LocalStorage 适配器 — 实现 ParameterStorage 端口
 *
 * 设计要点：
 * - 返回 Result<T, StorageError> 而非抛出，调用方显式处理失败路径
 * - 隐私模式 / 配额耗尽时静默降级为不持久化，不阻塞主流程
 * - 可选键前缀，避免与其他应用共用 localStorage 时相互污染
 */

import { ok, err, type Result } from '../../domain/shared/result'

/** 参数存储端口 */
export interface ParameterStorage {
  get<T = unknown>(key: string): Result<T | null, StorageError>
  set<T = unknown>(key: string, value: T): Result<void, StorageError>
  remove(key: string): Result<void, StorageError>
  clear(): Result<void, StorageError>
  has(key: string): boolean
}

/** 存储错误 */
export interface StorageError {
  code: 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'PARSE_ERROR' | 'WRITE_FAILED' | 'READ_FAILED'
  message: string
  cause?: unknown
}

function storageError(code: StorageError['code'], message: string, cause?: unknown): StorageError {
  return { code, message, cause }
}

/** 判断是否为存储配额错误 */
function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

export class LocalStorageAdapter implements ParameterStorage {
  private readonly prefix: string
  private available: boolean

  constructor(prefix = 'flexcalc_') {
    this.prefix = prefix
    this.available = LocalStorageAdapter.probe()
  }

  /** 探测 localStorage 是否可用（隐私模式下访问即抛异常） */
  private static probe(): boolean {
    try {
      const probeKey = '__flexcalc_probe__'
      window.localStorage.setItem(probeKey, '1')
      window.localStorage.removeItem(probeKey)
      return true
    } catch {
      return false
    }
  }

  private fullKey(key: string): string {
    return `${this.prefix}${key}`
  }

  get<T = unknown>(key: string): Result<T | null, StorageError> {
    if (!this.available) {
      return err(storageError('UNAVAILABLE', 'localStorage 不可用（可能处于隐私模式）'))
    }
    try {
      const raw = window.localStorage.getItem(this.fullKey(key))
      if (raw === null) return ok(null)
      return ok(JSON.parse(raw) as T)
    } catch (e) {
      return err(storageError('PARSE_ERROR', `反序列化失败: ${key}`, e))
    }
  }

  set<T = unknown>(key: string, value: T): Result<void, StorageError> {
    if (!this.available) {
      return err(storageError('UNAVAILABLE', 'localStorage 不可用（可能处于隐私模式）'))
    }
    try {
      window.localStorage.setItem(this.fullKey(key), JSON.stringify(value))
      return ok(undefined)
    } catch (e) {
      if (isQuotaError(e)) {
        return err(storageError('QUOTA_EXCEEDED', '存储配额已耗尽，本次参数不会被持久化', e))
      }
      return err(storageError('WRITE_FAILED', `写入失败: ${key}`, e))
    }
  }

  remove(key: string): Result<void, StorageError> {
    if (!this.available) {
      return err(storageError('UNAVAILABLE', 'localStorage 不可用（可能处于隐私模式）'))
    }
    try {
      window.localStorage.removeItem(this.fullKey(key))
      return ok(undefined)
    } catch (e) {
      return err(storageError('WRITE_FAILED', `删除失败: ${key}`, e))
    }
  }

  clear(): Result<void, StorageError> {
    if (!this.available) {
      return err(storageError('UNAVAILABLE', 'localStorage 不可用（可能处于隐私模式）'))
    }
    try {
      const prefix = this.prefix
      const toRemove: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k !== null && k.startsWith(prefix)) toRemove.push(k)
      }
      toRemove.forEach(k => window.localStorage.removeItem(k))
      return ok(undefined)
    } catch (e) {
      return err(storageError('WRITE_FAILED', '清空失败', e))
    }
  }

  has(key: string): boolean {
    if (!this.available) return false
    try {
      return window.localStorage.getItem(this.fullKey(key)) !== null
    } catch {
      return false
    }
  }
}

/** 工厂函数 */
export function createLocalStorageAdapter(prefix?: string): LocalStorageAdapter {
  return new LocalStorageAdapter(prefix)
}