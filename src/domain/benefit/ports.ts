import { Cent, Rate } from '../shared/value-objects'
import type { BenefitRule, BenefitEngineConfig, BenefitBreakdown, RetirementRule, RetirementProjection, BenefitError, ContributionBase } from './rules'
import { Result } from '../shared/result'

/** 社保规则提供者端口：依赖倒置，规则来源可替换（文件、远程、缓存） */
export interface BenefitRuleProvider {
  /** 获取城市的社保引擎配置 */
  getBenefitConfig(cityId: string): Result<BenefitEngineConfig, BenefitError>
  /** 列出所有可用城市 */
  listCities(): string[]
}

/** 纯计算器端口：无状态、可测试、可组合 */
export interface BenefitCalculator {
  /** 月度缴费测算：纯函数，无副作用 */
  calcMonthly(
    income: Cent,
    enrolled: boolean,
    medicalTierRate: Rate | undefined,
    base: ContributionBase,
    rule: BenefitRule
  ): Result<BenefitBreakdown, BenefitError>
  /** 解析缴费基数：用户自选优先，回落到申报收入，再夹取到上下限 */
  resolveBase(chosen: Cent | undefined, declared: Cent, min: Cent, max: Cent): Cent
  /** 退休测算：基础养老金 + 个人账户养老金 */
  projectRetirement(
    currentAge: number,
    retireAge: number,
    monthlyContribution: Cent,
    yearsContributed: number,
    annualReturn: Rate,
    paymentIndex: Rate,
    benefitBaseMonthly: Cent
  ): Result<RetirementProjection, BenefitError>
}

/** 社保引擎端口：对外统一入口，组合计算器与规则提供者 */
export interface BenefitEngine {
  /** 月度缴费测算 */
  calcMonthly(
    cityId: string,
    income: Cent,
    enrolled: boolean,
    medicalTierId?: string,
    base?: ContributionBase
  ): Result<BenefitBreakdown, BenefitError>
  /** 退休测算 */
  projectRetirement(
    cityId: string,
    currentAge: number,
    retireAge: number,
    monthlyContribution: Cent,
    yearsContributed: number,
    annualReturn?: Rate,
    paymentIndex?: Rate
  ): Result<RetirementProjection, BenefitError>
}

/** 退休引擎端口：独立的退休测算接口，可单独注入 */
export interface RetirementEngine {
  projectRetirement(
    currentAge: number,
    retireAge: number,
    monthlyContribution: Cent,
    yearsContributed: number,
    annualReturn: Rate,
    paymentIndex: Rate,
    benefitBaseMonthly: Cent
  ): Result<RetirementProjection, BenefitError>
}
