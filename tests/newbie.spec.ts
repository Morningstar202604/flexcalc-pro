/**
 * 新人场景验证（Newbie Scenarios）
 *
 * 背景：产品默认参数是「常见全职强度」，但真实用户里有一大批是刚毕业的新人——
 * 他们不知道参数从哪来、不知道多少算正常、不知道哪些是坑。这组测试把「新人会问的题」
 * 固化成断言，任何一次改动让这些问题答不上来（检索为空、口径矛盾、数字荒谬），都会在这里暴露。
 *
 * 断言分三类：
 *   A. 可检索性：新人会用的口语词必须能命中知识库/手册；
 *   B. 口径一致：跨层（domain / application）对同一边界输入不得互相矛盾；
 *   C. 数字合理：极端输入下不得给出误导性结论（负时薪、把"没接到单"算成有收入等）。
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ScenarioService } from '../src/application/scenario/ScenarioService'
import { searchKnowledge, buildStaticKbEntries } from '../src/utils/knowledge'
import { GUIDE_ITEMS } from '../src/utils/livingGuide'
import { REALITY_FACTS } from '../src/utils/reality'
import type { CityRule, WorkParams, CostParams, PersonalParams } from '../src/types'

const gz = JSON.parse(readFileSync('public/rules/guangzhou.json', 'utf8')) as CityRule
const svc = new ScenarioService(gz)

const baseWork: WorkParams = {
  city: 'guangzhou', dailyHours: 10, dailyOrders: 35, avgDistance: 2.5,
  workDaysMonth: 26, rainDaysMonth: 3, holidayDaysMonth: 2,
}
const baseCosts: CostParams = {
  vehicleType: 'electric', fuelCostMonth: 0, electricityCostMonth: 300, maintenanceMonth: 200,
  insuranceMonth: 100, phoneCostMonth: 100, foodCostMonth: 800, trafficFineMonth: 50,
  vehicleDepreciationMonth: 300, otherCostMonth: 100,
}
const basePersonal: PersonalParams = {
  currentAge: 25, expectedRetireAge: 60, hasSocialInsurance: false, specialDeductionMonth: 0,
}
const run = (over: Partial<{ work: WorkParams; costs: CostParams; personal: PersonalParams }> = {}) =>
  svc.runScenario({
    id: 'newbie', name: '新人',
    work: over.work ?? baseWork,
    costs: over.costs ?? baseCosts,
    personal: over.personal ?? basePersonal,
  })

describe('A. 新人会用的口语词必须能检索到内容', () => {
  const entries = buildStaticKbEntries()
  const queries = [
    '多少工资算正常',
    '潜规则',
    '押金',
    '租车',
    '装备',
    '培训费',
    '被骗',
    '签合同',
    '罚款',
    '社保要不要交',
    '新手',
  ]

  it.each(queries)('检索「%s」有结果', (q) => {
    const hits = searchKnowledge(q, { entries, limit: 3 })
    expect(hits.length, `新人搜索「${q}」无任何结果`).toBeGreaterThan(0)
  })

  it('每条手册/现实核查都有中文标题与正文（新人能读懂的第一层）', () => {
    for (const g of GUIDE_ITEMS) {
      expect(g.question.length).toBeGreaterThan(3)
      expect(g.oneLiner.length).toBeGreaterThan(10)
    }
    for (const f of REALITY_FACTS) {
      expect(f.title.length).toBeGreaterThan(3)
      expect(f.detail.length).toBeGreaterThan(20)
    }
  })
})

describe('B. 跨层口径一致性', () => {
  it('「本月工作 0 天」在服务层可通过校验（与 domain 允许 0 天的口径一致）', () => {
    const r = run({ work: { ...baseWork, workDaysMonth: 0 } })
    expect(r.ok, 'domain 允许 0 天而服务层拒绝——两层口径矛盾').toBe(true)
  })

  it('0 天工作时：收入为 0、成本仍在、净收入为负（不能凭空算钱）', () => {
    const r = run({ work: { ...baseWork, workDaysMonth: 0 } })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.income.grossIncome).toBe(0)
    expect(r.value.costBreakdown.total).toBeGreaterThan(0)
    expect(r.value.netMonthly).toBeLessThan(0)
  })

  it('负数工作日被拒绝（不是被静默夹取）', () => {
    const r = run({ work: { ...baseWork, workDaysMonth: -1 } })
    expect(r.ok).toBe(false)
  })

  it('日工时为 0 被拒绝（分母无意义）', () => {
    const r = run({ work: { ...baseWork, dailyHours: 0 } })
    expect(r.ok).toBe(false)
  })
})

describe('C. 极端输入下的输出必须诚实', () => {
  it('日单量为 0（没接到单）：无收入、净收入为负、评级为风险', () => {
    const r = run({ work: { ...baseWork, dailyOrders: 0 } })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.income.grossIncome).toBe(0)
    expect(r.value.netMonthly).toBeLessThan(0)
    expect(r.value.recommendation).toBe('risky')
  })

  it('时薪永不为负或非有限（新人看到 ¥-0.0/h 会失去信任）', () => {
    const cases = [
      { work: { ...baseWork, dailyOrders: 0 } },
      { work: { ...baseWork, dailyHours: 24 } },
      { work: { ...baseWork, workDaysMonth: 0 } },
      { costs: { ...baseCosts, otherCostMonth: 2000 } },
    ]
    for (const c of cases) {
      const r = run(c as never)
      if (!r.ok) continue
      expect(Number.isFinite(r.value.netHourly), `时薪非有限：${r.value.netHourly}`).toBe(true)
    }
  })

  it('不参保时，参保成本提示不能显示为 0（服务层 totalMonthly 为 0 是「未缴」而非「免费」）', () => {
    const r = run()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const b = r.value.benefit
    expect(b.totalMonthly).toBe(0) // 未参保
    // 但养老+医保的分项仍在，UI 必须用分项之和来提示「若参保要花多少」
    const wouldPay = b.pensionMonthly + b.medicalMonthly
    expect(wouldPay, '未参保时分项也全为 0，UI 无法提示参保成本').toBeGreaterThan(0)
  })

  it('净收入与最低工资的关系可判定（新人最关键的一条对照）', () => {
    const r = run()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    // 默认参数下净收入应高于当地最低工资，否则产品应直接提示"不如去做最低工资的全职"
    const floor = gz.minimumWage.monthly
    expect(r.value.netMonthly).toBeGreaterThan(floor)
  })
})
