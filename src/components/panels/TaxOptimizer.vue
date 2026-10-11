<template>
  <div>
    <n-card title="税务优化分析 — 劳务报酬 vs 个体工商户" class="card">
      <n-alert type="warning" :show-icon="true" style="margin-bottom: 0">
        灵活就业者个人所得税按劳务报酬累计预扣，实际税率 3%-45%。注册个体工商户可降至约 1%-3.5%。
      </n-alert>
    </n-card>

    <n-grid :x-gap="12" cols="1 m:2" responsive="screen" style="margin-top: 12px">
      <n-gi>
        <n-card title="劳务报酬（当前）" class="card">
          <div class="tax-block">
            <div class="t-row"><span>年收入总额</span><b>¥{{ labor.toLocaleString() }}</b></div>
            <div class="t-row"><span>费用减除 (20%)</span><span>-{{ (labor * 0.2).toFixed(0) }}</span></div>
            <div class="t-row"><span>基本减除</span><span>-60,000</span></div>
            <div class="t-row"><span>专项附加扣除</span><span>-{{ (store.personal.specialDeductionMonth * 12).toLocaleString() }}</span></div>
            <div class="t-row"><span>应纳税所得额</span><b>¥{{ taxableLabor.toLocaleString() }}</b></div>
            <div class="t-row danger"><span>年度个税</span><b>¥{{ laborTax.toLocaleString() }}</b></div>
            <div class="t-row danger"><span>实际税率</span><b>{{ laborRate }}%</b></div>
            <div class="t-row total"><span>全年税后收入</span><b class="ok">¥{{ afterLabor.toLocaleString() }}</b></div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="个体工商户" class="card">
          <div class="tax-block">
            <div class="t-row"><span>年收入总额</span><b>¥{{ soleIncome.toLocaleString() }}</b></div>
            <div class="t-row"><span>核定征收率</span><b>{{ soleRate }}%</b></div>
            <div class="t-row success"><span>年度个税</span><b>¥{{ soleTax.toLocaleString() }}</b></div>
            <div class="t-row success"><span>实际税率</span><b>{{ soleRate }}%</b></div>
            <div class="t-row total"><span>全年税后收入</span><b class="ok">¥{{ afterSole.toLocaleString() }}</b></div>
          </div>
          <n-alert type="success" :show-icon="true" style="margin-top: 10px">
            年节税：¥{{ saving.toLocaleString() }}（省 {{ savingRate }}%）
          </n-alert>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card title="不同收入下的税负对比" class="card" style="margin-top: 12px">
      <ChartBox :option="taxCompareOption" :height="360" />
    </n-card>

    <n-card title="个体工商户注册步骤" class="card" style="margin-top: 12px">
      <n-steps :current="5" size="small">
        <n-step title="准备材料" description="身份证、经营场所证明（或电商网址）、手机号码" />
        <n-step title="线上申请" description="广东政务服务网 → 开办企业一网通" />
        <n-step title="银行开户" description="选择银行预约个体户结算账户" />
        <n-step title="税务登记" description="电子税务局签三方协议，核定税种（增值税1%，个税核定）" />
        <n-step title="定期申报" description="通过电子税务局按季度申报" />
      </n-steps>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EChartsOption } from 'echarts'
import { NCard, NGrid, NGi, NAlert, NSteps, NStep } from 'naive-ui'
import { useMainStore } from '../../stores/main'
import { TaxEngine } from '../../engine/TaxEngine'
import { axisX, axisY, GRID, legend, C } from '../../utils/chart'
import ChartBox from '../ChartBox.vue'

const store = useMainStore()
const soleRate = ref(1.0)

// 复用 TaxEngine（税表来自城市规则文件），不再页面内重复实现税表
const taxEngine = computed(() => store.rule ? new TaxEngine(store.rule.tax) : null)

const labor = computed(() => {
  const s = store.scenarios[0]
  return s ? s.income.grossIncome * 12 : 0
})
const laborTax = computed(() => {
  if (!taxEngine.value) return 0
  return taxEngine.value.calcLaborAnnual(labor.value, store.personal.specialDeductionMonth).annualTax
})
const taxableLabor = computed(() => Math.max(0, labor.value * 0.8 - 60000 - store.personal.specialDeductionMonth * 12))
const laborRate = computed(() => labor.value > 0 ? (laborTax.value / labor.value * 100).toFixed(1) : '0')
const afterLabor = computed(() => labor.value - laborTax.value)

const soleIncome = computed(() => labor.value)
const soleTax = computed(() => Math.round(soleIncome.value * soleRate.value / 100))
const afterSole = computed(() => soleIncome.value - soleTax.value)
const saving = computed(() => Math.max(0, laborTax.value - soleTax.value))
const savingRate = computed(() => laborTax.value > 0 ? (saving.value / laborTax.value * 100).toFixed(0) : '0')

const taxCompareOption = computed<EChartsOption>(() => {
  const incomes = [36000, 50000, 80000, 100000, 120000, 150000, 200000, 300000]
  if (!taxEngine.value) return {}
  const laborTaxes = incomes.map(inc => Math.round(taxEngine.value!.calcLaborAnnual(inc, store.personal.specialDeductionMonth).annualTax))
  const soleTaxes = incomes.map(inc => Math.round(inc * soleRate.value / 100))
  return {
    tooltip: { trigger: 'axis' },
    legend: legend(['劳务报酬税', '个体户核定税']),
    grid: GRID,
    xAxis: axisX(incomes.map(v => (v / 10000).toFixed(0) + '万')),
    yAxis: axisY(),
    series: [
      { name: '劳务报酬税', type: 'line', data: laborTaxes, smooth: true, lineStyle: { color: C.danger, width: 2 }, itemStyle: { color: C.danger } },
      { name: '个体户核定税', type: 'line', data: soleTaxes, smooth: true, lineStyle: { color: C.primary, width: 2 }, itemStyle: { color: C.primary } }
    ]
  }
})
</script>
