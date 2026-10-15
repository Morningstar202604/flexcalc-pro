/**
 * 图表主题化测试
 *
 * 用例全部注入显式色板（不依赖真实 DOM）：
 * - chartColors() 在无 document 环境返回回退色板（浅色口径），字段齐全；
 * - axisX/axisY/legend 应用传入色板而不是写死颜色——这是"深浅主题自动适配"的机制保证。
 */

import { describe, it, expect } from 'vitest'
import { axisX, axisY, legend, chartColors, type ChartColors } from '../src/utils/chart'

const SENTINEL: ChartColors = {
  primary: '#111111',
  warn: '#222222',
  danger: '#333333',
  safe: '#444444',
  gray: '#555555',
  light: '#666666',
  axisLabel: '#777777',
  axisLine: '#888888',
  splitLine: '#999999',
  legendText: '#aaaaaa',
  areaSoft: 'rgba(1,1,1,0.1)',
  series: ['#111111', '#555555', '#666666', '#888888'],
}

describe('chartColors 回退', () => {
  it('无 DOM 环境返回完整回退色板', () => {
    const c = chartColors()
    expect(c.series.length).toBe(4)
    for (const v of [c.primary, c.warn, c.danger, c.safe, c.gray, c.light, c.axisLabel, c.axisLine, c.splitLine, c.legendText, c.areaSoft]) {
      expect(typeof v).toBe('string')
      expect(v.length).toBeGreaterThan(0)
    }
  })
})

describe('轴与图例应用注入色板', () => {
  it('axisX 的标签与轴线色来自色板', () => {
    const x = axisX(['a', 'b'], SENTINEL)
    expect(x.axisLabel.color).toBe(SENTINEL.axisLabel)
    expect(x.axisLine.lineStyle.color).toBe(SENTINEL.axisLine)
  })

  it('axisY 的标签与分隔线色来自色板', () => {
    const y = axisY(SENTINEL)
    expect(y.axisLabel.color).toBe(SENTINEL.axisLabel)
    expect(y.splitLine.lineStyle.color).toBe(SENTINEL.splitLine)
  })

  it('legend 的文字色来自色板', () => {
    const l = legend(['A', 'B'], SENTINEL)
    expect(l.textStyle.color).toBe(SENTINEL.legendText)
  })
})
