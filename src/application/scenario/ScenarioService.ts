/**
 * ScenarioService - 场景编排
 *
 * 职责：把四个领域引擎组合成一个完整方案（收入 → 税 → 社保 → 净收入 → 权益）。
 * 本层不含任何计算公式，只做编排与不变式校验。
 *
 * 依赖注入：构造函数接收引擎接口而非具体实现，测试可替换为 Mock。
 */

import type {
  CityRule,
  WorkParams,
  CostParams,
  PersonalParams,
  ScenarioResult,
  ComparisonResult,
} from '../../types'
import { IncomeEngine } from '../../engine/IncomeEngine'
import { TaxEngine, type TaxEngineConfig } from '../../engine/TaxEngine'
import { BenefitEngine } from '../../engine/BenefitEngine'
import { round2 as round } from '../../utils/number'
import { ok, err, tryCatch } from '../../domain/shared/result'
import type { Result } from '../../domain/shared/result'
import { AppError } from '../errors'

/** 场景输入 */
export interface ScenarioInput {
  id: string
  name: string
  work: WorkParams
  costs: CostParams
  personal: PersonalParams
}

/** 对比输入 */
export interface ComparisonInput {
  scenarios: ScenarioInput[]
}

/** 除数保护：任一因子为 0 或非有限时回落到 1，避免 Infinity */
function safeDivisor(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 1
}

export class ScenarioService {
  private readonly incomeEngine: IncomeEngine
  private readonly taxEngine: TaxEngine
  private readonly benefitEngine: BenefitEngine

  /**
   * @param rule 城市规则；或直接注入四个引擎（测试用）
   */
  constructor(
    ruleOrEngines: CityRule | {
      incomeEngine: IncomeEngine
      taxEngine: TaxEngine
      benefitEngine: BenefitEngine
    },
  ) {
    if ('incomeEngine' in ruleOrEngines) {
      this.incomeEngine = ruleOrEngines.incomeEngine
      this.taxEngine = ruleOrEngines.taxEngine
      this.benefitEngine = ruleOrEngines.benefitEngine
    } else {
      const rule = ruleOrEngines
      if (!rule) throw AppError.ruleInvalid('unknown', 'CityRule is required')
      this.incomeEngine = new IncomeEngine(rule.income)
      const taxConfig: TaxEngineConfig = {
        laborRemuneration: rule.tax.laborRemuneration,
        soleProprietorship: rule.soleProprietorship,
      }
      this.taxEngine = new TaxEngine(taxConfig)
      this.benefitEngine = new BenefitEngine(rule.benefit, rule.retirement)
    }
  }

