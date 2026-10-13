/**
 * IndexedDB 适配器 — 实现 RuleCache 端口
 *
 * 用途：缓存城市规则文件，使离线或弱网下仍可使用已加载过的城市。
 * 设计要点：
 * - 全部操作返回 Result，失败不抛出，调用方可降级为「规则未缓存」
 * - 支持 TTL 过期，过期条目读取时视为未命中并异步清除
 * - IndexedDB 不可用（隐私模式 / 老浏览器）时整体降级为内存缓存
 */

import { ok, err, type Result } from '../../domain/shared/result'

/** 规则缓存端口 */
export interface RuleCache {
  get<T = unknown>(key: string): Promise<Result<T | null, CacheError>>
  set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<Result<void, CacheError>>
  delete(key: string): Promise<Result<void, CacheError>>
  clear(): Promise<Result<void, CacheError>>
  getKeys(): Promise<Result<string[], CacheError>>
}

/** 缓存错误 */
export interface CacheError {
  code: 'UNAVAILABLE' | 'OPEN_FAILED' | 'TX_FAILED' | 'READ_FAILED' | 'WRITE_FAILED'
  message: string
  cause?: unknown
}

function cacheError(code: CacheError['code'], message: string, cause?: unknown): CacheError {
  return { code, message, cause }
}

const DB_NAME = 'flexcalc_cache'
const DB_VERSION = 1
const STORE_NAME = 'rules'
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 天

interface CacheEntry {
  value: unknown
  expiresAt: number
}

export class IndexedDBAdapter implements RuleCache {
  private db: IDBDatabase | null = null
  private readonly memory = new Map<string, CacheEntry>()
  private useMemory = false

  constructor() {
    // 打开是异步的，这里不阻塞构造；首次使用时若 db 尚未就绪则走内存
  }

  private async open(): Promise<IDBDatabase | null> {
    if (this.useMemory) return null
    if (this.db) return this.db
    if (typeof indexedDB === 'undefined') {
      this.useMemory = true
      return null
    }
    return new Promise<IDBDatabase | null>((resolve) => {
      let request: IDBOpenDBRequest
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION)
      } catch {
        this.useMemory = true
        resolve(null)
        return
      }
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
      }
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }
      request.onerror = () => {
        this.useMemory = true
        resolve(null)
      }
      request.onblocked = () => {
        this.useMemory = true
        resolve(null)
      }
    })
  }

  private async tx<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<Result<T, CacheError>> {
    const db = await this.open()
    if (!db) {
      return err(cacheError('UNAVAILABLE', 'IndexedDB 不可用，已降级为内存缓存'))
    }
    return new Promise<Result<T, CacheError>>((resolve) => {
      let transaction: IDBTransaction
      try {
        transaction = db.transaction(STORE_NAME, mode)
      } catch (e) {
        resolve(err(cacheError('TX_FAILED', '开启事务失败', e)))
        return
      }
      const store = transaction.objectStore(STORE_NAME)
      const request = run(store)
      request.onsuccess = () => resolve(ok(request.result))
      request.onerror = () => {
        const code = mode === 'readonly' ? 'READ_FAILED' : 'WRITE_FAILED'
        resolve(err(cacheError(code, 'IndexedDB 操作失败', request.error)))
      }
      transaction.onerror = () => resolve(err(cacheError('TX_FAILED', '事务提交失败', transaction.error)))
    })
  }

  async get<T = unknown>(key: string): Promise<Result<T | null, CacheError>> {
    const now = Date.now()

    const idb = await this.tx<CacheEntry | undefined>('readonly', s => s.get(key) as IDBRequest<CacheEntry | undefined>)
    if (idb.ok && idb.value !== undefined) {
      if (idb.value.expiresAt > now) return ok(idb.value.value as T)
      void this.delete(key) // 过期，异步清除
      return ok(null)
    }

    // 回落到内存缓存
    const cached = this.memory.get(key)
    if (cached) {
      if (cached.expiresAt > now) return ok(cached.value as T)
      this.memory.delete(key)
    }
    return ok(null)
  }

  async set<T = unknown>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): Promise<Result<void, CacheError>> {
    const entry: CacheEntry = { value, expiresAt: Date.now() + ttlMs }
    this.memory.set(key, entry)
    const result = await this.tx('readwrite', s => s.put(entry, key) as IDBRequest<IDBValidKey>)
    if (!result.ok) {
      // IDB 写失败不视为致命：内存缓存已写入，本次会话仍可用
      return ok(undefined)
    }
    return ok(undefined)
  }

  async delete(key: string): Promise<Result<void, CacheError>> {
    this.memory.delete(key)
    const result = await this.tx('readwrite', s => s.delete(key))
    if (!result.ok) return ok(undefined)
    return ok(undefined)
  }

  async clear(): Promise<Result<void, CacheError>> {
    this.memory.clear()
    const result = await this.tx('readwrite', s => s.clear())
    if (!result.ok) return ok(undefined)
    return ok(undefined)
  }

  async getKeys(): Promise<Result<string[], CacheError>> {
    const result = await this.tx<IDBValidKey[]>('readonly', s => s.getAllKeys())
    if (!result.ok) return ok([...this.memory.keys()])
    return ok(result.value.map(String))
  }
}

/** 工厂函数 */
export function createIndexedDBAdapter(): IndexedDBAdapter {
  return new IndexedDBAdapter()
}