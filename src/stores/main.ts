import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { CityRule, WorkParams, CostParams, PersonalParams, ScenarioResult, CompensationResult } from '../types'
import { ScenarioEngine } from '../engine/ScenarioEngine'

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
}

/** 只恢复结构已知的字段，避免旧版本残留数据把 NaN/未知键灌进计算 */
function hydrate<T extends object>(saved: unknown, fallback: T): T {
  if (!saved || typeof saved !== 'object') return { ...fallback }
  const out = { ...fallback } as Record<string, unknown>
  const known = fallback as Record<string, unknown>
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    if (k in known && (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string')) {
      out[k] = v
    }
  }
  return out as T
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
  const saved = loadParams()

  const work = ref<WorkParams>(hydrate(saved?.work, DEFAULT_WORK))
  const costs = ref<CostParams>(hydrate(saved?.costs, DEFAULT_COSTS))
  const personal = ref<PersonalParams>(hydrate(saved?.personal, DEFAULT_PERSONAL))
  paramsRestored.value = !!saved

  /** 自定义方案是嵌套结构，数组不能走 hydrate 的键值白名单，需单独校验必要字段 */
  const customPlans = ref<CustomPlan[]>(
    Array.isArray(saved?.customPlans)
      ? (saved!.customPlans as unknown[]).filter((p): p is CustomPlan => {
          const o = p as Record<string, unknown> | null
          return !!o && typeof o.id === 'string' && typeof o.name === 'string'
            && !!o.work && typeof o.work === 'object' && !!o.costs && typeof o.costs === 'object'
        }).map(p => ({ id: p.id, name: p.name, work: hydrate(p.work, DEFAULT_WORK), costs: hydrate(p.costs, DEFAULT_COSTS) }))
      : []
  )

  /** 补偿计算面板的最近一次结果，文书生成器据此填充真实金额 */
  const compensation = ref<CompensationResult | null>(null)
  function setCompensation(r: CompensationResult | null) { compensation.value = r }

  const engine = computed(() => rule.value ? new ScenarioEngine(rule.value) : null)

  async function loadRule(city: string) {
    const seq = ++loadSeq
    loading.value = true
    loadError.value = null
    try {
      const res = await fetch(`/rules/${city}.json`)
      const ctype = res.headers.get('content-type') || ''
      if (!res.ok) throw new Error(`规则文件加载失败（HTTP ${res.status}）`)
      // 静态托管的 SPA 回退会用 200 + HTML 应答缺失文件，仅判断 res.ok 拦不住
      if (!ctype.includes('json')) throw new Error(`未找到 ${city} 的规则文件`)
      const data = await res.json() as CityRule
      if (seq !== loadSeq) return
      rule.value = data
      // 医保档次是各城规则文件自己的条目，切换城市后旧档次 id 在新城中不存在
      const tierId = personal.value.medicalTierId
      if (tierId && !data.benefit.medicalTiers?.some(t => t.id === tierId)) {
        personal.value.medicalTierId = undefined
      }
    } catch (err) {
      if (seq !== loadSeq) return
      rule.value = null
      loadError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  function setCity(city: string) {
    work.value.city = city
    customPlans.value = []
    return loadRule(city)
  }

  /** 参数是用户逐项调出来的，刷新即丢会让"方案对比"无法复现，故落本地存储 */
  watch([work, costs, personal, customPlans], () => {
    try {
      localStorage.setItem(PARAMS_KEY, JSON.stringify({
        work: work.value, costs: costs.value, personal: personal.value, customPlans: customPlans.value,
      }))
    } catch { /* 隐私模式或配额耗尽时静默降级为不持久化 */ }
  }, { deep: true })

  function resetParams() {
    work.value = { ...DEFAULT_WORK }
    costs.value = { ...DEFAULT_COSTS }
    personal.value = { ...DEFAULT_PERSONAL }
    customPlans.value = []
    paramsRestored.value = false
    return loadRule(work.value.city)
  }

  const scenarios = computed<ScenarioResult[]>(() => {
    const eng = engine.value
    if (!eng) return []
    const list = [
      eng.runScenario('current', '当前方案', work.value, costs.value, personal.value),
      eng.runScenario('more_hours', '多跑2小时', { ...work.value, dailyHours: Math.min(work.value.dailyHours + 2, 14) }, costs.value, personal.value),
      eng.runScenario('more_orders', '多接5单', { ...work.value, dailyOrders: work.value.dailyOrders + 5 }, costs.value, personal.value),
    ]
    if (!personal.value.hasSocialInsurance) {
      list.push(eng.runScenario('with_insurance', '缴齐社保', work.value, costs.value, { ...personal.value, hasSocialInsurance: true }))
    }
    return [...list, ...customPlans.value.map(p => eng.runScenario(p.id, p.name, p.work, p.costs, personal.value))]
  })

  function addScenario(name: string, w: WorkParams, c: CostParams) {
    customPlans.value.push({ id: `custom_${Date.now()}`, name, work: { ...w }, costs: { ...c } })
  }

  function removeScenario(id: string) {
    customPlans.value = customPlans.value.filter(p => p.id !== id)
  }

  const comparison = computed(() => engine.value ? engine.value.compare(scenarios.value) : null)

  return { rule, loading, loadError, paramsRestored, work, costs, personal, customPlans, compensation, setCompensation, scenarios, comparison, loadRule, setCity, resetParams, addScenario, removeScenario }
})
