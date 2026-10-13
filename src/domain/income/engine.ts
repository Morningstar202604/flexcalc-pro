/** 引擎实现：组合纯函数与规则 */

import { IncomeEngine } from './ports'
import { calcIncome, calcCosts } from './calculator'
import type { IncomeRule, WorkParams, CostParams, IncomeBreakdown, CostBreakdown } from './rules'

export class IncomeEngineImpl implements IncomeEngine {
  constructor(private readonly rule: IncomeRule) {}

  calcIncome(params: WorkParams): IncomeBreakdown {
    return calcIncome(this.rule, params)
  }

  calcCosts(params: CostParams): CostBreakdown {
    return calcCosts(params)
  }
}
