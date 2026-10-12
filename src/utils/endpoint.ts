/**
 * 自定义 endpoint 校验。
 * 用户在设置里自填 API 地址，Authorization 头会直接发往该地址，
 * 因此这里必须拦住三类误用：明文 http（Key 过网可读）、相对路径（会打到本站 origin）、
 * 内嵌凭据的 URL（https://legit.com@evil.com 这类钓鱼写法）。
 */

export interface EndpointCheck {
  ok: boolean
  /** 解析出的主机名，供 UI 在发送前告知用户 Key 将发往哪里 */
  host?: string
  error?: string
}

/** 本地开发用的回环地址，允许 http；其余一律要求 https */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function validateEndpoint(raw: string): EndpointCheck {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return { ok: false, error: 'Endpoint 不能为空' }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, error: 'Endpoint 不是合法 URL（需包含协议，如 https://）' }
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { ok: false, error: `不支持的协议 ${url.protocol}，仅允许 https` }
  }

  if (url.protocol === 'http:' && !LOCAL_HOSTS.has(url.hostname)) {
    return { ok: false, error: '非本机地址必须使用 https，否则 API Key 会明文过网' }
  }

  if (url.username || url.password) {
    return { ok: false, error: 'Endpoint 不得内嵌用户名或密码' }
  }

  if (!url.hostname) return { ok: false, error: 'Endpoint 缺少主机名' }

  return { ok: true, host: url.host }
}

/**
 * 从 chat/completions 地址推导 models 地址用于连通性测试。
 * 原来的两次 replace 链不可靠：第二次 replace 永远匹配不到（第一次已替换掉），
 * 且 Azure 的 /deployments/{name}/chat/completions 形态会被改坏。
 */
export function deriveModelsUrl(raw: string): { ok: boolean; url?: string; error?: string } {
  const check = validateEndpoint(raw)
  if (!check.ok) return { ok: false, error: check.error }
  const url = new URL(raw.trim())
  if (/\/chat\/completions\/?$/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/\/chat\/completions\/?$/, '/models')
    return { ok: true, url: url.toString() }
  }
  return { ok: false, error: '该形态无法推导 models 地址，请手动填写完整的 models 接口 URL' }
}