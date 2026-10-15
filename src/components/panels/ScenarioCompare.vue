<template>
  <div>
    <n-card title="多场景对比实验室" class="card">
      <template #header-extra>
        <n-space>
          <n-button size="small" @click="openAdd">+ 添加自定义方案</n-button>
        </n-space>
      </template>
      <p class="desc">
        基于当前参数一键生成变体方案，也可添加自定义方案（工时、单量可独立调整），横向对比月净收入与权益保障。
      </p>
    </n-card>

    <n-grid :x-gap="12" cols="1 s:2 m:3" responsive="screen" style="margin-top: 12px">
      <n-gi v-for="s in store.scenarios" :key="s.id">
        <n-card class="sc-card" :class="{ 'sc-best': s.id === store.comparison?.best?.id }">
          <template #header>
            <div class="sc-head">
              <span class="sc-name">{{ s.name }}</span>
              <n-tag v-if="s.id === store.comparison?.best?.id" type="success" size="small" :bordered="false">最优</n-tag>
            </div>
          </template>
          <div class="sc-net">¥{{ s.netMonthly.toLocaleString() }}<small>/月</small></div>
          <div class="sc-grid">
            <div><span>日工时</span><b>{{ s.work.dailyHours }}h</b></div>
            <div><span>日单量</span><b>{{ s.work.dailyOrders }}单</b></div>
            <div><span>油电费</span><b>¥{{ s.costs.fuelCostMonth + s.costs.electricityCostMonth }}</b></div>
            <div><span>税率</span><b>{{ s.tax.effectiveRate }}%</b></div>
            <div><span>权益评分</span><b :class="`score-${scoreTier(s.rightsScore)}`">{{ s.rightsScore }}</b></div>
            <div><span>评级</span><b>{{ s.recommendation === 'recommended' ? '推荐' : s.recommendation === 'viable' ? '可行' : '有风险' }}</b></div>
          </div>
          <template #action>
            <n-button text type="error" size="small" @click="store.removeScenario(s.id)" v-if="s.id.startsWith('custom_')">删除方案</n-button>
          </template>
        </n-card>
      </n-gi>
    </n-grid>

    <FoldCard
      title="方案净收入对比"
      :summary="store.comparison?.best ? `最优「${store.comparison.best.name}」` : '暂无方案'"
      style="margin-top: 12px"
    >
      <ChartBox :option="compareOption" :height="320" />
    </FoldCard>

    <!-- 自定义方案 -->
    <n-modal v-model:show="showAdd" preset="card" title="添加自定义方案" style="width: 420px">
      <div class="add-form">
        <div class="form-item">
          <label>方案名称</label>
          <n-input v-model:value="draft.name" placeholder="如：周末双休方案" />
        </div>
        <div class="form-item">
          <label>日均工时 <b>{{ draft.dailyHours }}h</b></label>
          <n-slider v-model:value="draft.dailyHours" :min="4" :max="14" :step="1" />
        </div>
        <div class="form-item">
          <label>日均接单 <b>{{ draft.dailyOrders }}单</b></label>
          <n-slider v-model:value="draft.dailyOrders" :min="10" :max="80" :step="5" />
        </div>
        <p class="add-note">其余参数沿用当前左侧设置，成本与社保不变。</p>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button size="small" @click="showAdd = false">取消</n-button>
          <n-button size="small" type="primary" @click="confirmAdd">添加方案</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { EChartsCoreOption } from 'echarts/core'
import { NCard, NGrid, NGi, NTag, NSpace, NButton, NModal, NInput, NSlider } from 'naive-ui'
import { useMainStore } from '../../stores/main'
import { axisX, axisY, GRID, chartColors } from '../../utils/chart'
import { scoreTier } from '../../utils/score'
import ChartBox from '../ChartBox.vue'
import FoldCard from '../FoldCard.vue'

const store = useMainStore()

const compareOption = computed<EChartsCoreOption>(() => {
  void store.isDark // 主题依赖：浅深切换后重算配色
  const comp = store.comparison
  if (!comp) return {}
  const P = chartColors()
  return {
    tooltip: { trigger: 'axis' },
    grid: GRID,
    xAxis: axisX(comp.scenarios.map(s => s.name), P),
    yAxis: axisY(P),
    series: [
      { name: '月净收入', type: 'bar', data: comp.scenarios.map((s, i) => ({ value: s.netMonthly, itemStyle: { color: P.series[i] || P.light } })), barWidth: '35%' },
    ]
  }
})

const showAdd = ref(false)
const draft = reactive({ name: '', dailyHours: 10, dailyOrders: 35 })

function openAdd() {
  draft.name = ''
  draft.dailyHours = store.work.dailyHours
  draft.dailyOrders = store.work.dailyOrders
  showAdd.value = true
}

function confirmAdd() {
  const name = draft.name.trim() || `自定义方案${store.customPlans.length + 1}`
  store.addScenario(name, { ...store.work, dailyHours: draft.dailyHours, dailyOrders: draft.dailyOrders }, { ...store.costs })
  showAdd.value = false
}
</script>

<style scoped>
.sc-card {
  background: var(--color-bg-primary) !important;
  border: 1px solid var(--color-border-primary) !important;
}
.sc-best {
  border-color: var(--color-text-brand) !important;
}
.sc-head { display: flex; justify-content: space-between; align-items: center; }
.sc-name { font-weight: 600; color: var(--color-text-primary); font-size: 14px; }
.sc-net {
  font-size: 22px; font-weight: 700; color: var(--color-text-brand);
  padding: 6px 0 12px;
}
.sc-net small { font-size: 12px; font-weight: 400; color: var(--color-text-tertiary); margin-left: 2px; }
.sc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}
.sc-grid > div {
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid var(--color-bg-tertiary);
}
.sc-grid span { font-size: 11px; color: var(--color-text-tertiary); }
.sc-grid b { font-size: 12px; color: var(--color-text-primary); font-weight: 600; }
.score-good { color: var(--color-text-success); }
.score-mid { color: var(--color-text-warning); }
.score-bad { color: var(--color-text-danger); }

.add-form { display: flex; flex-direction: column; gap: 14px; }
.form-item label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; display: flex; justify-content: space-between; margin-bottom: 4px; }
.form-item label b { color: var(--color-text-primary); }
.add-note { font-size: 11px; color: var(--color-text-tertiary); margin: 0; }
</style>
