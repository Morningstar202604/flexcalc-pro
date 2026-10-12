import type { CityRule, WorkParams, CostParams, PersonalParams, ScenarioResult, ComparisonResult } from '../types'
import { IncomeEngine } from './IncomeEngine'
import { TaxEngine } from './TaxEngine'
import { BenefitEngine } from './BenefitEngine'

export class ScenarioEngine {
  constructor(private rule: CityRule) {}

  runScenario(id: string, name: string, work: WorkParams, costs: CostParams, personal: PersonalParams): ScenarioResult {
    const incEng = new IncomeEngine(this.rule.income)
    const income = incEng.calcIncome(work)
    const costBrk = incEng.calcCosts(costs)

    const monthlyGross = income.grossIncome
    const tax = new TaxEngine(this.rule.tax).calcLabor(new Array(12).fill(monthlyGross), personal.specialDeductionMonth)
    const benefit = new BenefitEngine(this.rule.benefit).calcMonthly(monthlyGross, personal.hasSocialInsurance, personal.medicalTierId)

    const monthlyTax = tax.annualTax / 12
    const insuranceCost = benefit.totalMonthly
    const netMonthly = round(monthlyGross - costBrk.total - monthlyTax - insuranceCost)
    const netAnnual = round(monthlyGross * 12 - costBrk.total * 12 - tax.annualTax - insuranceCost * 12)
    const netHourly = round(netMonthly / (work.dailyHours * work.workDaysMonth))

    const { score: rightsScore, flags: rightsFlags } = this.calcRightsScore(work, costBrk.total, personal, benefit)
    // 保障缺失时封顶为 viable：否则净收入一高就出现"推荐你不参保"的反向激励
    const incomeTier = netMonthly > 7000 ? 'recommended' : netMonthly > 4500 ? 'viable' : 'risky'
    const recommendation = !personal.hasSocialInsurance && incomeTier === 'recommended' ? 'viable' : incomeTier
    const keyInsights = this.generateInsights(work, costs, tax, netMonthly, benefit)

    return { id, name, work, costs, income, costBreakdown: costBrk, tax, benefit, netMonthly, netAnnual, netHourly, rightsScore, rightsFlags, recommendation, keyInsights }
  }

  compare(scenarios: ScenarioResult[]): ComparisonResult {
    const ranking = scenarios
      .map(s => ({ id: s.id, netAnnual: s.netAnnual, label: s.name }))
      .sort((a, b) => b.netAnnual - a.netAnnual)

    const best = scenarios.reduce((b, s) => s.netAnnual > (b?.netAnnual || -Infinity) ? s : b, null as ScenarioResult | null)

    const summary = best
      ? `「${best.name}」方案年净收入 ¥${best.netAnnual.toLocaleString()}，排名第一。比第二名多 ¥${((best.netAnnual - (ranking[1]?.netAnnual || best.netAnnual))).toLocaleString()}/年。权益评分 ${best.rightsScore}/100。`
      : '请添加至少一个方案进行对比。'

    return { scenarios, best, ranking, summary }
  }

  private calcRightsScore(work: WorkParams, costTotal: number, personal: PersonalParams, benefit: ReturnType<BenefitEngine['calcMonthly']>): { score: number; flags: string[] } {
    let score = 100
    const flags: string[] = []

    if (!personal.hasSocialInsurance) {
      flags.push('未缴社保：发生重大疾病/工伤时全额自付，风险极高')
    }

    const uncoveredHighRisk = benefit.items.filter(i => !i.covered && i.risk === 'high')
    if (uncoveredHighRisk.length > 0) {
      score -= uncoveredHighRisk.length * 10
      flags.push(`缺少保障：${uncoveredHighRisk.map(i => i.name).join('、')}`)
    }

    if (work.dailyHours > 11) {
      score -= 15
      flags.push('日均超11小时：连续高强度作业，健康与事故风险显著上升')
    } else if (work.dailyHours > 8) {
      score -= 5
      flags.push('日均超8小时：超出部分在劳动关系下应付1.5倍报酬')
    }

    if (work.workDaysMonth >= 26) {
      score -= 10
      flags.push('月工作26天+：远超法定21.75天，每月至少应享4天休息')
    } else if (work.workDaysMonth >= 22) {
      score -= 3
      flags.push('月工作22天+：接近法定上限，注意休息权')
    }

    if (costTotal > 3000) {
      score -= 5
      flags.push('运营成本高：高固定支出压缩净收入，抗风险能力低')
    }

    score -= 5
    flags.push('单一收入来源：平台政策变动即影响全部收入，无兜底')

    return { score: Math.max(0, score), flags }
  }

  private generateInsights(work: WorkParams, costs: CostParams, tax: { effectiveRate: number; annualTax: number }, netMonthly: number, benefit: ReturnType<BenefitEngine['calcMonthly']>): string[] {
    const insights: string[] = []
    const dailyNet = netMonthly / work.workDaysMonth
    if (netMonthly > 8000) insights.push(`日均净收入 ¥${dailyNet.toFixed(0)}，属于灵活就业高收入群体`)
    if (work.dailyHours > 10) insights.push('日工时超10小时，存在健康风险和效率递减，建议控制在8-10小时')
    if (tax.effectiveRate > 5) insights.push(`个税负担较重（${tax.effectiveRate}%），可咨询税务师核实是否符合其他计税方式`)
    if (costs.fuelCostMonth > 2000) insights.push('燃油成本高，若改用电动车可每月节省约800-1200元')
    if (benefit.totalMonthly > 0) {
      insights.push(`已参保：每月自缴养老+医保 ¥${benefit.totalMonthly.toLocaleString()}，净收入相应下降`)
    } else {
      insights.push(`若以灵活就业参保（养老+医保），每月需自缴 ¥${(benefit.pensionMonthly + benefit.medicalMonthly).toLocaleString()}，净收入相应下降`)
    }
    return insights
  }
}

function round(n: number) { return Math.round(n * 100) / 100 }
