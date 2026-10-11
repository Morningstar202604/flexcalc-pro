import type { TaxRule, TaxBreakdown } from '../types'

export class TaxEngine {
  constructor(private rule: TaxRule) {}

  calcLabor(monthlyIncomes: number[], specialDeductionMonth = 0): TaxBreakdown {
    const { expenseDeductionRate, basicDeductionMonthly, taxTable } = this.rule.laborRemuneration
    let cumIncome = 0, cumTaxPaid = 0
    const monthlyTax: number[] = []

    for (let i = 0; i < 12; i++) {
      cumIncome += monthlyIncomes[i] || 0
      const cumExpense = cumIncome * expenseDeductionRate
      const cumDeduction = basicDeductionMonthly * (i + 1) + specialDeductionMonth * (i + 1)
      const cumTaxable = Math.max(0, cumIncome - cumExpense - cumDeduction)
      const bracket = this.findBracket(cumTaxable, taxTable)
      const cumTax = Math.max(0, cumTaxable * bracket.rate - bracket.deduction)
      const monthTax = Math.max(0, round(cumTax - cumTaxPaid))
      cumTaxPaid = round(cumTax)
      monthlyTax.push(monthTax)
    }

    const totalIncome = monthlyIncomes.reduce((s, v) => s + v, 0)
    const annualTax = round(monthlyTax.reduce((s, v) => s + v, 0))
    return {
      monthlyTax, annualTax, effectiveRate: totalIncome > 0 ? round(annualTax / totalIncome * 10000) / 100 : 0,
      afterTaxIncome: round(totalIncome - annualTax), method: 'labor'
    }
  }

  calcLaborAnnual(annualIncome: number, specialDeductionMonth = 0): TaxBreakdown {
    return this.calcLabor(new Array(12).fill(annualIncome / 12), specialDeductionMonth)
  }

  calcSoleProprietorship(annualProfit: number, taxRate = 0.01): TaxBreakdown {
    const annualTax = round(Math.max(0, annualProfit) * taxRate)
    const monthlyTax = new Array(12).fill(round(annualTax / 12))
    return {
      monthlyTax, annualTax, effectiveRate: annualProfit > 0 ? round(annualTax / annualProfit * 10000) / 100 : 0,
      afterTaxIncome: round(annualProfit - annualTax), method: 'sole_proprietorship'
    }
  }

  private findBracket(taxable: number, table: { min: number; max: number; rate: number; deduction: number }[]) {
    for (const b of table) if (taxable >= b.min && taxable < b.max) return b
    return table[table.length - 1]
  }
}

function round(n: number) { return Math.round(n * 100) / 100 }
