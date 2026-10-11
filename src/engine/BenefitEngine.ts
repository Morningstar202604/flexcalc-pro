import type { BenefitRule, BenefitBreakdown } from '../types'

export class BenefitEngine {
  constructor(private rule: BenefitRule) {}

  /**
   * 灵活就业人员可自愿参加的只有养老与医保，且需个人全额承担（无单位分担）；
   * 职业伤害保障由平台按单缴费，不构成个人支出。
   */
  calcMonthly(income: number, enrolled: boolean): BenefitBreakdown {
    const pensionBase = Math.min(Math.max(income, this.rule.pension.baseMin), this.rule.pension.baseMax)
    const pensionMonthly = round(pensionBase * this.rule.pension.rate)
    const medicalMonthly = round(this.rule.medical.baseFixed * this.rule.medical.rate)

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

  projectRetirement(currentAge: number, retireAge: number, monthlyContribution: number, yearsContributed: number, annualReturn = 0.05) {
    const months = (retireAge - currentAge) * 12
    let balance = 0
    for (let i = 0; i < months; i++) {
      balance = balance * (1 + annualReturn / 12) + monthlyContribution
    }
    const personalAccount = round(balance)
    const basePension = 800 + yearsContributed * 15
    const personalPension = personalAccount > 0 ? round(personalAccount / 139) : 0
    return { personalAccount, basePension, personalPension, totalPension: round(basePension + personalPension), months }
  }
}

function round(n: number) { return Math.round(n * 100) / 100 }
