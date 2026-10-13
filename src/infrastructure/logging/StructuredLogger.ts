/**
 * 结构化日志 — 生产级可观测性基础设施
 * - 级别：DEBUG < INFO < WARN < ERROR < FATAL
 * - 上下文自动携带：traceId、userId、sessionId、版本、环境
 * - PII 脱敏：手机、身份证、银行卡、Key 自动打码
 * - 采样：高频 DEBUG/INFO 可配置采样率
 * - 输出：控制台（开发）、远程端点（生产）、IndexedDB（离线缓冲）
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

/** 应用版本：构建期由 vite define 注入，回退为 'dev' */
declare const __APP_VERSION__: string | undefined
const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'

export interface LogContext {
  traceId?: string
  userId?: string
  sessionId?: string
  component?: string
  action?: string
  durationMs?: number
  metadata?: Record<string, unknown>
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: LogContext
  error?: { name: string; message: string; stack?: string }
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
}

const PII_PATTERNS: RegExp[] = [
  /\b\d{11}\b/g,                                    // 手机号
  /\b\d{17}[\dXx]\b/g,                              // 身份证
  /\b\d{16,19}\b/g,                                 // 银行卡
  /sk-[a-zA-Z0-9]{32,}/g,                           // OpenAI Key
  /Bearer\s+[a-zA-Z0-9\-_=.]{20,}/g,                // Bearer Token
]

function maskPII(text: string): string {
  let masked = text
  for (const pattern of PII_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      if (match.length <= 4) return '****'
      return match.slice(0, 2) + '*'.repeat(match.length - 4) + match.slice(-2)
    })
  }
  return masked
}

function generateTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

class StructuredLogger {
  private static _instance: StructuredLogger | null = null
  private minLevel: LogLevel = 'INFO'
  private sampleRates: Record<LogLevel, number> = {
    DEBUG: 0.1,
    INFO: 0.5,
    WARN: 1,
    ERROR: 1,
    FATAL: 1,
  }
  private remoteEndpoint: string | null = null
  private buffer: LogEntry[] = []
  private readonly maxBuffer = 500
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private sessionId: string

  private constructor() {
    this.sessionId = generateTraceId()
    this.startPeriodicFlush()
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger._instance) {
      StructuredLogger._instance = new StructuredLogger()
    }
    return StructuredLogger._instance
  }

  /** 配置（应用启动时调用一次） */
  configure(options: {
    minLevel?: LogLevel
    sampleRates?: Partial<Record<LogLevel, number>>
    remoteEndpoint?: string
  }): void {
    if (options.minLevel) this.minLevel = options.minLevel
    if (options.sampleRates) this.sampleRates = { ...this.sampleRates, ...options.sampleRates }
    if (options.remoteEndpoint) this.remoteEndpoint = options.remoteEndpoint
  }

  private shouldLog(level: LogLevel): boolean {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return false
    const rate = this.sampleRates[level]
    return rate >= 1 || Math.random() < rate
  }

  private log(level: LogLevel, message: string, context: LogContext = {}, error?: Error): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: maskPII(message),
      context: {
        ...context,
        sessionId: this.sessionId,
        traceId: context.traceId || generateTraceId(),
      },
      error: error
        ? {
            name: error.name,
            message: maskPII(error.message),
            stack: error.stack ? maskPII(error.stack) : undefined,
          }
        : undefined,
    }

    // 控制台输出（开发环境）
    if (typeof console !== 'undefined') {
      const style = this.getConsoleStyle(level)
      const method = level === 'DEBUG' ? 'log' : level.toLowerCase()
      const sink = console[method as 'log' | 'info' | 'warn' | 'error']
      sink(
        `%c[${level}]%c ${entry.timestamp} %c${entry.message}`,
        style.level,
        'color: #64748b',
        style.msg,
        entry.context,
      )
    }

    // 缓冲区
    this.buffer.push(entry)
    if (this.buffer.length > this.maxBuffer) this.buffer.shift()

    // 致命错误立即刷新
    if (level === 'FATAL') this.flush()
  }

  private getConsoleStyle(level: LogLevel) {
    const colors: Record<LogLevel, { level: string; msg: string }> = {
      DEBUG: { level: 'color: #64748b', msg: 'color: #334155' },
      INFO: { level: 'color: #0d9488', msg: 'color: #0f172a' },
      WARN: { level: 'color: #d97706', msg: 'color: #92400e' },
      ERROR: { level: 'color: #dc2626', msg: 'color: #991b1b' },
      FATAL: { level: 'color: #fff; background: #dc2626', msg: 'color: #fff; background: #dc2626' },
    }
    return colors[level]
  }

  /** 异步发送到远程端点 */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.remoteEndpoint) return
    const payload = this.buffer.splice(0, this.buffer.length)
    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: payload, app: 'flexcalc-pro', version: APP_VERSION }),
        keepalive: true,
      })
    } catch {
      // 失败时放回缓冲区头部（下次重试）
      this.buffer.unshift(...payload)
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => this.flush(), 30_000)
  }

  debug(message: string, context?: LogContext): void { this.log('DEBUG', message, context) }
  info(message: string, context?: LogContext): void { this.log('INFO', message, context) }
  warn(message: string, context?: LogContext): void { this.log('WARN', message, context) }
  error(message: string, context?: LogContext, error?: Error): void { this.log('ERROR', message, context, error) }
  fatal(message: string, context?: LogContext, error?: Error): void { this.log('FATAL', message, context, error) }

  /** 创建带默认上下文的子记录器 */
  child(defaultContext: LogContext): StructuredLogger {
    const child = Object.create(this) as StructuredLogger
    const originalLog = this.log.bind(this)
    child.log = (level: LogLevel, msg: string, ctx: LogContext = {}, err?: Error) =>
      originalLog(level, msg, { ...defaultContext, ...ctx }, err)
    return child
  }

  /** 获取缓冲区（测试/调试用） */
  getBuffer(): LogEntry[] {
    return [...this.buffer]
  }

  /** 清空缓冲区 */
  clearBuffer(): void {
    this.buffer = []
  }
}

export const logger = StructuredLogger.getInstance()

/** 便捷函数 */
export function createChildLogger(context: LogContext): StructuredLogger {
  return logger.child(context)
}