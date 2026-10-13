/** 纯类型定义：品牌类型确保单位安全 */

// ===== 品牌类型 =====
/** 分（Cent） */
export type Cent = number & { readonly __brand: unique symbol }
/** 千米 */
export type Kilometer = number & { readonly __brand: unique symbol }
/** 小时 */
export type Hour = number & { readonly __brand: unique symbol }

/** 构造品牌类型的工厂函数 */
export function cent(n: number): Cent { return n as Cent }
export function kilometer(n: number): Kilometer { return n as Kilometer }
export function hour(n: number): Hour { return n as Hour }

// ===== 收入规则 =====
export interface IncomeRule {
  /** 基础单价（分/单） */
  basePricePerOrder: Cent
  /** 距离费率（分/千米） */
  distanceRate: Cent
  /** 超重件加价阈值与费率（暂不启用） */
  weightSurcharge: { threshold: number; rate: Cent }
  /** 时段补贴：峰时时段与倍率 */
  timeSubsidy: { peakHours: string[]; multiplier: number }
  /** 节假日倍率 */
  holidayMultiplier: number
  /** 雨天加价倍率 */
  rainSurcharge: number
  /** 月度冲单奖：门槛单量与奖励金额（分） */
  monthlyBonus?: { threshold: number; amount: Cent }
}

// ===== 工作参数 =====
export interface WorkParams {
  city: string
  /** 日均工时（小时） */
  dailyHours: Hour
  /** 日均单量 */
  dailyOrders: number
  /** 单均距离（千米） */
  avgDistance: Kilometer
  /** 月工作天数 */
  workDaysMonth: number
  /** 月雨天天数 */
  rainDaysMonth: number
  /** 月节假日天数 */
  holidayDaysMonth: number
}

// ===== 成本参数 =====
export interface CostParams {
  vehicleType: 'electric' | 'fuel' | 'mixed'
  /** 油费（分/月） */
  fuelCostMonth: Cent
  /** 电费（分/月） */
  electricityCostMonth: Cent
  /** 维护费（分/月） */
  maintenanceMonth: Cent
  /** 保险费（分/月） */
  insuranceMonth: Cent
  /** 话费（分/月） */
  phoneCostMonth: Cent
  /** 餐费（分/月） */
  foodCostMonth: Cent
  /** 违章罚款（分/月） */
  trafficFineMonth: Cent
  /** 车辆折旧（分/月） */
  vehicleDepreciationMonth: Cent
  /** 其他杂费（分/月） */
  otherCostMonth: Cent
}

// ===== 计算结果 =====
export interface IncomeBreakdown {
  /** 基础计件（分） */
  basePay: Cent
  /** 距离费（分） */
  distancePay: Cent
  /** 补贴合计（分） */
  subsidyPay: Cent
  /** 冲单奖（分） */
  bonusPay: Cent
  /** 毛收入（分） */
  grossIncome: Cent
}

export interface CostBreakdown extends CostParams {
  /** 成本合计（分） */
  total: Cent
}
