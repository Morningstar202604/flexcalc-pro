import type { IncomeRule, CostParams, WorkParams, IncomeBreakdown, CostBreakdown } from '../types'

export class IncomeEngine {
  constructor(private rule: IncomeRule) {}

  calcIncome(p: WorkParams): IncomeBreakdown {
    const basePay = p.dailyOrders * this.rule.basePricePerOrder * p.workDaysMonth
    const distancePay = p.dailyOrders * p.avgDistance * this.rule.distanceRate * p.workDaysMonth
    const peakSubsidy = (basePay / p.workDaysMonth) * (this.rule.timeSubsidy.multiplier - 1)
    const rainExtra = p.rainDaysMonth * (basePay / p.workDaysMonth) * (this.rule.rainSurcharge - 1)
    const holidayExtra = p.holidayDaysMonth * (basePay / p.workDaysMonth) * (this.rule.holidayMultiplier - 1)
    const subsidyPay = peakSubsidy * p.workDaysMonth + rainExtra + holidayExtra
    let bonusPay = 0
    if (this.rule.monthlyBonus && p.dailyOrders * p.workDaysMonth >= this.rule.monthlyBonus.threshold)
      bonusPay = this.rule.monthlyBonus.amount
    return {
      basePay: round(basePay), distancePay: round(distancePay),
      subsidyPay: round(subsidyPay), bonusPay: round(bonusPay),
      grossIncome: round(basePay + distancePay + subsidyPay + bonusPay)
    }
  }

  calcCosts(p: CostParams): CostBreakdown {
    const total = p.fuelCostMonth + p.electricityCostMonth + p.maintenanceMonth + p.insuranceMonth + p.phoneCostMonth + p.foodCostMonth + p.trafficFineMonth + p.vehicleDepreciationMonth + p.otherCostMonth
    return { ...p, total: round(total) }
  }
}

function round(n: number) { return Math.round(n * 100) / 100 }
