import { readFileSync } from 'fs'
import { ScenarioEngine } from '../src/engine/ScenarioEngine'
import type { CityRule, WorkParams, CostParams, PersonalParams } from '../src/types'

const rule = JSON.parse(readFileSync('public/rules/guangzhou.json', 'utf8')) as CityRule
const work: WorkParams = {
  city: 'guangzhou', dailyHours: 10, dailyOrders: 35,
  avgDistance: 2.5, workDaysMonth: 26, rainDaysMonth: 3, holidayDaysMonth: 2,
}
const costs: CostParams = {
  vehicleType: 'electric', fuelCostMonth: 0, electricityCostMonth: 300, maintenanceMonth: 200,
  insuranceMonth: 100, phoneCostMonth: 100, foodCostMonth: 800, trafficFineMonth: 50,
  vehicleDepreciationMonth: 300, otherCostMonth: 100,
}
const personal: PersonalParams = {
  currentAge: 25, expectedRetireAge: 60, hasSocialInsurance: false, specialDeductionMonth: 0,
}

const eng = new ScenarioEngine(rule)
const uninsured = eng.runScenario('current', '未参保', work, costs, personal)
const insured = eng.runScenario('insured', '已参保', work, costs, { ...personal, hasSocialInsurance: true })

const sum = uninsured.income.basePay + uninsured.income.distancePay + uninsured.income.subsidyPay + uninsured.income.bonusPay

console.log('=== 一致性 ===')
console.log('分项之和', sum, '月收入', uninsured.income.grossIncome, '相等=', sum === uninsured.income.grossIncome)
console.log('成本饼图缺项', costs.phoneCostMonth + costs.otherCostMonth, '（应被图表覆盖）')

console.log('\n=== 未参保 ===')
console.log('月收入', uninsured.income.grossIncome, '月成本', uninsured.costBreakdown.total, '月个税', (uninsured.tax.annualTax / 12).toFixed(2))
console.log('社保自缴', uninsured.benefit.totalMonthly, '净收入', uninsured.netMonthly, '时薪', uninsured.netHourly)
console.log('权益分', uninsured.rightsScore, '评级', uninsured.recommendation, '缺口', uninsured.rightsFlags.length, '项')

console.log('\n=== 已参保 ===')
console.log('社保自缴', insured.benefit.totalMonthly, '(养老', insured.benefit.pensionMonthly, '+ 医保', insured.benefit.medicalMonthly, ')')
console.log('净收入', insured.netMonthly, '时薪', insured.netHourly, '权益分', insured.rightsScore, '评级', insured.recommendation)

console.log('\n=== 参保的真实代价与收益 ===')
console.log('每月少拿', (uninsured.netMonthly - insured.netMonthly).toFixed(2), '元；权益分变化', uninsured.rightsScore, '->', insured.rightsScore)

console.log('\n=== 闭合校验 ===')
const closed = Math.abs(uninsured.netMonthly - (uninsured.income.grossIncome - uninsured.costBreakdown.total - uninsured.tax.annualTax / 12 - uninsured.benefit.totalMonthly))
console.log('净收入恒等式误差', closed.toFixed(6))
