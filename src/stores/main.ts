import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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

export const useMainStore = defineStore('main', () => {
  const rule = ref<CityRule | null>(null)
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  let loadSeq = 0

  const work = ref<WorkParams>({
    city: 'guangzhou', dailyHours: 10, dailyOrders: 35,
    avgDistance: 2.5, workDaysMonth: 26, rainDaysMonth: 3, holidayDaysMonth: 2,
  })

  const costs = ref<CostParams>({
    vehicleType: 'electric', fuelCostMonth: 0,
    electricityCostMonth: 300, maintenanceMonth: 200,
    insuranceMonth: 100, phoneCostMonth: 100, foodCostMonth: 800,
    trafficFineMonth: 50, vehicleDepreciationMonth: 300, otherCostMonth: 100,
  })

  const personal = ref<PersonalParams>({
    currentAge: 25, expectedRetireAge: 60, hasSocialInsurance: false,
    specialDeductionMonth: 0,
  })

  const customPlans = ref<CustomPlan[]>([])

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
    } catch (err) {
      if (seq !== loadSeq) return
      rule.value = null
      loadError.value = err instanceof Error ? err.message : String(err)
    } finally {
      if (seq === loadSeq) loading.value = false
    }
  }

  async function setCity(city: string) {
    work.value.city = city
    customPlans.value = []
    await loadRule(city)
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

  return { rule, loading, loadError, work, costs, personal, customPlans, compensation, setCompensation, scenarios, comparison, loadRule, setCity, addScenario, removeScenario }
})
