/** 领域端口：收入引擎与规则提供者接口 */

import type { IncomeRule } from './rules'
import type { WorkParams, CostParams } from './rules'
import type { IncomeBreakdown, CostBreakdown } from './rules'

export interface IncomeEngine {
  /** 计算毛收入分项 */
  calcIncome(params: WorkParams): IncomeBreakdown
  /** 计算成本分项 */
  calcCosts(params: CostParams): CostBreakdown
}

export interface IncomeRuleProvider {
  /** 获取城市收入规则 */
  getIncomeRule(cityId: string): IncomeRule | null
  /** 列出所有可用城市 */
  listCities(): string[]
}
