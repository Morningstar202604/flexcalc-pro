// ===== 核心数据模型 =====

// 每条外部数据必须携带来源，UI 上可逐条回溯；confidence=unverified 的值不得对外引用
export interface SourceRef {
  title: string
  docNo?: string
  issuedBy?: string
  url?: string
  effectiveFrom?: string
  retrievedAt: string
  confidence: 'official' | 'derived' | 'unverified'
  note?: string
}

export interface CityRule {
  city: string
  cityName: string
  year: number
  lastCheckedAt: string
  /** 该城市全部条目均已官方核对时为 true，UI 据此显示数据可信度标识 */
  verified: boolean
  occupation: string
  occupationName: string
  income: IncomeRule
  tax: TaxRule
  benefit: BenefitRule
  minimumWage: { monthly: number; nonFullTimeHourly: number }
  /** 退休测算参数：计发基数与假想收益率均为外部输入，禁止在代码里写死 */
  retirement: { benefitBaseMonthly: number; paymentIndex: number; assumedAnnualReturn: number }
  sources: Record<string, SourceRef>
}

export interface IncomeRule {
  basePricePerOrder: number
  distanceRate: number
  /** P1 待接入：超重件加价（需补单均重量入参） */
  weightSurcharge: { threshold: number; rate: number }
  /** P1 待接入：peakHours 用于折算峰时单量占比，当前仅 multiplier 生效 */
  timeSubsidy: { peakHours: string[]; multiplier: number }
  holidayMultiplier: number
  rainSurcharge: number
  monthlyBonus?: { threshold: number; amount: number }
}

export interface TaxRule {
  method: string
  laborRemuneration: {
    expenseDeductionRate: number
    basicDeductionMonthly: number
    taxTable: TaxBracket[]
  }
}

export interface TaxBracket {
  min: number
  max: number
  rate: number
  deduction: number
}

export interface BenefitRule {
  /** 灵活就业人员自行缴纳全部费率，不存在单位分担 */
  pension: { baseMin: number; baseMax: number; rate: number }
  /** 以本人申报收入为基数，夹在上下限之间（穗医保规字〔2022〕1号） */
  medical: { baseMin: number; baseMax: number; rate: number }
}

// ===== 用户输入模型 =====

export interface WorkParams {
  city: string
  dailyHours: number
  dailyOrders: number
  avgDistance: number
  workDaysMonth: number
  rainDaysMonth: number
  holidayDaysMonth: number
}

export interface CostParams {
  vehicleType: 'electric' | 'fuel' | 'mixed'
  fuelCostMonth: number
  electricityCostMonth: number
  maintenanceMonth: number
  insuranceMonth: number
  phoneCostMonth: number
  foodCostMonth: number
  trafficFineMonth: number
  vehicleDepreciationMonth: number
  otherCostMonth: number
}

export interface PersonalParams {
  currentAge: number
  expectedRetireAge: number
  hasSocialInsurance: boolean
  specialDeductionMonth: number
}

// ===== 计算结果模型 =====

export interface IncomeBreakdown {
  basePay: number
  distancePay: number
  subsidyPay: number
  bonusPay: number
  grossIncome: number
}

export interface CostBreakdown extends CostParams {
  total: number
}

export interface TaxBreakdown {
  monthlyTax: number[]
  annualTax: number
  effectiveRate: number
  afterTaxIncome: number
  method: 'labor' | 'sole_proprietorship'
}

export interface BenefitBreakdown {
  pensionMonthly: number
  medicalMonthly: number
  totalMonthly: number
  items: { name: string; monthly: number; covered: boolean; risk: 'high' | 'medium' | 'low' }[]
}

export interface ScenarioResult {
  id: string
  name: string
  work: WorkParams
  costs: CostParams
  income: IncomeBreakdown
  costBreakdown: CostBreakdown
  tax: TaxBreakdown
  benefit: BenefitBreakdown
  netMonthly: number
  netAnnual: number
  netHourly: number
  rightsScore: number
  rightsFlags: string[]
  recommendation: 'recommended' | 'viable' | 'risky'
  keyInsights: string[]
}

export interface ComparisonResult {
  scenarios: ScenarioResult[]
  best: ScenarioResult | null
  ranking: { id: string; netAnnual: number; label: string }[]
  summary: string
}

// ===== 权益补偿结果（供文书生成器引用） =====

/**
 * claim        — 可直接主张，计入合计
 * conditional  — 需前置条件（行政责令、劳动关系认定、解除/终止等）才成立
 * info         — 无金额或裁审口径不一，仅作提示
 */
export interface CompensationItem { name: string; amount: number; note: string; kind: 'claim' | 'conditional' | 'info' }
export interface CompensationLegalRef { law: string; article: string; summary: string }
export interface CompensationResult {
  scene: string
  total: number
  conditionalTotal: number
  items: CompensationItem[]
  legalRefs: CompensationLegalRef[]
}
