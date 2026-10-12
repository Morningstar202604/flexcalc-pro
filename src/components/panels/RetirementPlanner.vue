<template>
  <div>
    <n-card title="退休规划 — 社保缴纳策略与养老金测算" class="card">
      <p class="desc">
        以当前年龄 {{ store.personal.currentAge }} 岁起，测算不同缴费档次下的累计养老金。
        职工养老金 = 基础养老金 + 个人账户养老金。灵活就业者需自缴全部（含统筹部分）。
        年龄可在左侧参数栏「税务与社保」中调整。计发基数取本城口径
        （<b>{{ (store.rule?.retirement.benefitBaseMonthly ?? 0).toLocaleString() }}</b> 元/月），账户收益率
        {{ assumedReturnPct }}% 为假设值，实际由人社部门核算。
      </p>
    </n-card>

    <div class="kpi-row" style="margin-top: 12px">
      <div class="stat">
        <span class="stat-label">60岁预估月养老金</span>
        <span class="stat-value">¥{{ retireResult.totalPension.toLocaleString() }}</span>
        <span class="stat-foot">基础 ¥{{ Math.round(retireResult.basePension).toLocaleString() }} + 个账 ¥{{ Math.round(retireResult.personalPension).toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">个人账户累计</span>
        <span class="stat-value">¥{{ retireResult.personalAccount.toLocaleString() }}</span>
        <span class="stat-foot">{{ assumedReturnPct }}% 年化假设收益率</span>
      </div>
      <div class="stat">
        <span class="stat-label">需缴年限</span>
        <span class="stat-value">{{ (retireResult.months / 12) }}年</span>
        <span class="stat-foot">{{ retireResult.months }}个月</span>
      </div>
      <div class="stat">
        <span class="stat-label">替代率</span>
        <span class="stat-value">{{ replaceRate }}%</span>
        <span class="stat-foot">养老金 / 月收入</span>
      </div>
    </div>

    <n-grid :x-gap="12" cols="2" style="margin-top: 12px">
      <n-gi>
        <n-card title="不同缴费档次养老金对比" class="card">
          <ChartBox :option="tierOption" :height="340" />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="个人账户余额增长曲线" class="card">
          <ChartBox :option="growthOption" :height="340" />
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="12" cols="1 m:2" style="margin-top: 12px">
      <n-gi>
        <n-card title="最低缴15年 vs 缴至退休" class="card">
          <n-table :bordered="false" :single-line="false" size="small">
            <thead><tr><th>缴费年限</th><th>月养老金</th><th>个人账户总额</th><th>回本年限</th></tr></thead>
            <tbody>
              <tr v-for="row in compareYears" :key="row.years">
                <td>缴{{ row.years }}年</td>
                <td class="text-safe">¥{{ row.pension.toLocaleString() }}</td>
                <td>¥{{ row.account.toLocaleString() }}</td>
                <td>{{ row.yearsToBreakEven }}年</td>
              </tr>
            </tbody>
          </n-table>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="决策建议" class="card">
          <ul class="advice-list">
            <li>养老替代率达 40% 才满足基本退休生活。当前方案仅 <b>{{ replaceRate }}%</b>，建议额外自行储蓄。</li>
            <li>以灵活就业缴满 15 年社保，按当前基数约需 <b>{{ Math.round(totalCost / 10000) }}万元</b> 总投入。</li>
            <li>建议配置个人养老金账户（每年 12,000 限额，享税收优惠），作为第三支柱储备。</li>
          </ul>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { NCard, NGrid, NGi, NTable } from 'naive-ui'
import { useMainStore } from '../../stores/main'
import { BenefitEngine } from '../../engine/BenefitEngine'
import { axisX, axisY, GRID, legend, C } from '../../utils/chart'
import ChartBox from '../ChartBox.vue'

const store = useMainStore()
const engine = computed(() => store.rule ? new BenefitEngine(store.rule.benefit, store.rule.retirement) : null)
const assumedReturnPct = computed(() => Math.round((store.rule?.retirement.assumedAnnualReturn ?? 0.05) * 1000) / 10)

const monthlyContribution = computed(() => {
  const base = store.rule?.benefit.pension.baseMin || 5000
  const rate = store.rule?.benefit.pension.rate || 0.2
  return Math.round(base * rate)
})

const retireResult = computed(() => {
  if (!engine.value) return { totalPension: 0, personalAccount: 0, basePension: 0, personalPension: 0, months: 0 }
  return engine.value.projectRetirement(
    store.personal.currentAge, store.personal.expectedRetireAge,
    monthlyContribution.value, 15, store.rule?.retirement.assumedAnnualReturn ?? 0.05
  )
})

const replaceRate = computed(() => {
  const income = store.scenarios[0]?.income.grossIncome || 1
  return (retireResult.value.totalPension / income * 100).toFixed(1)
})

const totalCost = computed(() => retireResult.value.months * monthlyContribution.value)

const tierOption = computed<EChartsOption>(() => {
  if (!engine.value) return {}
  const baseMin = store.rule?.benefit.pension.baseMin || 5000
  const baseMax = store.rule?.benefit.pension.baseMax || 26000
  const rate = store.rule?.benefit.pension.rate || 0.2
  const tiers = [
    { name: '60%档', base: baseMin },
    { name: '80%档', base: (baseMin + baseMax) * 0.4 },
    { name: '100%档', base: (baseMin + baseMax) * 0.5 },
    { name: '150%档', base: (baseMin + baseMax) * 0.75 },
    { name: '200%档', base: baseMax * 0.8 },
  ]
  const annualReturn = store.rule?.retirement.assumedAnnualReturn ?? 0.05
  const contribData = tiers.map(t => Math.round(t.base * rate))
  const pensionData = tiers.map(t => engine.value!.projectRetirement(store.personal.currentAge, store.personal.expectedRetireAge, Math.round(t.base * rate), store.personal.expectedRetireAge - store.personal.currentAge, annualReturn).totalPension)
  return {
    tooltip: { trigger: 'axis' },
    legend: legend(['月养老金', '月缴费额']),
    grid: GRID,
    xAxis: axisX(tiers.map(t => t.name)),
    yAxis: axisY(),
    series: [
      { name: '月缴费额', type: 'bar', data: contribData, itemStyle: { color: C.light }, barWidth: '25%' },
      { name: '月养老金', type: 'line', data: pensionData, smooth: true, lineStyle: { color: C.primary, width: 2 }, itemStyle: { color: C.primary } }
    ]
  }
})

const growthOption = computed<EChartsOption>(() => {
  if (!engine.value) return {}
  const months = (store.personal.expectedRetireAge - store.personal.currentAge) * 12
  const annualReturn = store.rule?.retirement.assumedAnnualReturn ?? 0.05
  const labels: string[] = []
  const data: number[] = []
  let balance = 0
  const m = monthlyContribution.value
  for (let i = 0; i <= months; i += 12) {
    labels.push((store.personal.currentAge + i / 12) + '岁')
    balance = balance * Math.pow(1 + annualReturn, 12) + m * 12
    data.push(Math.round(balance))
  }
  return {
    tooltip: { trigger: 'axis' },
    grid: GRID,
    xAxis: axisX(labels),
    yAxis: axisY(),
    series: [{
      type: 'line', data, smooth: true,
      areaStyle: { color: 'rgba(13,148,136,0.08)' },
      lineStyle: { color: C.primary, width: 2 },
      itemStyle: { color: C.primary }
    }]
  }
})

const compareYears = computed(() => {
  if (!engine.value) return []
  const annualReturn = store.rule?.retirement.assumedAnnualReturn ?? 0.05
  const rate = store.rule?.benefit.pension.rate || 0.2
  const base = store.rule?.benefit.pension.baseMin || 5000
  const monthly = Math.round(base * rate)
  return [15, 20, 25, 30].map(years => {
    const r = engine.value!.projectRetirement(store.personal.currentAge, store.personal.currentAge + years, monthly, years, annualReturn)
    return { years, pension: r.totalPension, account: r.personalAccount, yearsToBreakEven: Math.round((r.personalAccount / (r.totalPension || 1)) / 12) }
  })
})
</script>
