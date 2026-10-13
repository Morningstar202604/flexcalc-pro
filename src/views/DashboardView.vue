<template>
  <div class="dashboard">
    <!-- KPI Row -->
    <div class="kpi-row">
      <div class="stat">
        <span class="stat-label">月净收入</span>
        <span class="stat-value">¥{{ bestNetMonthly.toLocaleString() }}</span>
        <span class="stat-foot">{{ store.comparison?.best?.name || '—' }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">年净收入</span>
        <span class="stat-value">¥{{ bestNetAnnual.toLocaleString() }}</span>
        <span class="stat-foot">含成本扣除</span>
      </div>
      <div class="stat">
        <span class="stat-label">有效时薪</span>
        <span class="stat-value">¥{{ bestHourly }}</span>
        <span class="stat-foot">{{ store.comparison?.best?.work.dailyHours || 0 }}h/天</span>
      </div>
      <div class="stat">
        <span class="stat-label">权益评分</span>
        <span class="stat-value" :class="rightsScoreClass">{{ rightsScore }}/100</span>
        <span class="stat-foot">{{ rightsLevel }}</span>
      </div>
    </div>

    <!-- Rights Score Card -->
    <n-card title="权益保障评估" class="card" style="margin-top: 12px">
      <div class="rights-row">
        <div class="rights-score-box">
          <div class="rs-label">权益保护评分</div>
          <div class="rs-value" :class="rightsScoreClass">{{ rightsScore }}/100</div>
          <div class="rs-bar">
            <div class="rs-bar-fill" :style="{ width: rightsScore + '%', background: barColor }"></div>
          </div>
          <div class="rs-level">{{ rightsLevel }}</div>
        </div>
        <div class="rights-flags">
          <div class="rf-title">保障缺口</div>
          <div class="rf-list">
            <div v-for="(flag, i) in rightsFlags" :key="i" class="rf-item">
              <span class="rf-dot"></span>{{ flag }}
            </div>
          </div>
          <n-button size="small" @click="router.push('/rights')" ghost style="margin-top:8px">前往权益护航 →</n-button>
        </div>
      </div>
    </n-card>

    <!-- Charts Row -->
    <n-grid :x-gap="12" cols="1 m:2" responsive="screen" style="margin-top: 12px">
      <n-gi>
        <n-card title="各方案净收入对比" class="card">
          <ChartBox :option="barOption" :height="300" />
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="收支结构分析" class="card">
          <ChartBox :option="pieOption" :height="300" />
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Insights + Ranking -->
    <n-grid :x-gap="12" cols="1 m:3" responsive="screen" style="margin-top: 12px">
      <n-gi :span="1">
        <n-card title="决策洞察" class="card">
          <ul class="insight-list">
            <li v-for="(insight, i) in insights" :key="i">{{ insight }}</li>
          </ul>
          <n-empty v-if="!insights.length" description="调整参数后生成决策建议" style="padding: 20px 0" />
        </n-card>
      </n-gi>
      <n-gi :span="2">
        <n-card title="方案排行榜" class="card">
          <n-data-table :data="rankedScenarios" :columns="rankCols" :bordered="false" :single-line="false" size="small" />
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { EChartsCoreOption } from 'echarts/core'
import { NCard, NGrid, NGi, NEmpty, NDataTable, NButton, type DataTableColumns } from 'naive-ui'
import { useMainStore } from '../stores/main'
import { axisX, axisY, GRID, SERIES_COLORS, C } from '../utils/chart'
import { scoreTier, scoreLevel, TIER_COLORS } from '../utils/score'
import ChartBox from '../components/ChartBox.vue'

const router = useRouter()
const store = useMainStore()

const bestNetMonthly = computed(() => store.comparison?.best?.netMonthly || 0)
const bestNetAnnual = computed(() => store.comparison?.best?.netAnnual || 0)
const bestHourly = computed(() => store.comparison?.best?.netHourly.toFixed(1) || '0')

// 统一权益评分（越高越好）
const bestScenario = computed(() => store.comparison?.best)
const rightsScore = computed(() => bestScenario.value?.rightsScore ?? 0)
const rightsFlags = computed(() => bestScenario.value?.rightsFlags || [])
const rightsLevel = computed(() => scoreLevel(rightsScore.value))
const rightsScoreClass = computed(() => ({ good: 'text-safe', mid: 'text-warn', bad: 'text-danger' })[scoreTier(rightsScore.value)])
const barColor = computed(() => TIER_COLORS[scoreTier(rightsScore.value)])

const insights = computed(() => store.comparison?.best?.keyInsights || [])

interface RankRow { rank: number; name: string; netAnnual: number; netMonthly: number; rights: number; tag: string }
const rankedScenarios = computed<RankRow[]>(() => {
  const comp = store.comparison
  if (!comp) return []
  return comp.ranking.map((r, i) => {
    const s = comp.scenarios.find(sc => sc.id === r.id)
    return { rank: i + 1, name: r.label, netAnnual: r.netAnnual, netMonthly: s?.netMonthly || 0, rights: s?.rightsScore || 0, tag: s?.recommendation || 'viable' }
  })
})

const rankCols: DataTableColumns<RankRow> = [
  { title: '#', key: 'rank', width: 48, align: 'center' },
  { title: '方案', key: 'name' },
  { title: '年净收入', key: 'netAnnual', align: 'right', render: (row) => '¥' + row.netAnnual.toLocaleString() },
  { title: '月净收入', key: 'netMonthly', align: 'right', render: (row) => '¥' + row.netMonthly.toLocaleString() },
  { title: '权益', key: 'rights', width: 60, align: 'center' },
  { title: '评级', key: 'tag', width: 72, align: 'center', render: (row) => row.tag === 'recommended' ? '推荐' : row.tag === 'viable' ? '可行' : '有风险' },
]

const barOption = computed<EChartsCoreOption>(() => {
  const comp = store.comparison
  if (!comp) return {}
  return {
    tooltip: { trigger: 'axis' },
    grid: { ...GRID, bottom: '14%' },
    xAxis: axisX(comp.ranking.map(r => r.label)),
    yAxis: axisY(),
    series: [{
      type: 'bar',
      data: comp.ranking.map((r, i) => ({ value: r.netAnnual, itemStyle: { color: SERIES_COLORS[i] || '#cbd5e1' } })),
      barWidth: '45%',
    }]
  }
})

const pieOption = computed<EChartsCoreOption>(() => {
  const best = store.comparison?.best
  if (!best) return {}
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: '5%', top: 'center', textStyle: { fontSize: 11, color: '#64748b' } },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['38%', '50%'], avoidLabelOverlap: false,
      label: { show: true, fontSize: 11 },
      data: [
        { value: best.netMonthly, name: '实得净收入', itemStyle: { color: C.primary } },
        { value: best.costBreakdown.total, name: '运营成本', itemStyle: { color: C.warn } },
        { value: Math.round(best.tax.annualTax / 12), name: '个税', itemStyle: { color: C.gray } },
        { value: best.benefit.totalMonthly, name: '社保', itemStyle: { color: C.light } }
      ]
    }]
  }
})
</script>

<style scoped>
/* Rights Score */
.rights-row { display: flex; gap: 12px; align-items: stretch; }
.rights-score-box {
  width: 160px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  padding: 12px;
  border-right: 1px solid #e2e8f0;
}
.rs-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
.rs-value { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1.2; margin: 4px 0; }
.rs-bar { width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin: 4px 0; }
.rs-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
.rs-level { font-size: 12px; color: #64748b; margin-top: 2px; }
.rights-flags { flex: 1; display: flex; flex-direction: column; }
.rf-title { font-size: 11px; font-weight: 600; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.rf-list { flex: 1; display: flex; flex-direction: column; gap: 3px; max-height: 120px; overflow-y: auto; }
.rf-item { font-size: 12px; color: #64748b; line-height: 1.5; display: flex; align-items: flex-start; gap: 6px; }
.rf-dot { width: 4px; height: 4px; border-radius: 50%; background: #d97706; flex-shrink: 0; margin-top: 7px; }
</style>
