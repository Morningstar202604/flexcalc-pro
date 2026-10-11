import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ScenarioEngine } from '../src/engine/ScenarioEngine'
import { IncomeEngine } from '../src/engine/IncomeEngine'
import { TaxEngine } from '../src/engine/TaxEngine'
import { BenefitEngine } from '../src/engine/BenefitEngine'
import type { CityRule, WorkParams, CostParams, PersonalParams } from '../src/types'

const rule = JSON.parse(readFileSync('public/rules/guangzhou.json', 'utf8')) as CityRule

const work: WorkParams = {
  city: 'guangzhou', dailyHours: 10, dailyOrders: 35,
  avgDistance: 2.5, workDaysMonth: 26, rainDaysMonth: 3, holidayDaysMonth: 2,
}
const costs: CostParams = {
  vehicleType: 'electric', fuelCostMonth: 0, electricityCostMonth: 300, maintenanceMonth: 200,
  insuranceMonth: 100, phoneCostMonth: 100, foodCostMonth: 800, trafficFineMonth: 50,
  vehicleDepreciationMonth: 300, otherCostMonth: 100,
}
const personal: PersonalParams = {
  currentAge: 25, expectedRetireAge: 60, hasSocialInsurance: false, specialDeductionMonth: 0,
}

/** 手算基准：35单×5.0 + 35单×2.5km×1.2 = 175+105=280/日；×26天=7280 */
describe('IncomeEngine 手算基准', () => {
  const inc = new IncomeEngine(rule.income).calcIncome(work)

  it('基础计件与距离费逐项可复算', () => {
    expect(inc.basePay).toBeCloseTo(35 * 5.0 * 26, 2)          // 4550
    expect(inc.distancePay).toBeCloseTo(35 * 2.5 * 1.2 * 26, 2) // 2730
  })

  it('分项之和恒等于毛收入（防止事后改写 grossIncome 造成图表与表内不一致）', () => {
    const sum = inc.basePay + inc.distancePay + inc.subsidyPay + inc.bonusPay
    expect(sum).toBeCloseTo(inc.grossIncome, 2)
  })

  it('成本合计为九项之和', () => {
    expect(new IncomeEngine(rule.income).calcCosts(costs).total).toBeCloseTo(1950, 2)
  })
})

/** 应税累计 = m×(毛收入×80% − 5000)，本例12个月内不跨36000档，全年按3% */
describe('TaxEngine 累计预扣法', () => {
  const gross = new IncomeEngine(rule.income).calcIncome(work).grossIncome
  const taxableMonthly = gross * 0.8 - 5000
  const expectedAnnual = Math.round(taxableMonthly * 12 * 0.03 * 100) / 100

  it('全年税额等于手算值', () => {
    const t = new TaxEngine(rule.tax).calcLabor(new Array(12).fill(gross), 0)
    expect(t.annualTax).toBeCloseTo(expectedAnnual, 2)
    expect(t.annualTax).toBeGreaterThan(0)
  })

  it('未超起征点时不应出现负税', () => {
    const t = new TaxEngine(rule.tax).calcLabor(new Array(12).fill(3000), 0)
    expect(t.annualTax).toBe(0)
    t.monthlyTax.forEach(v => expect(v).toBeGreaterThanOrEqual(0))
  })

  it('专项附加扣除只减不增，扣除越多税额越低', () => {
    const t0 = new TaxEngine(rule.tax).calcLabor(new Array(12).fill(gross), 0)
    const t2 = new TaxEngine(rule.tax).calcLabor(new Array(12).fill(gross), 2000)
    expect(t2.annualTax).toBeLessThan(t0.annualTax)
  })

  it('高档税率正确进档（月收入提高到跨档）', () => {
    const high = 30000
    const t = new TaxEngine(rule.tax).calcLabor(new Array(12).fill(high), 0)
    // 累计应税 = 30000*0.8*12 - 5000*12 = 228000-60000 = 168000 → 20%档
    expect(t.annualTax).toBeGreaterThan(0)
    expect(t.effectiveRate).toBeGreaterThan(5)
  })
})

describe('BenefitEngine 灵活就业自缴口径', () => {
  const gross = new IncomeEngine(rule.income).calcIncome(work).grossIncome
  const eng = new BenefitEngine(rule.benefit)

  it('养老=基数×20%，医保=基数×8%，均按收入夹在上下限之间', () => {
    const b = eng.calcMonthly(gross, true)
    expect(b.pensionMonthly).toBeCloseTo(gross * 0.2, 2)
    expect(b.medicalMonthly).toBeCloseTo(gross * 0.08, 2)
    expect(b.totalMonthly).toBeCloseTo(b.pensionMonthly + b.medicalMonthly, 2)
  })

  it('低收入按各地下限保底，不随收入线性下降', () => {
    const b = eng.calcMonthly(2000, true)
    expect(b.pensionMonthly).toBeCloseTo(rule.benefit.pension.baseMin * 0.2, 2)
    expect(b.medicalMonthly).toBeCloseTo(rule.benefit.medical.baseMin * 0.08, 2)
  })

  it('未参保时个人支出于0，但待遇项目仍标记为缺口', () => {
    const b = eng.calcMonthly(gross, false)
    expect(b.totalMonthly).toBe(0)
    expect(b.items.filter(i => !i.covered).length).toBeGreaterThan(0)
  })

  it('职业伤害保障由平台缴费，不构成个人支出', () => {
    const b = eng.calcMonthly(gross, true)
    const inj = b.items.find(i => i.name === '职业伤害保障')
    expect(inj?.monthly).toBe(0)
    expect(inj?.covered).toBe(true)
  })
})

