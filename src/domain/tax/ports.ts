import { Cent, Rate } from '../shared/value-objects'
import type { TaxEngineConfig, TaxBreakdown, TaxError, LaborRemunerationRule, SoleProprietorshipRule, TaxBracket } from './rules'
import { Result } from '../shared/result'

/** 税收规则提供者端口：依赖倒置，规则来源可替换（文件、远程、缓存） */
export interface TaxRuleProvider {
  /** 获取城市的税收引擎配置 */
  getTaxConfig(cityId: string): Result<TaxEngineConfig, TaxError>
  /** 列出所有可用城市 */
  listCities(): string[]
}

/** 纯计算器端口：无状态、可测试、可组合 */
export interface TaxCalculator {
  /** 年度劳务报酬个税（汇算清缴口径，税率表一） */
  calcLaborAnnual(annualIncome: Cent, specialDeductionMonthly: Cent, config: LaborRemunerationRule): Result<TaxBreakdown, TaxError>
  /** 月度累计预扣法劳务报酬个税（12个月明细） */
  calcLaborMonthly(monthlyIncomes: readonly Cent[], specialDeductionMonthly: Cent, config: LaborRemunerationRule): Result<TaxBreakdown, TaxError>
  /** 个体工商户经营所得个税（核定征收） */
  calcSoleProprietorship(annualTurnover: Cent, config: SoleProprietorshipRule): Result<TaxBreakdown, TaxError>
  /** 查找税率档次 */
  findBracket(taxableIncome: Cent, table: readonly TaxBracket[]): Result<TaxBracket, TaxError>
}

/** 税收引擎端口：对外统一入口，组合计算器与规则提供者 */
export interface TaxEngine {
  /** 计算劳务报酬个税（年度汇算清缴口径） */
  calcLaborAnnual(cityId: string, annualIncome: Cent, specialDeductionMonthly: Cent): Result<TaxBreakdown, TaxError>
  /** 计算劳务报酬个税（月度累计预扣明细） */
  calcLaborMonthly(cityId: string, monthlyIncomes: readonly Cent[], specialDeductionMonthly: Cent): Result<TaxBreakdown, TaxError>
  /** 计算个体工商户经营所得个税 */
  calcSoleProprietorship(cityId: string, annualTurnover: Cent): Result<TaxBreakdown, TaxError>
}
