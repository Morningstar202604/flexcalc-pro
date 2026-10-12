import type { BenefitRule, BenefitBreakdown, RetirementRule } from '../types'

export class BenefitEngine {
  constructor(private rule: BenefitRule, private retirement?: RetirementRule) {}

  /**
   * 灵活就业人员可自愿参加的只有养老与医保，且需个人全额承担（无单位分担）；
   * 职业伤害保障由平台按单缴费，不构成个人支出。
   * medicalTierId 指定医保档次（东莞等分档城市）；未指定或该城无分档时用默认费率。
   */
  calcMonthly(income: number, enrolled: boolean, medicalTierId?: string): BenefitBreakdown {
    const pensionBase = Math.min(Math.max(income, this.rule.pension.baseMin), this.rule.pension.baseMax)
    const medicalBase = Math.min(Math.max(income, this.rule.medical.baseMin), this.rule.medical.baseMax)
    const pensionMonthly = round(pensionBase * this.rule.pension.rate)
    const tier = this.rule.medicalTiers?.find(t => t.id === medicalTierId)
    const medicalMonthly = round(medicalBase * (tier?.rate ?? this.rule.medical.rate))

    const items: BenefitBreakdown['items'] = [
      { name: '养老保险', monthly: pensionMonthly, covered: enrolled, risk: 'high' },
      { name: '医疗保险', monthly: medicalMonthly, covered: enrolled, risk: 'high' },
      { name: '职业伤害保障', monthly: 0, covered: true, risk: 'high' },
    ]

    return {
      pensionMonthly,
      medicalMonthly,
      totalMonthly: enrolled ? round(pensionMonthly + medicalMonthly) : 0,
      items,
    }
  }

  /**
   * 计发基数与缴费指数都是外部输入，缺省时回落到广州口径 9493 / 0.6；
   * 调用方应显式传本城 rule.retirement，避免跨城串值。
   */
  projectRetirement(
    currentAge: number,
    retireAge: number,
    monthlyContribution: number,
    yearsContributed: number,
    annualReturn = 0.05,
    paymentIndex = this.retirement?.paymentIndex ?? 0.6,
  ) {
    const benefitBase = this.retirement?.benefitBaseMonthly ?? 9493
    const months = (retireAge - currentAge) * 12
    let balance = 0
    for (let i = 0; i < months; i++) {
      balance = balance * (1 + annualReturn / 12) + monthlyContribution
    }
    const personalAccount = round(balance)
    // 国发〔2005〕38号：基础养老金 = 计发基数 ×(1+平均缴费指数)÷2 × 缴费年限 × 1%
    // 缴费指数低于 0.6 时按 0.6 计（低于该档需按 0.6/指数 的折扣系数调整，此处取下限口径）
    const idx = Math.max(0.6, paymentIndex)
    const basePension = round(benefitBase * (1 + idx) / 2 * yearsContributed * 0.01)
    const personalPension = personalAccount > 0 ? round(personalAccount / 139) : 0
    return { personalAccount, basePension, personalPension, totalPension: round(basePension + personalPension), months }
  }
}

function round(n: number) { return Math.round(n * 100) / 100 }
