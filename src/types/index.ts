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
  retirement: RetirementRule
  /** 个体工商户税负参数：增值税与个人所得税是两个税种，必须分列 */
  soleProprietorship: SoleProprietorshipRule
  sources: Record<string, SourceRef>
}

/**
 * 个体工商户税负。
 * 增值税与个人所得税是两套独立体系：
 * - 增值税适用小规模纳税人简易计税的减按优惠（国家层面统一）
 * - 个税核定征收按「行业所得率法」，行业与地区分别核定，不存在全国统一税率
 */
export interface SoleProprietorshipRule {
  /** 小规模纳税人增值税优惠税率（小数） */
  vatRate: number
  /** 增值税起征点（月销售额），未达则免征 */
  vatThresholdMonthly: number
  /** 个税核定征收的行业所得率（小数），随行业与地区变化 */
  itrIncomeRate: number
}

/** 养老金计发参数。benefitBaseMonthly 为本城计发基数，深圳单列、其余地市用全省口径 */
export interface RetirementRule {
  benefitBaseMonthly: number
  paymentIndex: number
  assumedAnnualReturn: number
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
  /**
   * annual_consolidated = 年度汇算清缴口径（税率表一，3%-45%）。
   * 若平台成为扣缴义务人，真实预扣预缴应改用 61号公告预扣率表二（20%/30%/40%），两者差异很大。
   */
  method: string
  laborRemuneration: {
    expenseDeductionRate: number
    /** 61号公告第八条：每次收入不超过 4000 元的，减除费用按 800 元计算 */
    expenseDeductionFixed?: number
    /** 该分支的适用阈值（每次收入额上限），由规则文件承载，不写死在代码里 */
    expenseDeductionThreshold?: number
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
  /** 以本人申报收入为基数，夹在上下限之间。rate 为默认档费率 */
  medical: { baseMin: number; baseMax: number; rate: number }
  /** 部分城市（如东莞）医保分档收费，无单一法定费率；缺省时按 medical.rate 计算 */
  medicalTiers?: MedicalTier[]
}

/** 医保档次：东莞等地对灵活就业人按档设费率，用户可自行选择实际参保档次 */
export interface MedicalTier {
  id: string
  name: string
  rate: number
  note: string
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
  /** 医保档次 id，对应 rule.benefit.medicalTiers；为空表示用默认档 */
  medicalTierId?: string
  /** 用户自选的养老缴费基数；为空表示按申报收入夹取 */
  pensionBase?: number
  /** 用户自选的医保缴费基数；为空表示按申报收入夹取 */
  medicalBase?: number
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
