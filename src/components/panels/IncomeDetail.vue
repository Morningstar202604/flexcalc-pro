<template>
  <div>
    <n-grid :x-gap="12" :cols="2">
      <n-gi>
        <n-card title="收入结构拆解" class="card">
          <div v-if="s" class="detail-block">
            <div class="d-row"><span>基础配送费 ({{ s.work.dailyOrders }}单 × ¥{{ rule?.income.basePricePerOrder }} × {{ s.work.workDaysMonth }}天)</span><b>¥{{ s.income.basePay.toLocaleString() }}</b></div>
            <div class="d-row"><span>距离加价 ({{ s.work.dailyOrders }}单 × {{ s.work.avgDistance }}km × ¥{{ rule?.income.distanceRate }} × {{ s.work.workDaysMonth }}天)</span><b>¥{{ s.income.distancePay.toLocaleString() }}</b></div>
            <div class="d-row"><span>时段补贴 (高峰 × {{ rule?.income.timeSubsidy.multiplier }})</span><b>¥{{ s.income.subsidyPay.toLocaleString() }}</b></div>
            <div v-if="s.income.bonusPay > 0" class="d-row"><span>冲单奖励</span><b>¥{{ s.income.bonusPay }}</b></div>
            <div class="d-row total"><span>月总收入 <SourceTag source-key="income" /></span><b>¥{{ s.income.grossIncome.toLocaleString() }}</b></div>
            <div class="d-row"><span>日均收入</span><b>¥{{ safeDiv(s.income.grossIncome, s.work.workDaysMonth, 0) }}</b></div>
            <div class="d-row"><span>时均收入</span><b>¥{{ safeDiv(s.income.grossIncome, s.work.dailyHours * s.work.workDaysMonth, 1) }}/h</b></div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="成本结构拆解" class="card">
          <div v-if="s" class="detail-block">
            <div class="d-row"><span>油费/电费</span><b>¥{{ (s.costs.fuelCostMonth + s.costs.electricityCostMonth).toLocaleString() }}</b></div>
            <div class="d-row"><span>车辆维护</span><b>¥{{ s.costs.maintenanceMonth.toLocaleString() }}</b></div>
            <div class="d-row"><span>保险</span><b>¥{{ s.costs.insuranceMonth.toLocaleString() }}</b></div>
            <div class="d-row"><span>通讯</span><b>¥{{ s.costs.phoneCostMonth.toLocaleString() }}</b></div>
            <div class="d-row"><span>餐饮</span><b>¥{{ s.costs.foodCostMonth.toLocaleString() }}</b></div>
            <div class="d-row"><span>交通罚款</span><b>¥{{ s.costs.trafficFineMonth.toLocaleString() }}</b></div>
            <div class="d-row"><span>车辆折旧</span><b>¥{{ s.costs.vehicleDepreciationMonth.toLocaleString() }}</b></div>
            <div class="d-row"><span>其他</span><b>¥{{ s.costs.otherCostMonth.toLocaleString() }}</b></div>
            <div class="d-row total"><span>月总成本</span><b class="danger">¥{{ s.costBreakdown.total.toLocaleString() }}</b></div>
            <div class="d-row"><span>每单成本</span><b>¥{{ safeDiv(s.costBreakdown.total, s.work.dailyOrders * s.work.workDaysMonth, 2) }}/单</b></div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="12" :cols="2" style="margin-top: 12px">
      <n-gi>
        <n-card title="收入 vs 成本 vs 税后净收入" class="card">
          <ChartBox :option="waterfallOption" :height="320" />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="成本占比" class="card">
          <ChartBox :option="costPieOption" :height="320" />
        </n-card>
      </n-gi>
    </n-grid>

    <n-card title="年度收支预测" class="card" style="margin-top: 12px">
      <ChartBox :option="yearlyOption" :height="320" />
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import { NCard, NGrid, NGi } from 'naive-ui'
import { useMainStore } from '../../stores/main'
import { axisX, axisY, GRID, C } from '../../utils/chart'
import ChartBox from '../ChartBox.vue'
import SourceTag from '../SourceTag.vue'

const store = useMainStore()
const s = computed(() => store.scenarios[0])
const rule = computed(() => store.rule)

/** 安全除法：除数非有限或为 0 时返回 0，避免 Infinity 渲染到界面 */
function safeDiv(numerator: number, denominator: number, digits: number): string {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return '0'
  return (numerator / denominator).toFixed(digits)
}

const waterfallOption = computed<EChartsCoreOption>(() => {
  const v = s.value
  if (!v) return {}
  const gross = v.income.grossIncome
  const tax = Math.round(v.tax.annualTax / 12)
  const cost = v.costBreakdown.total
  const net = v.netMonthly
  return {
    tooltip: { trigger: 'axis' },
    grid: GRID,
    xAxis: axisX(['月总收入', '减税', '减成本', '减社保', '月净收入']),
    yAxis: axisY(),
    series: [{
      type: 'bar', data: [
        { value: gross, itemStyle: { color: C.primary } },
        { value: -tax, itemStyle: { color: C.warn } },
        { value: -cost, itemStyle: { color: C.danger } },
        { value: -v.benefit.totalMonthly, itemStyle: { color: C.light } },
        { value: net, itemStyle: { color: C.safe } }
      ],
      barWidth: '40%'
    }]
  }
})

const costPieOption = computed<EChartsCoreOption>(() => {
  const c = s.value?.costs
  if (!c) return {}
  const data = [
    { name: '油费/电费', value: c.fuelCostMonth + c.electricityCostMonth },
    { name: '维护', value: c.maintenanceMonth },
    { name: '保险', value: c.insuranceMonth },
    { name: '通讯', value: c.phoneCostMonth },
    { name: '餐饮', value: c.foodCostMonth },
    { name: '罚款', value: c.trafficFineMonth },
    { name: '折旧', value: c.vehicleDepreciationMonth },
    { name: '其他', value: c.otherCostMonth },
  ].filter(d => d.value > 0)
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: '5%', top: 'center', textStyle: { fontSize: 11, color: '#64748b' } },
    series: [{
      type: 'pie', radius: ['40%', '68%'], center: ['38%', '50%'],
      label: { show: true, fontSize: 11, color: '#475569' },
      data
    }]
  }
})

const yearlyOption = computed<EChartsCoreOption>(() => {
  const v = s.value
  if (!v) return {}
  const factors = [0.93, 0.88, 0.98, 1.03, 1.07, 1.10, 1.13, 1.10, 1.05, 0.97, 0.90, 0.85]
  const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const incomes = factors.map(f => Math.round(v.income.grossIncome * f))
  const costs = factors.map(f => Math.round(v.costBreakdown.total * f))
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['月收入', '运营成本', '净收入'], textStyle: { fontSize: 11, color: '#64748b' } },
    grid: GRID,
    xAxis: axisX(months),
    yAxis: axisY(),
    series: [
      { name: '月收入', type: 'bar', data: incomes, itemStyle: { color: C.primary }, barWidth: '25%' },
      { name: '运营成本', type: 'bar', data: costs, itemStyle: { color: C.warn }, barWidth: '25%' },
      { name: '净收入', type: 'line', data: incomes.map((inc, i) => inc - costs[i] - Math.round(v.tax.annualTax / 12)), smooth: true, lineStyle: { color: C.safe, width: 2 }, itemStyle: { color: C.safe } }
    ]
  }
})
</script>