describe('ScenarioEngine 结构不变式', () => {
  const eng = new ScenarioEngine(rule)
  const plain = eng.runScenario('current', '当前方案', work, costs, personal)
  const insured = eng.runScenario('ins', '已参保', work, costs, { ...personal, hasSocialInsurance: true })

  it('净收入恒等式闭合', () => {
    const expectNet = plain.income.grossIncome - plain.costBreakdown.total
      - plain.tax.annualTax / 12 - plain.benefit.totalMonthly
    expect(plain.netMonthly).toBeCloseTo(expectNet, 1)
  })

  it('参保降低净收入但提高权益评分', () => {
    expect(insured.netMonthly).toBeLessThan(plain.netMonthly)
    expect(insured.rightsScore).toBeGreaterThan(plain.rightsScore)
  })

  /** 产品伦理不变式：保障缺失的方案不能被标成"推荐"，否则工具等于建议骑手不参保 */
  it('未参保方案的评级不得高于可行', () => {
    expect(plain.recommendation).not.toBe('recommended')
    expect(plain.rightsFlags.join()).toContain('社保')
  })

  it('有效时薪不得低于当地非全日制小时最低工资', () => {
    expect(plain.netHourly).toBeGreaterThan(rule.minimumWage.nonFullTimeHourly)
  })

  it('多接5单提高净收入，多跑2小时不减少净收入', () => {
    const more = eng.runScenario('m', '多接5单', { ...work, dailyOrders: work.dailyOrders + 5 }, costs, personal)
    expect(more.netMonthly).toBeGreaterThan(plain.netMonthly)
    const longer = eng.runScenario('l', '多跑2小时', { ...work, dailyHours: 12 }, costs, personal)
    expect(longer.netMonthly).toBeGreaterThanOrEqual(plain.netMonthly)
  })

  it('评分始终落在0-100', () => {
    const extreme = eng.runScenario('x', '极端', { ...work, dailyHours: 14, workDaysMonth: 31 }, costs, personal)
    expect(extreme.rightsScore).toBeGreaterThanOrEqual(0)
    expect(extreme.rightsScore).toBeLessThanOrEqual(100)
  })

  it('compare 选出净收入最高的方案', () => {
    const cmp = eng.compare([insured, plain, eng.runScenario('m', '多接5单', { ...work, dailyOrders: 40 }, costs, personal)])
    const max = Math.max(insured.netAnnual, plain.netAnnual, 40)
    expect(cmp.best!.netAnnual).toBeGreaterThanOrEqual(Math.min(max, plain.netAnnual))
    expect(cmp.ranking[0].netAnnual).toBeGreaterThanOrEqual(cmp.ranking[1].netAnnual)
  })
})

/** 数据可信度是这个产品的主张，必须有测试守住，否则会被慢慢改回裸数字 */
describe('规则文件溯源约束', () => {
  for (const city of ['guangzhou', 'shenzhen', 'dongguan']) {
    const r = JSON.parse(readFileSync(`public/rules/${city}.json`, 'utf8')) as CityRule

    it(`${city}：每个来源都有文号或链接、核对日期与置信度`, () => {
      expect(Object.keys(r.sources).length).toBeGreaterThanOrEqual(6)
      for (const [key, s] of Object.entries(r.sources)) {
        expect(s.retrievedAt, key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(['official', 'derived', 'unverified'], key).toContain(s.confidence)
        if (s.confidence === 'official') {
          expect(s.docNo || s.url, `${key} 标为 official 必须有文号或原文链接`).toBeTruthy()
        }
      }
    })

    it(`${city}：verified 标志与实际置信度一致，不允许虚假标注`, () => {
      const allOfficial = Object.values(r.sources).every(s => s.confidence === 'official')
      if (!allOfficial) expect(r.verified, `${city} 存在非 official 来源却标 verified=true`).toBe(false)
    })

    it(`${city}：平台计价规则必须标为 unverified（无跨平台权威来源）`, () => {
      expect(r.sources.income.confidence).toBe('unverified')
    })

    it(`${city}：社保与最低工资数值区间合理`, () => {
      expect(r.benefit.pension.baseMin).toBeGreaterThan(0)
      expect(r.benefit.pension.baseMax).toBeGreaterThan(r.benefit.pension.baseMin)
      expect(r.benefit.pension.rate).toBeCloseTo(0.2, 4)
      expect(r.minimumWage.nonFullTimeHourly).toBeGreaterThan(0)
      // 小时最低工资不应高于月工资折算的日均水平，否则分档填错
      expect(r.minimumWage.nonFullTimeHourly).toBeLessThan(r.minimumWage.monthly / 21.75 * 2)
    })

    // 广东分档：广深为一类25.4元/小时（官方），东莞为二类，数值未经原文核实，不锁具体值
    if (r.minimumWage.monthly >= 2600) {
      it(`${city}：一类地区小时最低工资应为25.4元`, () => {
        expect(r.minimumWage.nonFullTimeHourly).toBeCloseTo(25.4, 1)
      })
    }
  }
})
