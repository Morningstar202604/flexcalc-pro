import type { TaxRule, TaxBreakdown } from '../types'
import { round2 as round } from '../utils/number'

export class TaxEngine {
  constructor(private rule: TaxRule) {}

  /**
   * 年度汇算清缴口径（个人所得税税率表一）。
   *
   * 与「累计预扣预缴」的区别：预扣预缴时劳务报酬按每次收入套预扣率表二（20%/30%/40%，
   * 国家税务总局公告2018年第61号第八条），年度汇算时劳务报酬按 80% 折算收入额并入综合所得，
   * 套税率表一（3%-45%）。本方法算的是后者，规则文件的 tax.method 必须如实标注。
   */
  calcLabor(monthlyIncomes: number[], specialDeductionMonth = 0): TaxBreakdown {
    const { expenseDeductionRate, basicDeductionMonthly, expenseDeductionFixed, expenseDeductionThreshold, taxTable } = this.rule.laborRemuneration
    const fixed = expenseDeductionFixed ?? 0
    const threshold = expenseDeductionThreshold ?? 0
    let cumIncome = 0, cumTaxPaid = 0
    const monthlyTax: number[] = []

    for (let i = 0; i < 12; i++) {
      const raw = monthlyIncomes[i]
      cumIncome += Number.isFinite(raw) ? raw : 0
      // 61号公告第八条：每次收入不超过 4000 元的，减除费用按 800 元计算；超过的按 20%
      const months = i + 1
      const cumExpense = threshold > 0
        ? (cumIncome / months <= threshold ? cumIncome - fixed * months : cumIncome * expenseDeductionRate)
        : cumIncome * expenseDeductionRate
      const cumDeduction = basicDeductionMonthly * months + Math.max(0, specialDeductionMonth) * months
      const cumTaxable = Math.max(0, cumIncome - cumExpense - cumDeduction)
      const bracket = this.findBracket(cumTaxable, taxTable)
      if (!bracket) break
      const cumTax = Math.max(0, cumTaxable * bracket.rate - bracket.deduction)
      const monthTax = Math.max(0, round(cumTax - cumTaxPaid))
      cumTaxPaid = round(cumTax)
      monthlyTax.push(monthTax)
    }

    const totalIncome = monthlyIncomes.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0)
    const annualTax = round(monthlyTax.reduce((s, v) => s + v, 0))
    return {
      monthlyTax, annualTax, effectiveRate: totalIncome > 0 ? round(annualTax / totalIncome * 100) : 0,
      afterTaxIncome: round(totalIncome - annualTax), method: 'labor'
    }
  }

  calcLaborAnnual(annualIncome: number, specialDeductionMonth = 0): TaxBreakdown {
    return this.calcLabor(new Array(12).fill(annualIncome / 12), specialDeductionMonth)
  }

  /**
   * 个体工商户经营所得。
   * taxRate 必须是「小数」形式（如 0.01），早期版本在引擎用 0.01、在 UI 用 1.0，
   * 任一方向接错即变成 1% 或 100%。核定征收率因地区与行业差异极大，
   * 无权威来源时调用方应传占位值并自行提示，不得当作确定税额。
   */
  calcSoleProprietorship(annualProfit: number, taxRate = 0.01): TaxBreakdown {
    const annualTax = round(Math.max(0, Number.isFinite(annualProfit) ? annualProfit : 0) * taxRate)
    const monthly = round(annualTax / 12)
    const monthlyTax = new Array(12).fill(monthly)
    // 12 期之和必须等于年度税额，否则 UI 上月列相加对不上年度数
    const closedAnnual = round(monthlyTax.reduce((s, v) => s + v, 0))
    const profit = Math.max(0, Number.isFinite(annualProfit) ? annualProfit : 0)
    return {
      monthlyTax, annualTax: closedAnnual, effectiveRate: profit > 0 ? round(closedAnnual / profit * 100) : 0,
      afterTaxIncome: round(profit - closedAnnual), method: 'sole_proprietorship'
    }
  }

  private findBracket(taxable: number, table: { min: number; max: number; rate: number; deduction: number }[]) {
    for (const b of table) if (taxable >= b.min && taxable < b.max) return b
    return table[table.length - 1]
  }
}