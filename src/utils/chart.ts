// 共享 ECharts 基础配置 — 颜色全部从设计 token（CSS 变量）读取，深浅主题自动适配。
//
// 用法要点：在组件的 computed 里先 `void store.isDark` 再调用 chartColors()/axisX() 等，
// 让计算属性依赖主题信号——切换主题时 options 重算、ChartBox 的 watch 触发重绘。
// 直接写死 hex 会让深色主题出现"深底 + 浅灰网格线/浅色主题品牌色"的错配。
import type { EChartsCoreOption } from 'echarts/core'

export interface ChartColors {
  primary: string
  warn: string
  danger: string
  safe: string
  gray: string
  light: string
  axisLabel: string
  axisLine: string
  splitLine: string
  legendText: string
  /** 面积图的浅色填充（品牌色微透明） */
  areaSoft: string
  /** 系列配色（主色 → 递次淡化） */
  series: string[]
}

/** 无 DOM（单测）或 token 缺失时的回退值（浅色口径） */
const FALLBACK: ChartColors = {
  primary: '#0d9488',
  warn: '#f59e0b',
  danger: '#ef4444',
  safe: '#059669',
  gray: '#64748b',
  light: '#94a3b8',
  axisLabel: '#64748b',
  axisLine: '#e2e8f0',
  splitLine: '#f1f5f9',
  legendText: '#64748b',
  areaSoft: 'rgba(13,148,136,0.08)',
  series: ['#0d9488', '#64748b', '#94a3b8', '#cbd5e1'],
}

export function chartColors(): ChartColors {
  if (typeof document === 'undefined') return { ...FALLBACK, series: [...FALLBACK.series] }
  const read = (name: string, fb: string) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    return v || fb
  }
  const primary = read('--color-primary-500', FALLBACK.primary)
  const gray = read('--color-text-secondary', FALLBACK.gray)
  const light = read('--color-text-tertiary', FALLBACK.light)
  return {
    primary,
    warn: read('--color-warning-500', FALLBACK.warn),
    danger: read('--color-danger-500', FALLBACK.danger),
    safe: read('--color-success-600', FALLBACK.safe),
    gray,
    light,
    axisLabel: read('--color-text-secondary', FALLBACK.axisLabel),
    axisLine: read('--color-border-primary', FALLBACK.axisLine),
    splitLine: read('--color-bg-tertiary', FALLBACK.splitLine),
    legendText: read('--color-text-secondary', FALLBACK.legendText),
    areaSoft: read('--color-bg-brand-light', FALLBACK.areaSoft),
    series: [primary, gray, light, read('--color-border-secondary', '#cbd5e1')],
  }
}

/** 类目轴（x） */
export function axisX(data: (string | number)[], c: ChartColors = chartColors()) {
  return {
    type: 'category' as const,
    data,
    axisLabel: { fontSize: 11, color: c.axisLabel },
    axisLine: { lineStyle: { color: c.axisLine } },
    axisTick: { show: false },
  }
}

/** 数值轴（y） */
export function axisY(c: ChartColors = chartColors()) {
  return {
    type: 'value' as const,
    axisLabel: { fontSize: 11, color: c.axisLabel },
    splitLine: { lineStyle: { color: c.splitLine } },
  }
}

/** 通用网格 */
export const GRID = { left: '3%', right: '4%', bottom: '3%', containLabel: true } as const

/** 图例统一样式 */
export function legend(data: string[], c: ChartColors = chartColors()) {
  return { data, textStyle: { fontSize: 11, color: c.legendText } }
}

export type { EChartsCoreOption }