  /** 运行单个场景 */
  runScenario(input: ScenarioInput): Result<ScenarioResult, AppError> {
    const validationErr = this.validateInput(input)
    if (validationErr) return err(validationErr)

    return tryCatch(
      () => {
        const { id, name, work, costs, personal } = input

        const income = this.incomeEngine.calcIncome(work)
        const costBreakdown = this.incomeEngine.calcCosts(costs)

        const monthlyGross = income.grossIncome
        const tax = this.taxEngine.calcLabor(
          new Array(12).fill(monthlyGross),
          personal.specialDeductionMonth,
        )
        const benefit = this.benefitEngine.calcMonthly(
          monthlyGross,
          personal.hasSocialInsurance,
          personal.medicalTierId,
          { pensionBase: personal.pensionBase, medicalBase: personal.medicalBase },
        )

        const monthlyTax = tax.annualTax / 12
        const netMonthly = round(monthlyGross - costBreakdown.total - monthlyTax - benefit.totalMonthly)
        // 年度必须等于月度的 12 倍，否则 UI 同屏展示的月净与年净会对不上
        const netAnnual = round(netMonthly * 12)
        const netHourly = round(netMonthly / (safeDivisor(work.dailyHours) * safeDivisor(work.workDaysMonth)))

        // 权益评分与推荐等级
        let score = 100
        const flags: string[] = []
        if (!personal.hasSocialInsurance) {
          flags.push('未缴社保：发生重大疾病时医保与养老待遇全额自付，风险极高')
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
        if (costBreakdown.total > 3000) {
          score -= 5
          flags.push('运营成本高：高固定支出压缩净收入，抗风险能力低')
        }
        score -= 5
        flags.push('单一收入来源：平台政策变动即影响全部收入，无兜底')
        const rightsScore = Math.max(0, score)

        // 保障缺失时封顶为 viable：否则净收入一高就出现"推荐你不参保"的反向激励
        const incomeTier = netMonthly > 7000 ? 'recommended' : netMonthly > 4500 ? 'viable' : 'risky'
        const recommendation =
          !personal.hasSocialInsurance && incomeTier === 'recommended' ? 'viable' : incomeTier

        const keyInsights = this.generateInsights(work, costs, tax, netMonthly, benefit, personal)

        // 不变式：年度与月度必须闭合
        if (Math.abs(netAnnual - netMonthly * 12) > 0.1) {
          throw AppError.invariantViolation('年度净额与月度净额×12 不闭合', { netAnnual, netMonthly })
        }

        return {
          id,
          name,
          work,
          costs,
          income,
          costBreakdown,
          tax,
          benefit,
          netMonthly,
          netAnnual,
          netHourly,
          rightsScore,
          rightsFlags: flags,
          recommendation,
          keyInsights,
        }
      },
      e => AppError.engine('ScenarioService.runScenario', e instanceof Error ? e.message : String(e)),
    )
  }

  /** 对比多个场景，输出排序、最佳方案与摘要 */
  compare(input: ComparisonInput): Result<ComparisonResult, AppError> {
    if (!input.scenarios || input.scenarios.length === 0) {
      return err(AppError.validation('至少需要一个方案才能对比'))
    }

    const results = input.scenarios.map(s => this.runScenario(s))
    const firstErr = results.find(r => !r.ok)
    if (firstErr && !firstErr.ok) return err(firstErr.error)

    const scenarios = results.map(r => (r as { ok: true; value: ScenarioResult }).value)

    return tryCatch(
      () => {
        const ranking = scenarios
          .map(s => ({ id: s.id, netAnnual: s.netAnnual, label: s.name }))
          .sort((a, b) => b.netAnnual - a.netAnnual)

        const best = scenarios.reduce<ScenarioResult | null>(
          (b, s) => (s.netAnnual > (b?.netAnnual ?? -Infinity) ? s : b),
          null,
        )

        const runnerUp = ranking[1]?.netAnnual
        const gap = best && runnerUp !== undefined ? Math.round(best.netAnnual - runnerUp) : 0
        const summary = best
          ? `「${best.name}」方案年净收入 ¥${best.netAnnual.toLocaleString()}，排名第一${
              runnerUp !== undefined ? `，比第二名多 ¥${gap.toLocaleString()}/年` : ''
            }。权益评分 ${best.rightsScore}/100。`
          : '请添加至少一个方案进行对比。'

        return { scenarios, best, ranking, summary }
      },
      e => AppError.engine('ScenarioService.compare', e instanceof Error ? e.message : String(e)),
    )
  }

  /** 输入校验 */
  private validateInput(input: ScenarioInput): AppError | null {
    if (!input || !input.id || !input.name) return AppError.validation('场景 id 与 name 必填')
    if (!input.work || !input.costs || !input.personal) {
      return AppError.validation('work / costs / personal 必填')
    }
    const { work, personal } = input
    if (!Number.isFinite(work.dailyHours) || work.dailyHours <= 0) {
      return AppError.validation('work.dailyHours 必须为正数')
    }
    if (!Number.isFinite(work.workDaysMonth) || work.workDaysMonth <= 0) {
      return AppError.validation('work.workDaysMonth 必须为正数')
    }
    if (!Number.isFinite(work.dailyOrders) || work.dailyOrders < 0) {
      return AppError.validation('work.dailyOrders 必须为非负数')
    }
    if (!Number.isFinite(personal.currentAge) || personal.currentAge < 16) {
      return AppError.validation('personal.currentAge 必须 ≥ 16')
    }
    if (!Number.isFinite(personal.expectedRetireAge) || personal.expectedRetireAge <= personal.currentAge) {
      return AppError.validation('personal.expectedRetireAge 必须大于 currentAge')
    }
    return null
  }

  private generateInsights(
    work: WorkParams,
    costs: CostParams,
    tax: { effectiveRate: number },
    netMonthly: number,
    benefit: ReturnType<BenefitEngine['calcMonthly']>,
    personal: PersonalParams,
  ): string[] {
    const insights: string[] = []
    const dailyNet = netMonthly / safeDivisor(work.workDaysMonth)

    if (netMonthly > 8000) insights.push(`日均净收入 ¥${Math.round(dailyNet).toLocaleString()}，属于灵活就业高收入群体`)
    if (work.dailyHours > 10) insights.push('日工时超10小时，存在健康风险和效率递减，建议控制在8-10小时')
    if (tax.effectiveRate > 5) insights.push(`个税负担较重（${tax.effectiveRate}%），可咨询税务师核实是否符合其他计税方式`)
    if (costs.fuelCostMonth > 2000) insights.push('燃油成本高，若改用电动车可每月节省约800-1200元')

    if (benefit.totalMonthly > 0) {
      insights.push(`已参保：每月自缴养老+医保 ¥${benefit.totalMonthly.toLocaleString()}，净收入相应下降`)
    } else {
      insights.push(
        `若以灵活就业参保（养老+医保），每月需自缴 ¥${(benefit.pensionMonthly + benefit.medicalMonthly).toLocaleString()}，净收入相应下降`,
      )
    }

    if (personal.pensionBase && personal.pensionBase > 0) {
      insights.push('你选择了自定义缴费基数：当期支出随之上调，退休时的平均缴费指数随之提高')
    }

    return insights
  }
}