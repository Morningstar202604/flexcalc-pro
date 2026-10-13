import { Cent, Rate, yuanToCent } from '../shared/value-objects'
import type {
  BenefitRule,
  BenefitEngineConfig,
  BenefitBreakdown,
  RetirementRule,
  RetirementProjection,
  BenefitError,
  ContributionBase,
  MedicalTier,
} from './rules'
import {
  BenefitEngine,
  BenefitRuleProvider,
  BenefitCalculator,
  RetirementEngine,
} from './ports'
import {
  calcMonthly,
  findMedicalTierRate,
  projectRetirement,
  resolveBase,
} from './calculator'
import { Result, ok, err } from '../shared/result'

/** BenefitCalculator 实现：纯函数组合 */
export class BenefitCalculatorImpl implements BenefitCalculator {
  calcMonthly(
    income: Cent,
    enrolled: boolean,
    medicalTierRate: Rate | undefined,
    base: ContributionBase,
    rule: BenefitRule
  ): Result<BenefitBreakdown, BenefitError> {
    return calcMonthly(income, enrolled, medicalTierRate, base, rule)
  }

  resolveBase(chosen: Cent | undefined, declared: Cent, min: Cent, max: Cent): Cent {
    return resolveBase(chosen, declared, min, max)
  }

  projectRetirement(
    currentAge: number,
    retireAge: number,
    monthlyContribution: Cent,
    yearsContributed: number,
    annualReturn: Rate,
    paymentIndex: Rate,
    benefitBaseMonthly: Cent
  ): Result<RetirementProjection, BenefitError> {
    return projectRetirement(
      currentAge,
      retireAge,
      monthlyContribution,
      yearsContributed,
      annualReturn,
      paymentIndex,
      benefitBaseMonthly
    )
  }
}

/** RetirementEngine 实现：独立的退休测算引擎 */
export class RetirementEngineImpl implements RetirementEngine {
  private readonly calculator: BenefitCalculator

  constructor(calculator?: BenefitCalculator) {
    this.calculator = calculator ?? new BenefitCalculatorImpl()
  }

  projectRetirement(
    currentAge: number,
    retireAge: number,
    monthlyContribution: Cent,
    yearsContributed: number,
    annualReturn: Rate,
    paymentIndex: Rate,
    benefitBaseMonthly: Cent
  ): Result<RetirementProjection, BenefitError> {
    return this.calculator.projectRetirement(
      currentAge,
      retireAge,
      monthlyContribution,
      yearsContributed,
      annualReturn,
      paymentIndex,
      benefitBaseMonthly
    )
  }
}

/** BenefitEngine 实现：组合计算器与规则提供者 */
export class BenefitEngineImpl implements BenefitEngine {
  private readonly calculator: BenefitCalculator

  constructor(
    private readonly ruleProvider: BenefitRuleProvider,
    calculator?: BenefitCalculator
  ) {
    this.calculator = calculator ?? new BenefitCalculatorImpl()
  }

  calcMonthly(
    cityId: string,
    income: Cent,
    enrolled: boolean,
    medicalTierId?: string,
    base?: ContributionBase
  ): Result<BenefitBreakdown, BenefitError> {
    const configResult = this.ruleProvider.getBenefitConfig(cityId)
    if (!configResult.ok) return configResult

    const config = configResult.value
    const medicalTierRate = findMedicalTierRate(config.benefit.medicalTiers, medicalTierId)

    return this.calculator.calcMonthly(
      income,
      enrolled,
      medicalTierRate,
      base ?? {},
      config.benefit
    )
  }

  projectRetirement(
    cityId: string,
    currentAge: number,
    retireAge: number,
    monthlyContribution: Cent,
    yearsContributed: number,
    annualReturn?: Rate,
    paymentIndex?: Rate
  ): Result<RetirementProjection, BenefitError> {
    const configResult = this.ruleProvider.getBenefitConfig(cityId)
    if (!configResult.ok) return configResult

    const config = configResult.value
    const retirement = config.retirement

    const safeAnnualReturn = annualReturn ?? retirement.assumedAnnualReturn
    const safePaymentIndex = paymentIndex ?? retirement.paymentIndex

    return this.calculator.projectRetirement(
      currentAge,
      retireAge,
      monthlyContribution,
      yearsContributed,
      safeAnnualReturn,
      safePaymentIndex,
      retirement.benefitBaseMonthly
    )
  }
}

/** 基于 JSON 规则文件的规则提供者实现 */
export class JsonBenefitRuleProvider implements BenefitRuleProvider {
  private readonly cache = new Map<string, BenefitEngineConfig>()

  constructor(private readonly rules: Record<string, BenefitEngineConfig>) {}

  getBenefitConfig(cityId: string): Result<BenefitEngineConfig, BenefitError> {
    const cached = this.cache.get(cityId)
    if (cached) return ok(cached)

    const config = this.rules[cityId]
    if (!config) {
      return err({
        code: 'CITY_NOT_FOUND',
        message: `City not found: ${cityId}`,
        context: { cityId },
      })
    }

    this.cache.set(cityId, config)
    return ok(config)
  }

  listCities(): string[] {
    return Object.keys(this.rules)
  }
}

/** 从旧版规则格式转换为 domain/benefit 规则格式 */
export function convertLegacyBenefitRule(legacy: {
  benefit: {
    pension: { baseMin: number; baseMax: number; rate: number }
    medical: { baseMin: number; baseMax: number; rate: number }
    medicalTiers?: Array<{ id: string; name: string; rate: number; note: string }>
  }
  retirement: {
    benefitBaseMonthly: number
    paymentIndex: number
    assumedAnnualReturn: number
  }
}): BenefitEngineConfig {
  const { benefit, retirement } = legacy

  return {
    benefit: {
      pension: {
        baseMin: yuanToCent(benefit.pension.baseMin),
        baseMax: yuanToCent(benefit.pension.baseMax),
        rate: Rate.create(benefit.pension.rate),
      },
      medical: {
        baseMin: yuanToCent(benefit.medical.baseMin),
        baseMax: yuanToCent(benefit.medical.baseMax),
        rate: Rate.create(benefit.medical.rate),
      },
      medicalTiers: benefit.medicalTiers?.map(t => ({
        id: t.id,
        name: t.name,
        rate: Rate.create(t.rate),
        note: t.note,
      })),
    },
    retirement: {
      benefitBaseMonthly: yuanToCent(retirement.benefitBaseMonthly),
      paymentIndex: Rate.create(retirement.paymentIndex),
      assumedAnnualReturn: Rate.create(retirement.assumedAnnualReturn),
    },
  }
}
