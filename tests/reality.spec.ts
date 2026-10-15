/**
 * 现实核查层测试
 *
 * 测三件事：
 * 1. 数据纪律：每条事实必须有证据等级；law/official 必须有出处；experience 必须有自验方法——
 *    这是"不把经验冒充事实"的机器化门禁，防止后续加条目时把无出处的断言写成事实。
 * 2. 广告口径换算的纯函数行为（二分求解、不可达判定、强度配比）。
 * 3. 接线：.vue 里引用的 fact id 必须真实存在；用了 <RealityList> 的文件必须 import。
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import {
  REALITY_FACTS,
  EVIDENCE_LABELS,
  REALITY_CATEGORY_ORDER,
  REALITY_CATEGORY_LABELS,
  realityFactsBy,
  solveAdClaim,
} from '../src/utils/reality'

const read = (p: string) => readFileSync(p, 'utf8')

function walkVue(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`
    if (e.isDirectory()) out.push(...walkVue(full))
    else if (e.name.endsWith('.vue')) out.push(full)
  }
  return out
}

const VUE_FILES = [...walkVue('src/components'), ...walkVue('src/views'), ...walkVue('src/layouts')]

describe('现实核查数据纪律', () => {
  it('id 唯一，且每条都有标题与正文', () => {
    const ids = REALITY_FACTS.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of REALITY_FACTS) {
      expect(f.title.length, `${f.id} 缺标题`).toBeGreaterThan(0)
      expect(f.detail.length, `${f.id} 缺正文`).toBeGreaterThan(20)
    }
  })

  it('每条都有合法证据等级与中文标签', () => {
    for (const f of REALITY_FACTS) {
      expect(EVIDENCE_LABELS[f.evidence], `${f.id} 证据等级非法: ${f.evidence}`).toBeTruthy()
    }
  })

  it('law / official / media 条目必须给出依据出处', () => {
    const strict = REALITY_FACTS.filter(f => f.evidence === 'law' || f.evidence === 'official' || f.evidence === 'media')
    expect(strict.length).toBeGreaterThan(0)
    for (const f of strict) {
      expect(f.source, `${f.id} 是 ${f.evidence} 级别但没有 source`).toBeTruthy()
    }
  })

  it('experience 条目必须给出自验方法（不得把经验冒充事实）', () => {
    const exp = REALITY_FACTS.filter(f => f.evidence === 'experience')
    expect(exp.length).toBeGreaterThan(0)
    for (const f of exp) {
      expect(f.verify, `${f.id} 是经验条目但没有 verify 自验方法`).toBeTruthy()
    }
  })

  it('四个分类都有标签且至少各有一条事实', () => {
    for (const c of REALITY_CATEGORY_ORDER) {
      expect(REALITY_CATEGORY_LABELS[c], `分类 ${c} 缺标签`).toBeTruthy()
      expect(REALITY_FACTS.filter(f => f.category === c).length, `分类 ${c} 没有条目`).toBeGreaterThan(0)
    }
  })

  it('realityFactsBy 过滤不存在的 id，返回顺序与入参一致', () => {
    const got = realityFactsBy(['limitation-clock', 'no-such-id', 'enforcement'])
    expect(got.map(f => f.id)).toEqual(['limitation-clock', 'enforcement'])
  })

  it('links 若存在必须是 http(s) 全地址且标题非空', () => {
    for (const f of REALITY_FACTS) {
      for (const l of f.links ?? []) {
        expect(l.title.length, `${f.id} 的链接缺标题`).toBeGreaterThan(0)
        expect(l.url, `${f.id} 的链接不是 http(s) 全地址: ${l.url}`).toMatch(/^https?:\/\/[^\s]+$/)
      }
    }
  })
})

describe('solveAdClaim 广告口径换算', () => {
  it('线性收入下求到最小达标单量，工时按同强度等比例放大', () => {
    const r = solveAdClaim({
      targetNetMonthly: 7000,
      currentOrdersPerDay: 35,
      currentHoursPerDay: 10,
      netAt: (o) => o * 100,
      maxHoursPerDay: 24,
    })
    expect(r).not.toBeNull()
    expect(r!.ordersPerDay).toBe(70)
    expect(r!.hoursPerDay).toBe(20)
    expect(r!.intensityRatio).toBe(2)
  })

  it('目标低于当前净收入时建议的单量低于当前（不出现负增量）', () => {
    const r = solveAdClaim({
      targetNetMonthly: 3000,
      currentOrdersPerDay: 35,
      currentHoursPerDay: 10,
      netAt: (o) => 100 * o,
    })
    expect(r!.ordersPerDay).toBe(30)
    expect(r!.hoursPerDay).toBeCloseTo(8.6, 1)
  })

  it('工时上限内不可达时返回 null（广告数字另有来源）', () => {
    // 35单/10h，工时封顶 16h → 单量上限 56；目标 6000 需要 60 单 → 不可达
    const r = solveAdClaim({
      targetNetMonthly: 6000,
      currentOrdersPerDay: 35,
      currentHoursPerDay: 10,
      netAt: (o) => 100 * o,
      maxHoursPerDay: 16,
    })
    expect(r).toBeNull()
  })

  it('非法输入返回 null 而不是抛错', () => {
    expect(solveAdClaim({ targetNetMonthly: 0, currentOrdersPerDay: 35, currentHoursPerDay: 10, netAt: () => 999 })).toBeNull()
    expect(solveAdClaim({ targetNetMonthly: 9000, currentOrdersPerDay: 0, currentHoursPerDay: 10, netAt: () => 999 })).toBeNull()
    expect(solveAdClaim({ targetNetMonthly: 9000, currentOrdersPerDay: 35, currentHoursPerDay: 0, netAt: () => 999 })).toBeNull()
  })

  it('恰好达标时返回当前单量', () => {
    const r = solveAdClaim({
      targetNetMonthly: 3500,
      currentOrdersPerDay: 35,
      currentHoursPerDay: 10,
      netAt: (o) => o * 100,
    })
    expect(r!.ordersPerDay).toBe(35)
  })
})

describe('现实核查接线', () => {
  it('每个 .vue 里 realityFactsBy([...]) 引用的 id 都必须存在', () => {
    const all = new Set(REALITY_FACTS.map(f => f.id))
    for (const file of VUE_FILES) {
      const src = read(file)
      for (const m of src.matchAll(/realityFactsBy\(\s*\[([\s\S]*?)\]\s*\)/g)) {
        const ids = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])
        for (const id of ids) {
          expect(all.has(id), `${file} 引用了不存在的现实核查 id: ${id}`).toBe(true)
        }
      }
    }
  })

  it('用了 <RealityList 的文件必须 import 它', () => {
    for (const file of VUE_FILES) {
      const src = read(file)
      if (!/<RealityList\b/.test(src)) continue
      expect(src, `${file} 用了 <RealityList> 但没有 import`).toMatch(/import\s+RealityList\s+from/)
    }
  })

  it('PolicyView 的现实与口径页把全部事实都挂出来了（新条目不允许只躺在数据文件里）', () => {
    const policy = read('src/views/PolicyView.vue')
    expect(policy).toMatch(/REALITY_FACTS/)
    expect(policy).toMatch(/REALITY_CATEGORY_ORDER/)
  })

  it('至少有一个面板使用了 RealityList（否则本测试形同虚设）', () => {
    const users = VUE_FILES.filter(f => /<RealityList\b/.test(read(f)))
    expect(users.length).toBeGreaterThanOrEqual(3)
  })
})
