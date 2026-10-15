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
import { ensureECharts } from '../utils/echarts'

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
    const { init } = await ensureECharts()
    chart.value = init(el.value, undefined, { renderer: 'canvas' })
  }
  chart.value.setOption(props.option, true)
}

// ResizeObserver 在折叠卡片展开（display:none → block）时也会触发：
// 此时容器首次拿到宽度而 chart 尚未创建，必须补一次 render，
// 否则折叠内的图表展开后永远是空白。
function resize() {
  if (!el.value || el.value.clientWidth === 0) return
  if (!chart.value) { nextTick(render); return }
  chart.value.resize()
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
.sk-bar { height: 12px; border-radius: 3px; background: linear-gradient(90deg, var(--color-bg-tertiary) 0%, var(--color-border-primary) 50%, var(--color-bg-tertiary) 100%); animation: shimmer 1.5s ease-in-out infinite; }
@keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>