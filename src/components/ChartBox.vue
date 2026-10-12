<template>
  <div class="chart-wrap">
    <div v-if="loading" class="chart-skeleton">
      <div class="sk-bar" v-for="i in 5" :key="i" :style="{ width: (60 + Math.random()*35) + '%', animationDelay: i*0.1 + 's' }" />
    </div>
    <div v-show="!loading" ref="el" class="chart-box" :style="{ height: h + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts'

const props = defineProps<{
  option: EChartsOption
  height?: number
  loading?: boolean
}>()

const el = ref<HTMLElement>()
const h = computed(() => props.height || 320)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function render() {
  // 容器被 tab 隐藏或侧栏折叠时宽度为 0，此时 init 会得到 0×0 canvas 且不再自愈
  if (!el.value || props.loading || el.value.clientWidth === 0) return
  if (!chart) {
    chart = echarts.init(el.value, undefined, { renderer: 'canvas' })
  }
  chart.setOption(props.option, true)
}

function resize() {
  if (!el.value || el.value.clientWidth === 0) return
  chart?.resize()
}

onMounted(() => {
  nextTick(render)
  // 侧栏折叠不是 window resize 事件，只靠 window 监听会漏；容器尺寸变化才是准确信号
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
  chart?.dispose()
  chart = null
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
