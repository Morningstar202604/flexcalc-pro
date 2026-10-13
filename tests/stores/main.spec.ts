/**
 * 主 store 接线回归测试
 *
 * 背景：comparison 计算曾把每个场景的 personal 覆盖为 personal.value 重算，
 * 导致「缴齐社保」场景在排行榜/图表里被按「未参保」重算，与场景卡片
 * （读 scenarios）数值打架。引擎单测全绿也发现不了——缺陷在 store 接线。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { useMainStore } from '../../src/stores/main'
import type { CityRule } from '../../src/types'

const rule = JSON.parse(readFileSync('public/rules/guangzhou.json', 'utf8')) as CityRule

describe('主 store：scenarios 与 comparison 必须对同一场景给出一致数值', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('每个场景在 comparison.scenarios 中的净收入/权益分与 scenarios 一致', () => {
    const store = useMainStore()
    store.rule = rule

    const scenarios = store.scenarios
    const comp = store.comparison
    expect(comp, 'comparison 不应为 null').not.toBeNull()
    expect(comp!.scenarios.length).toBe(scenarios.length)

    for (const s of scenarios) {
      const c = comp!.scenarios.find(x => x.id === s.id)
      expect(c, `对比结果缺少场景 ${s.id}`).toBeTruthy()
      expect(c!.netMonthly, `场景 ${s.id} 月净收入与 scenarios 不一致`).toBeCloseTo(s.netMonthly, 6)
      expect(c!.rightsScore, `场景 ${s.id} 权益分与 scenarios 不一致`).toBe(s.rightsScore)
    }
  })

  it('未参保时提供「缴齐社保」场景，且净收入低于当前方案、权益分更高', () => {
    const store = useMainStore()
    store.rule = rule
    store.personal.hasSocialInsurance = false

    const comp = store.comparison!
    const current = comp.scenarios.find(s => s.id === 'current')!
    const insured = comp.scenarios.find(s => s.id === 'with_insurance')

    expect(insured, '未参保时必须提供「缴齐社保」场景').toBeTruthy()
    expect(insured!.netMonthly).toBeLessThan(current.netMonthly)
    expect(insured!.rightsScore).toBeGreaterThan(current.rightsScore)
  })

  it('已参保时不再提供「缴齐社保」场景', () => {
    const store = useMainStore()
    store.rule = rule
    store.personal.hasSocialInsurance = true

    const comp = store.comparison!
    expect(comp.scenarios.some(s => s.id === 'with_insurance')).toBe(false)
    expect(store.scenarios.some(s => s.id === 'with_insurance')).toBe(false)
  })
})
