<template>
  <div class="chart-wrap">
    <div v-if="loading" class="chart-skeleton">
      <div class="sk-bar" v-for="i in 5" :key="i" :style="{ width: (60 + Math.random()*35) + '%', animationDelay: i*0.1 + 's' }" />
    </div>
    <div v-show="!loading" ref="el" class="chart-box" :style="{ height: h + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed, shallowRef } from 'vue'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart, HeatmapChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent,
  DatasetComponent,
  ToolboxComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent
} from 'echarts/components'

// 仅注册实际使用的图表与组件（按需引入，显著减小包体积）
use([
  CanvasRenderer,
  BarChart, LineChart, PieChart, ScatterChart, HeatmapChart,
  TitleComponent, TooltipComponent, LegendComponent,
  GridComponent, VisualMapComponent, DatasetComponent,
  ToolboxComponent, DataZoomComponent, DataZoomInsideComponent, DataZoomSliderComponent
])

// 惰性导入 echarts init 函数，避免打包时引入完整库
let initCharts: typeof import('echarts/core').init | null = null
async function getInit(): Promise<typeof import('echarts/core').init> {
  if (!initCharts) {
    const mod = await import('echarts/core')
    initCharts = mod.init
  }
  return initCharts
}

const props = defineProps<{
  option: EChartsCoreOption
  height?: number
  loading?: boolean
}>()

const el = ref<HTMLElement>()
const h = computed(() => props.height || 320)
const chart = shallowRef<EChartsType | null>(null)
let ro: ResizeObserver | null = null

async function render() {
  if (!el.value || props.loading || el.value.clientWidth === 0) return
  if (!chart.value) {
    const init = await getInit()
    chart.value = init(el.value, undefined, { renderer: 'canvas' })
  }
  chart.value.setOption(props.option, true)
}

function resize() {
  if (!el.value || el.value.clientWidth === 0) return
  chart.value?.resize()
}

onMounted(() => {
  nextTick(render)
  if (typeof ResizeObserver !== 'undefined' && el.value) {
    ro = new ResizeObserver(resize)
    ro.observe(el.value)
  }
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  ro?.disconnect()
  ro = null
  chart.value?.dispose()
  chart.value = null
})

watch(() => props.option, () => nextTick(render))
watch(() => props.loading, (loading) => { if (!loading) nextTick(render) })
</script>

<style scoped>
.chart-wrap { position: relative; width: 100%; }
.chart-box { width: 100%; }
.chart-skeleton { display: flex; flex-direction: column; gap: 14px; padding: 10px 0; height: 100%; }
.sk-bar { height: 12px; border-radius: 3px; background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%); animation: shimmer 1.5s ease-in-out infinite; }
@keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>