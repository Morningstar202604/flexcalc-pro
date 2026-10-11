import { ref, onScopeDispose } from 'vue'
import type { ScenarioResult } from '../types'
import { scoreTier, scoreLevel } from '../utils/score'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
  source?: 'ai'
}

export interface ApiConfig {
  endpoint: string
  apiKey: string
  model: string
  enabled: boolean
}

const STORAGE_KEY = 'flexcalc_ai_cfg'
const HISTORY_KEY = 'flexcalc_chat_hist'

function loadConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { endpoint: 'https://api.deepseek.com/v1/chat/completions', apiKey: '', model: 'deepseek-chat', enabled: false }
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return [{ id: 'welcome', role: 'assistant', content: '你好！我是灵算 AI 助手。我已读取你当前的数据，可以帮你分析收入结构、税务优化、社保规划、风险评估等。直接输入问题即可，也可以点击下方快捷问题。', timestamp: Date.now() }]
}

export function useAIChat() {
  const config = ref<ApiConfig>(loadConfig())
  const messages = ref<ChatMessage[]>(loadHistory())
  const isStreaming = ref(false)
  const isOnline = ref(navigator.onLine)
  const showSettings = ref(false)
  const controller = ref<AbortController | null>(null)

  const setOnline = () => { isOnline.value = true }
  const setOffline = () => { isOnline.value = false }
  window.addEventListener('online', setOnline)
  window.addEventListener('offline', setOffline)
  onScopeDispose(() => {
    controller.value?.abort()
    window.removeEventListener('online', setOnline)
    window.removeEventListener('offline', setOffline)
  })

  function saveConfig() { localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value)) }
  function saveHistory() { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.value.slice(-50))) }

  function buildContext(scenarios: ScenarioResult[]): string {
    const best = scenarios[0]
    if (!best) return '用户暂未测算'
    return `城市=${best.work.city},工时=${best.work.dailyHours}h,日单=${best.work.dailyOrders},月工作日=${best.work.workDaysMonth}天。月收入=¥${best.income.grossIncome},成本=¥${best.costBreakdown.total},月个税≈¥${Math.round(best.tax.annualTax/12)},净收入=¥${best.netMonthly},时薪=¥${best.netHourly},权益评分=${best.rightsScore}/100。${best.keyInsights?.join('│') || ''}`
  }

  function ruleReply(q: string, scenarios: ScenarioResult[]): string {
    const best = scenarios[0]
    if (!best) return '请先在左侧调整参数完成测算，我再帮你分析。'
    const query = q.toLowerCase()

    if (/税|省|优化/.test(query)) {
      if (best.tax.effectiveRate > 5) return `实际税率 ${best.tax.effectiveRate}%，税负偏高。若你具备真实经营实质（自有生产经营范围、独立建账、以自身名义承接业务）并已由税务机关核准相应征收方式，可咨询税务师核实是否适用经营所得申报；否则以劳务报酬累计预扣为准。以上为税负差异估算，不构成涉税意见。`
      return `税率仅 ${best.tax.effectiveRate}%，已较低。保持合规申报即可。`
    }
    if (/社保|养老|退休/.test(query)) {
      return `以灵活就业身份参保，养老月缴约¥${Math.round(best.benefit.pensionMonthly)}、医保约¥${Math.round(best.benefit.medicalMonthly)}，合计约¥${Math.round(benefitTotal(best))}（均由个人全额承担）。达到法定退休年龄且累计缴满最低年限后按月领取，具体金额取决于退休当年社平工资、缴费指数与个人账户储存额，本版本尚未建模，请以社保经办核算为准。`
    }
    if (/风险|安全|危险|权益|保障/.test(query)) {
      if (scoreTier(best.rightsScore) === 'bad') return `权益评分${best.rightsScore}/100，保障缺口明显。建议：①工时控制在10h内②优先参加养老+医保③以商业意外险补充职业伤害缺口。`
      return `权益评分${best.rightsScore}/100，${scoreLevel(best.rightsScore)}。${best.keyInsights?.[0] || ''}`
    }
    if (/建议|怎么办|好吗/.test(query)) {
      const monthly = best.netMonthly
      const level = monthly > 8000 ? '高' : monthly > 5000 ? '中等' : '偏低'
      return `月净收入¥${monthly}属${level}水平。${best.keyInsights?.slice(0,2).join('') || '建议保持当前节奏。'}`
    }
    // fallback: summary
    return `「${best.name}」月净¥${best.netMonthly}/年净¥${best.netAnnual}。可以深入问：税务优化/社保规划/风险评估。`
  }

  function benefitTotal(s: ScenarioResult) {
    return s.benefit.items.filter(i => i.name === '养老保险' || i.name === '医疗保险').reduce((sum, i) => sum + i.monthly, 0)
  }

  async function sendOnline(question: string, context: string) {
    const sysPrompt = `你是"灵算Pro"的决策助手，面向灵活就业者（外卖骑手、网约车司机等）。根据用户当前测算数据给出具体可操作建议。硬性要求：不超过205字；只依据下列数据与用户问题作答；不得编造法律法规名称、文号、税率或政策文件；涉及法律或税务结论时必须提示以官方机构或专业人士意见为准。以下是用户数据（${new Date().toLocaleString('zh-CN')}）：\n${context}`

    const recentMsgs = messages.value.filter(m => !m.isStreaming).slice(-6).map(m => ({ role: m.role, content: m.content }))

    const abort = new AbortController()
    controller.value = abort
    isStreaming.value = true

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    try {
      const resp = await fetch(config.value.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.value.apiKey}` },
        body: JSON.stringify({
          model: config.value.model,
          messages: [{ role: 'system', content: sysPrompt }, ...recentMsgs, { role: 'user', content: question }],
          stream: true, temperature: 0.7, max_tokens: 500
        }),
        signal: abort.signal,
      })

      if (!resp.ok) {
        let msg = `API错误${resp.status}`
        try { const j = await resp.json(); msg = j.error?.message || msg } catch {}
        throw new Error(msg)
      }

      reader = resp.body?.getReader()
      if (!reader) throw new Error('无法读取流')

      const decoder = new TextDecoder()
      let aiContent = ''
      const aiId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      messages.value.push({ id: aiId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true, source: 'ai' })

      const consume = (raw: string) => {
        const t = raw.trim()
        if (!t.startsWith('data:')) return
        const d = t.slice(5).trim()
        if (d === '[DONE]' || !d) return
        try {
          const delta = JSON.parse(d)?.choices?.[0]?.delta?.content
          if (delta) {
            aiContent += delta
            const idx = messages.value.findIndex(m => m.id === aiId)
            if (idx >= 0) messages.value[idx].content = aiContent
          }
        } catch { /* 非 JSON 心跳行 */ }
      }

      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        lines.forEach(consume)
      }
      if (buf) consume(buf)
      saveHistory()
    } finally {
      reader?.cancel().catch(() => undefined)
      const idx = messages.value.findIndex(m => m.isStreaming)
      if (idx >= 0) {
        messages.value[idx].isStreaming = false
        if (!messages.value[idx].content) messages.value.splice(idx, 1)
      }
      isStreaming.value = false
      controller.value = null
    }
  }

  function newId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }

  function stopStreaming() {
    controller.value?.abort()
    controller.value = null
    isStreaming.value = false
    messages.value.forEach(m => { if (m.isStreaming) m.isStreaming = false })
  }

  async function sendMessage(question: string, scenarios: ScenarioResult[]) {
    if (isStreaming.value) return
    messages.value.push({ id: newId('u'), role: 'user', content: question, timestamp: Date.now() })
    const ctx = buildContext(scenarios)
    const useAI = config.value.enabled && !!config.value.apiKey && isOnline.value

    if (useAI) {
      try {
        await sendOnline(question, ctx)
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        messages.value.push({ id: newId('err'), role: 'assistant', content: `⚠️ AI连接失败(${err.message})，已切换规则引擎：\n\n` + ruleReply(question, scenarios), timestamp: Date.now() })
        saveHistory()
        return
      }
    }

    isStreaming.value = true
    await new Promise(r => setTimeout(r, 300 + Math.random() * 300))
    isStreaming.value = false
    messages.value.push({ id: newId('r'), role: 'assistant', content: ruleReply(question, scenarios), timestamp: Date.now() })
    saveHistory()
  }

  function clearHistory() {
    stopStreaming()
    messages.value = [{ id: 'welcome2', role: 'assistant', content: '历史已清空。可以继续提问。', timestamp: Date.now() }]
    saveHistory()
  }

  function updateConfig(c: Partial<ApiConfig>) { Object.assign(config.value, c); saveConfig() }

  return { config, messages, isStreaming, isOnline, showSettings, sendMessage, stopStreaming, clearHistory, updateConfig }
}
