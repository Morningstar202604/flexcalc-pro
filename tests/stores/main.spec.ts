/**
 * 主 store 接线回归测试
 *
 * 背景：comparison 计算曾把每个场景的 personal 覆盖为 personal.value 重算，
 * 导致「缴齐社保」场景在排行榜/图表里被按「未参保」重算，与场景卡片
 * （读 scenarios）数值打架。引擎单测全绿也发现不了——缺陷在 store 接线。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
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

describe('主 store：跨字段约束不能让测算静默变空', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('当前年龄被调到超过退休年龄时，退休年龄自动跟随（否则服务层拒绝 → 全页显示 0）', () => {
    const store = useMainStore()
    store.rule = rule
    store.personal.expectedRetireAge = 60
    store.personal.currentAge = 65

    // 服务层的校验是 expectedRetireAge > currentAge；store 必须保证这一点，
    // 否则 scenarios 变空数组，页面显示「正常但全是零」
    expect(store.personal.expectedRetireAge).toBeGreaterThan(store.personal.currentAge)
    expect(store.scenarios.length, '年龄矛盾不得让场景整体消失').toBeGreaterThan(0)
    expect(store.comparison?.best, '对比结果不应为 null').toBeTruthy()
  })

  it('极端年龄（80 岁当前年龄）也不产生空测算', () => {
    const store = useMainStore()
    store.rule = rule
    store.personal.currentAge = 80

    expect(store.personal.expectedRetireAge).toBeGreaterThan(80)
    expect(store.scenarios.length).toBeGreaterThan(0)
  })

  it('从存储恢复出矛盾年龄对时，初始化即修正（watch 不会在赋初值时触发）', async () => {
    // 模拟老版本写入/用户手改的 localStorage：currentAge 70 > expectedRetireAge 60
    const storeMap = new Map<string, string>()
    const original = globalThis.localStorage
    ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => storeMap.get(k) ?? null,
      setItem: (k: string, v: string) => { storeMap.set(k, v) },
      removeItem: (k: string) => { storeMap.delete(k) },
      clear: () => { storeMap.clear() },
      key: () => null,
      get length() { return storeMap.size },
    } as unknown as Storage
    storeMap.set('flexcalc_params_v1', JSON.stringify({
      personal: { currentAge: 70, expectedRetireAge: 60, hasSocialInsurance: false, specialDeductionMonth: 0 },
    }))

    try {
      // 重新载入模块，让 store 在矛盾数据上初始化
      vi.resetModules()
      const { useMainStore: freshStore } = await import('../../src/stores/main')
      setActivePinia(createPinia())
      const store = freshStore()
      store.rule = rule

      expect(store.personal.currentAge).toBe(70)
      expect(store.personal.expectedRetireAge, '恢复矛盾年龄后必须自动修正').toBeGreaterThan(70)
      expect(store.scenarios.length, '初始化即修正，不得让测算为空').toBeGreaterThan(0)
    } finally {
      ;(globalThis as unknown as { localStorage: Storage }).localStorage = original
      vi.resetModules()
    }
  })
})
