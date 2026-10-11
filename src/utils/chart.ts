// 共享 ECharts 基础配置 — 消除各视图重复的轴/网格/配色定义
import type { EChartsOption } from 'echarts'

/** 方案系列色（主色 → 递次淡化） */
export const SERIES_COLORS = ['#0d9488', '#64748b', '#94a3b8', '#cbd5e1']

/** 语义色 */
export const C = {
  primary: '#0d9488',
  warn: '#f59e0b',
  danger: '#ef4444',
  safe: '#059669',
  gray: '#64748b',
  light: '#94a3b8',
} as const

/** 类目轴（x） */
export function axisX(data: (string | number)[]) {
  return {
    type: 'category' as const,
    data,
    axisLabel: { fontSize: 11, color: '#64748b' },
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisTick: { show: false },
  }
}

/** 数值轴（y） */
export function axisY() {
  return {
    type: 'value' as const,
    axisLabel: { fontSize: 11, color: '#94a3b8' },
    splitLine: { lineStyle: { color: '#f1f5f9' } },
  }
}

/** 通用网格 */
export const GRID = { left: '3%', right: '4%', bottom: '3%', containLabel: true } as const

/** 图例统一样式 */
export function legend(data: string[]) {
  return { data, textStyle: { fontSize: 11, color: '#64748b' } }
}

export type { EChartsOption }
