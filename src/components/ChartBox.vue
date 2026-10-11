<template>
  <div class="chart-wrap">
    <div v-if="loading" class="chart-skeleton">
      <div class="sk-bar" v-for="i in 5" :key="i" :style="{ width: (60 + Math.random()*35) + '%', animationDelay: i*0.1 + 's' }" />
    </div>
    <div v-show="!loading" ref="el" class="chart-box" :style="{ height: h + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { EChartsOption } from 'echarts'
import * as echarts from 'echarts'

const props = defineProps<{
  option: EChartsOption
  height?: number
  loading?: boolean
}>()

const el = ref<HTMLElement>()
const h = ref(props.height || 320)
let chart: echarts.ECharts | null = null

function render() {
  if (!el.value || props.loading) return
  if (!chart) {
    chart = echarts.init(el.value, undefined, { renderer: 'canvas' })
  }
  chart.setOption(props.option, true)
}

function resize() { chart?.resize() }

onMounted(() => {
  nextTick(render)
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
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
