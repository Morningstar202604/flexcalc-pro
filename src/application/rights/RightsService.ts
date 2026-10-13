/**
 * RightsService - 权益评分与洞察生成
 *
 * 从 ScenarioEngine 中提取为独立应用层服务，便于单独测试与复用。
 * 全部方法返回 Result<T, AppError>，不抛出。
 */

import type {
  WorkParams,
  CostParams,
  PersonalParams,
  BenefitBreakdown,
  TaxBreakdown,
} from '../../types'
import { ok, err, tryCatch } from '../../domain/shared/result'
import type { Result } from '../../domain/shared/result'
import { AppError } from '../errors'

/** 权益评分输入 */
export interface RightsScoreInput {
  work: WorkParams
  costTotal: number
  personal: PersonalParams
  benefit: BenefitBreakdown
}

/** 权益洞察输入 */
export interface RightsInsightsInput {
  work: WorkParams
  costs: CostParams
  tax: Pick<TaxBreakdown, 'effectiveRate' | 'annualTax'>
  netMonthly: number
  benefit: BenefitBreakdown
  personal: PersonalParams
  rule: {
    benefit: { pension: { baseMin: number } }
  }
}

/** 权益评分输出 */
export interface RightsScoreOutput {
  score: number
  flags: string[]
}

/** 权益洞察输出 */
export interface RightsInsightsOutput {
  keyInsights: string[]
}

export type Recommendation = 'recommended' | 'viable' | 'risky'

const yuan = (n: number): string => n.toLocaleString('zh-CN')

export class RightsService {
  /**
   * 计算权益评分（0-100，分值越高保障越完整）
   *
   * 评分口径与扣分项均为显式常量，任何调整都应同步更新 README 中的评分说明，
   * 避免文档与实现漂移。
   */
  calculateScore(input: RightsScoreInput): Result<RightsScoreOutput, AppError> {
    return tryCatch(
      () => {
        const { work, costTotal, personal, benefit } = input
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

        if (costTotal > 3000) {
          score -= 5
          flags.push('运营成本高：高固定支出压缩净收入，抗风险能力低')
        }

        score -= 5
        flags.push('单一收入来源：平台政策变动即影响全部收入，无兜底')

        return { score: Math.max(0, Math.min(100, score)), flags }
      },
      e => AppError.rightsScore(e instanceof Error ? e.message : String(e), { input }),
    )
  }

  /**
   * 推荐等级
   *
   * 产品伦理约束：保障缺失时封顶为 viable。
   * 否则净收入一高就会出现「推荐你不参保」的反向激励，
   * 与本工具「先算清保障成本再决策」的立场相悖。
   */
  determineRecommendation(netMonthly: number, hasSocialInsurance: boolean): Recommendation {
    const incomeTier: Recommendation =
      netMonthly > 7000 ? 'recommended' : netMonthly > 4500 ? 'viable' : 'risky'
    return !hasSocialInsurance && incomeTier === 'recommended' ? 'viable' : incomeTier
  }

  /** 生成关键洞察 */
  generateInsights(input: RightsInsightsInput): Result<RightsInsightsOutput, AppError> {
    return tryCatch(
      () => {
        const { work, costs, tax, netMonthly, benefit, personal, rule } = input
        const insights: string[] = []

        const days = Number.isFinite(work.workDaysMonth) && work.workDaysMonth > 0 ? work.workDaysMonth : 1
        const dailyNet = netMonthly / days
        if (netMonthly > 8000) {
          insights.push(`日均净收入 ¥${Math.round(dailyNet).toLocaleString()}，属于灵活就业高收入群体`)
        }

        if (work.dailyHours > 10) {
          insights.push('日工时超10小时，存在健康风险和效率递减，建议控制在8-10小时')
        }

        if (tax.effectiveRate > 5) {
          insights.push(`个税负担较重（${tax.effectiveRate}%），可咨询税务师核实是否符合其他计税方式`)
        }

        if (costs.fuelCostMonth > 2000) {
          insights.push('燃油成本高，若改用电动车可每月节省约800-1200元')
        }

        if (benefit.totalMonthly > 0) {
          insights.push(`已参保：每月自缴养老+医保 ¥${yuan(benefit.totalMonthly)}，净收入相应下降`)
        } else {
          insights.push(
            `若以灵活就业参保（养老+医保），每月需自缴 ¥${yuan(benefit.pensionMonthly + benefit.medicalMonthly)}，净收入相应下降`,
          )
        }

        if (personal.pensionBase && personal.pensionBase < rule.benefit.pension.baseMin + 1) {
          insights.push(
            '你选择了最低档缴费基数：当期支出最低，但退休时的平均缴费指数随之降低，基础养老金会减少',
          )
        }

        return { keyInsights: insights }
      },
      e => AppError.rightsScore(e instanceof Error ? e.message : String(e), { input }),
    )
  }

  /** 完整权益分析：评分 + 推荐等级 + 洞察 */
  analyzeFull(
    input: RightsInsightsInput & { costTotal: number },
  ): Result<RightsScoreOutput & RightsInsightsOutput & { recommendation: Recommendation }, AppError> {
    const scoreResult = this.calculateScore({
      work: input.work,
      costTotal: input.costTotal,
      personal: input.personal,
      benefit: input.benefit,
    })
    if (!scoreResult.ok) return err(scoreResult.error)

    const recommendation = this.determineRecommendation(input.netMonthly, input.personal.hasSocialInsurance)

    const insightsResult = this.generateInsights(input)
    if (!insightsResult.ok) return err(insightsResult.error)

    return ok({ ...scoreResult.value, recommendation, ...insightsResult.value })
  }
}