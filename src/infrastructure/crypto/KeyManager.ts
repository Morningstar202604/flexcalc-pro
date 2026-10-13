/**
 * 密钥管理 — AI Key 生命周期
 *
 * 安全红线（不可放宽）：
 * 1. 默认实现 InMemoryKeyManager：Key 只存在于内存，刷新即失，绝不落盘
 * 2. 可选实现 EncryptedKeyManager：AES-GCM 加密后存 localStorage
 * 3. 任何实现都不得把 Key 写入日志、错误信息或遥测载荷
 */

import { ok, err, type Result } from '../../domain/shared/result'

/** 密钥管理端口 */
export interface KeyManager {
  getKey(): string | null
  setKey(key: string): Result<void, KeyError> | Promise<Result<void, KeyError>>
  clearKey(): Result<void, KeyError> | Promise<Result<void, KeyError>>
  hasKey(): boolean
}

export interface KeyError {
  code: 'INVALID_KEY' | 'ENCRYPTION_FAILED' | 'DECRYPTION_FAILED' | 'UNAVAILABLE'
  message: string
}

/** 校验 Key 非空且已 trim */
function validateKey(key: string): Result<string, KeyError> {
  const trimmed = key.trim()
  if (trimmed.length === 0) {
    return err({ code: 'INVALID_KEY', message: 'Key 不能为空' })
  }
  return ok(trimmed)
}

/** 默认实现：仅内存，刷新即失 */
export class InMemoryKeyManager implements KeyManager {
  private key: string | null = null

  getKey(): string | null {
    return this.key
  }

  setKey(key: string): Result<void, KeyError> {
    const validated = validateKey(key)
    if (!validated.ok) return err(validated.error)
    this.key = validated.value
    return ok(undefined)
  }

  clearKey(): Result<void, KeyError> {
    this.key = null
    return ok(undefined)
  }

  hasKey(): boolean {
    return this.key !== null && this.key.length > 0
  }
}

/**
 * 可选实现：AES-GCM 加密后落 localStorage
 *
 * 加密密钥由设备侧派生（PBKDF2），因此这层加密的价值是
 * 「防止同域 XSS 直接读到明文」而非「抵御有本地执行能力的攻击者」——
 * 文档与 UI 均如实说明，不夸大为不可破解。
 */
export class EncryptedKeyManager implements KeyManager {
  private key: string | null = null
  private readonly storageKey: string
  private readonly salt: Uint8Array

  constructor(storageKey = 'flexcalc_ai_key', salt = new Uint8Array([0x66, 0x6c, 0x65, 0x78, 0x63, 0x61, 0x6c, 0x63, 0x76, 0x32, 0x6b, 0x65, 0x79])) {
    this.storageKey = storageKey
    this.salt = salt
  }

  private async deriveKey(): Promise<CryptoKey> {
    const material = await crypto.subtle.importKey(
      'raw',
      this.salt as BufferSource,
      'PBKDF2',
      false,
      ['deriveKey'],
    )
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: this.salt as BufferSource, iterations: 100_000, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  getKey(): string | null {
    return this.key
  }

  async getKeyAsync(): Promise<string | null> {
    if (this.key) return this.key
    const stored = this.readStored()
    if (!stored) return null
    try {
      const cryptoKey = await this.deriveKey()
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(stored.iv) },
        cryptoKey,
        new Uint8Array(stored.data),
      )
      this.key = new TextDecoder().decode(decrypted)
      return this.key
    } catch {
      return null
    }
  }

  private readStored(): { iv: number[]; data: number[] } | null {
    try {
      const raw = window.localStorage.getItem(this.storageKey)
      if (!raw) return null
      return JSON.parse(raw) as { iv: number[]; data: number[] }
    } catch {
      return null
    }
  }

  async setKey(key: string): Promise<Result<void, KeyError>> {
    const validated = validateKey(key)
    if (!validated.ok) return err(validated.error)
    this.key = validated.value
    try {
      const cryptoKey = await this.deriveKey()
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        new TextEncoder().encode(this.key),
      )
      window.localStorage.setItem(
        this.storageKey,
        JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) }),
      )
      return ok(undefined)
    } catch (e) {
      return err({ code: 'ENCRYPTION_FAILED', message: e instanceof Error ? e.message : '加密失败' })
    }
  }

  async clearKey(): Promise<Result<void, KeyError>> {
    this.key = null
    try {
      window.localStorage.removeItem(this.storageKey)
    } catch {
      // 移除失败不影响内存清理结果
    }
    return ok(undefined)
  }

  hasKey(): boolean {
    return this.key !== null && this.key.length > 0
  }
}

/** 工厂：默认仅内存，encrypted=true 时启用加密存储 */
export function createKeyManager(encrypted = false): KeyManager {
  return encrypted ? new EncryptedKeyManager() : new InMemoryKeyManager()
}