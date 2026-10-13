/** 纯计算函数：无副作用、可独立测试 */

import type { IncomeRule, WorkParams, CostParams, IncomeBreakdown, CostBreakdown, Cent, Hour, Kilometer } from './rules'
import { cent } from './rules'

/** 安全除法：分母为 0 时返回 0 */
export function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return numerator / denominator
}

/** 解析峰时时段字符串数组，返回总小时数 */
export function peakHoursTotal(peakHours: string[]): number {
  return peakHours.reduce((sum, range) => {
    const [a, b] = range.split('-').map(t => Number(t.slice(0, 2)))
    return sum + (Number.isFinite(a) && Number.isFinite(b) && b > a ? b - a : 0)
  }, 0)
}

/** 夹取数值到区间 [min, max]，非数值返回 fallback */
export function clamp(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(Math.max(v, min), max)
}

/** 计算毛收入分项 */
export function calcIncome(rule: IncomeRule, params: WorkParams): IncomeBreakdown {
  const days = Math.round(clamp(params.workDaysMonth, 0, 31, 1))
  const orders = clamp(params.dailyOrders, 0, 200, 0)
  const dist = clamp(params.avgDistance, 0, 50, 0)
  const hours = clamp(params.dailyHours, 1, 24, 8)

  // 基础计件：单量 × 单价 × 天数
  const basePay = Math.round(orders * rule.basePricePerOrder * days)
  
  // 距离费：单量 × 距离 × 费率 × 天数
  const distancePay = Math.round(orders * dist * rule.distanceRate * days)
  
  // 日基础收入（用于补贴计算）
  const dailyBase = safeDiv(basePay, days)
  
  // 峰时补贴折算：峰时总时长 ÷ 日均工时，上限 1
  const peakTotalHours = peakHoursTotal(rule.timeSubsidy.peakHours)
  const peakShare = Math.min(1, safeDiv(peakTotalHours, hours))
  const peakSubsidyDaily = dailyBase * (rule.timeSubsidy.multiplier - 1) * peakShare
  
  // 雨天补贴：雨天天数 × 日基础 × (倍率 - 1)
  const rainDays = Math.round(clamp(params.rainDaysMonth, 0, 31, 0))
  const rainExtra = rainDays * dailyBase * (rule.rainSurcharge - 1)
  
  // 节假日补贴：节假日天数 × 日基础 × (倍率 - 1)
  const holidayDays = Math.round(clamp(params.holidayDaysMonth, 0, 31, 0))
  const holidayExtra = holidayDays * dailyBase * (rule.holidayMultiplier - 1)
  
  // 补贴合计
  const subsidyPay = Math.round(peakSubsidyDaily * days + rainExtra + holidayExtra)
  
  // 冲单奖
  let bonusPay = 0
  if (rule.monthlyBonus && orders * days >= rule.monthlyBonus.threshold) {
    bonusPay = rule.monthlyBonus.amount
  }
  
  // 毛收入
  const grossIncome = basePay + distancePay + subsidyPay + bonusPay

  return {
    basePay: cent(basePay),
    distancePay: cent(distancePay),
    subsidyPay: cent(subsidyPay),
    bonusPay: cent(bonusPay),
    grossIncome: cent(grossIncome),
  }
}

/** 计算成本分项 */
export function calcCosts(params: CostParams): CostBreakdown {
  const fuelCostMonth = clamp(params.fuelCostMonth, 0, 2000000, 0)
  const electricityCostMonth = clamp(params.electricityCostMonth, 0, 2000000, 0)
  const maintenanceMonth = clamp(params.maintenanceMonth, 0, 2000000, 0)
  const insuranceMonth = clamp(params.insuranceMonth, 0, 2000000, 0)
  const phoneCostMonth = clamp(params.phoneCostMonth, 0, 2000000, 0)
  const foodCostMonth = clamp(params.foodCostMonth, 0, 2000000, 0)
  const trafficFineMonth = clamp(params.trafficFineMonth, 0, 2000000, 0)
  const vehicleDepreciationMonth = clamp(params.vehicleDepreciationMonth, 0, 2000000, 0)
  const otherCostMonth = clamp(params.otherCostMonth, 0, 2000000, 0)
  
  const total = fuelCostMonth + electricityCostMonth + maintenanceMonth + insuranceMonth
    + phoneCostMonth + foodCostMonth + trafficFineMonth + vehicleDepreciationMonth + otherCostMonth
  
  return {
    vehicleType: params.vehicleType,
    fuelCostMonth: cent(fuelCostMonth),
    electricityCostMonth: cent(electricityCostMonth),
    maintenanceMonth: cent(maintenanceMonth),
    insuranceMonth: cent(insuranceMonth),
    phoneCostMonth: cent(phoneCostMonth),
    foodCostMonth: cent(foodCostMonth),
    trafficFineMonth: cent(trafficFineMonth),
    vehicleDepreciationMonth: cent(vehicleDepreciationMonth),
    otherCostMonth: cent(otherCostMonth),
    total: cent(total),
  }
}
