import { Cent, Rate, yuanToCent } from '../shared/value-objects'
import type { TaxEngineConfig, TaxBreakdown, TaxError, LaborRemunerationRule, SoleProprietorshipRule } from './rules'
import { TaxEngine, TaxRuleProvider } from './ports'
import { calcLaborAnnual, calcLaborMonthly, calcSoleProprietorship } from './calculator'
import { Result, ok, err } from '../shared/result'

/** TaxEngine 实现：组合计算器与规则提供者 */
export class TaxEngineImpl implements TaxEngine {
  constructor(private readonly ruleProvider: TaxRuleProvider) {}

  calcLaborAnnual(cityId: string, annualIncome: Cent, specialDeductionMonthly: Cent): Result<TaxBreakdown, TaxError> {
    const configResult = this.ruleProvider.getTaxConfig(cityId)
    if (!configResult.ok) return configResult

    return calcLaborAnnual(annualIncome, specialDeductionMonthly, configResult.value.laborRemuneration)
  }

  calcLaborMonthly(cityId: string, monthlyIncomes: readonly Cent[], specialDeductionMonthly: Cent): Result<TaxBreakdown, TaxError> {
    const configResult = this.ruleProvider.getTaxConfig(cityId)
    if (!configResult.ok) return configResult

    return calcLaborMonthly(monthlyIncomes, specialDeductionMonthly, configResult.value.laborRemuneration)
  }

  calcSoleProprietorship(cityId: string, annualTurnover: Cent): Result<TaxBreakdown, TaxError> {
    const configResult = this.ruleProvider.getTaxConfig(cityId)
    if (!configResult.ok) return configResult

    return calcSoleProprietorship(annualTurnover, configResult.value.soleProprietorship)
  }
}

/** 基于 JSON 规则文件的规则提供者实现 */
export class JsonTaxRuleProvider implements TaxRuleProvider {
  private readonly cache = new Map<string, TaxEngineConfig>()

  constructor(private readonly rules: Record<string, TaxEngineConfig>) {}

  getTaxConfig(cityId: string): Result<TaxEngineConfig, TaxError> {
    const cached = this.cache.get(cityId)
    if (cached) return ok(cached)

    const config = this.rules[cityId]
    if (!config) {
      return err({ code: 'INVALID_RULE', message: `City not found: ${cityId}`, context: { cityId } })
    }

    this.cache.set(cityId, config)
    return ok(config)
  }

  listCities(): string[] {
    return Object.keys(this.rules)
  }
}

/** 从旧版规则格式转换为 domain/tax 规则格式 */
export function convertLegacyTaxRule(legacy: {
  laborRemuneration: {
    expenseDeductionRate: number
    expenseDeductionFixed?: number
    expenseDeductionThreshold?: number
    basicDeductionMonthly: number
    taxTable: Array<{ min: number; max: number; rate: number; deduction: number }>
  }
  soleProprietorship: {
    vatRate: number
    vatThresholdMonthly: number
    itrIncomeRate: number
    itrDeductionMonthly: number
    bizTaxTable: Array<{ min: number; max: number; rate: number; deduction: number }>
  }
}): TaxEngineConfig {
  const { laborRemuneration, soleProprietorship } = legacy

  return {
    laborRemuneration: {
      expenseDeductionRate: Rate.create(laborRemuneration.expenseDeductionRate),
      expenseDeductionFixed: yuanToCent(laborRemuneration.expenseDeductionFixed ?? 800),
      expenseDeductionThreshold: yuanToCent(laborRemuneration.expenseDeductionThreshold ?? 4000),
      basicDeductionMonthly: yuanToCent(laborRemuneration.basicDeductionMonthly),
      taxTable: laborRemuneration.taxTable.map(b => ({
        min: yuanToCent(b.min),
        max: yuanToCent(b.max),
        rate: Rate.create(b.rate),
        deduction: yuanToCent(b.deduction)
      }))
    },
    soleProprietorship: {
      vatRate: Rate.create(soleProprietorship.vatRate),
      vatThresholdMonthly: yuanToCent(soleProprietorship.vatThresholdMonthly),
      itrIncomeRate: Rate.create(soleProprietorship.itrIncomeRate),
      itrDeductionMonthly: yuanToCent(soleProprietorship.itrDeductionMonthly),
      bizTaxTable: soleProprietorship.bizTaxTable.map(b => ({
        min: yuanToCent(b.min),
        max: yuanToCent(b.max),
        rate: Rate.create(b.rate),
        deduction: yuanToCent(b.deduction)
      }))
    }
  }
}