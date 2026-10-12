import type { IncomeRule, CostParams, WorkParams, IncomeBreakdown, CostBreakdown } from '../types'
import { round2 as round } from '../utils/number'

export class IncomeEngine {
  constructor(private rule: IncomeRule) {}

  calcIncome(p: WorkParams): IncomeBreakdown {
    const days = safeInt(p.workDaysMonth, 1, 31, 1)
    const orders = safeNum(p.dailyOrders, 0, 200, 0)
    const dist = safeNum(p.avgDistance, 0, 50, 0)

    const basePay = orders * this.rule.basePricePerOrder * days
    const distancePay = orders * dist * this.rule.distanceRate * days
    const dailyBase = basePay / days
    const peakSubsidy = dailyBase * (this.rule.timeSubsidy.multiplier - 1)
    const rainExtra = safeNum(p.rainDaysMonth, 0, 31, 0) * dailyBase * (this.rule.rainSurcharge - 1)
    const holidayExtra = safeNum(p.holidayDaysMonth, 0, 31, 0) * dailyBase * (this.rule.holidayMultiplier - 1)
    const subsidyPay = peakSubsidy * days + rainExtra + holidayExtra
    let bonusPay = 0
    if (this.rule.monthlyBonus && orders * days >= this.rule.monthlyBonus.threshold)
      bonusPay = this.rule.monthlyBonus.amount
    return {
      basePay: round(basePay), distancePay: round(distancePay),
      subsidyPay: round(subsidyPay), bonusPay: round(bonusPay),
      grossIncome: round(basePay + distancePay + subsidyPay + bonusPay)
    }
  }

  calcCosts(p: CostParams): CostBreakdown {
    const parts = [
      p.fuelCostMonth, p.electricityCostMonth, p.maintenanceMonth, p.insuranceMonth,
      p.phoneCostMonth, p.foodCostMonth, p.trafficFineMonth, p.vehicleDepreciationMonth, p.otherCostMonth,
    ].map(v => safeNum(v, 0, 20000, 0))
    const total = parts.reduce((s, v) => s + v, 0)
    return { ...p, total: round(total) }
  }
}

function safeNum(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(Math.max(v, min), max)
}

function safeInt(v: unknown, min: number, max: number, fallback: number): number {
  return Math.round(safeNum(v, min, max, fallback))
}