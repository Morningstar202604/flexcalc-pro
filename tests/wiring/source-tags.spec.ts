/**
 * 数据溯源接线测试（SourceTag Wiring）
 *
 * 为什么需要：
 * 界面在数字旁挂「依据」chip 时，`<SourceTag source-key="X" />` 里的 X 一旦
 * 拼错或指向本城未定义的键，SourceTag 会按设计静默不渲染——界面不报错、不崩溃，
 * 于是「依据」在评审眼里凭空消失，而没有人会收到任何提示。这是典型的接线缺陷：
 * 每个模块单测全绿，缺陷只存在于「组件里写的键」与「规则文件里的键」之间。
 *
 * 这里把三层契约当成可测对象：
 *   A. 组件里用到的键，必须是某个城市规则里真实存在的键（防拼写/防臆造）；
 *   B. 用到的键必须有中文标签，否则 popover 会退回裸键名；
 *   C. 规则文件里出现的所有键都必须有标签，否则政策溯源页会显示 "medicalTierRate" 这类裸键；
 *   D. 用了 <SourceTag 的文件必须真的 import 了它，否则模板里是一个未注册组件。
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { SOURCE_LABELS } from '../../src/utils/sources'

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

/** 每个 .vue 文件里出现的 source-key（含所在文件名，便于报错定位） */
const USED: Array<{ key: string; file: string }> = VUE_FILES.flatMap(file =>
  [...read(file).matchAll(/source-key="([^"]+)"/g)].map(m => ({ key: m[1], file })),
)

const RULE_FILES = readdirSync('public/rules').filter(f => f.endsWith('.json')).map(f => `public/rules/${f}`)

const RULES: Array<{ file: string; keys: string[] }> = RULE_FILES.map(file => ({
  file,
  keys: Object.keys(JSON.parse(read(file)).sources ?? {}),
}))

const UNION = new Set(RULES.flatMap(r => r.keys))

describe('SourceTag：组件里写死的键必须是规则里真实存在的键', () => {
  it('至少在一个面板上挂了依据（否则本测试形同虚设）', () => {
    expect(USED.length).toBeGreaterThan(0)
  })

  it('每个 source-key 都能在至少一个城市规则里找到', () => {
    for (const { key, file } of USED) {
      expect(UNION.has(key), `${file} 使用了规则里不存在的 source-key="${key}"`).toBe(true)
    }
  })

  it('每个用到的键都有中文标签（否则 popover 退回裸键名）', () => {
    for (const { key, file } of USED) {
      expect(SOURCE_LABELS[key], `${file} 的 source-key="${key}" 缺少 SOURCE_LABELS 标签`).toBeTruthy()
    }
  })
})

describe('SOURCE_LABELS：必须覆盖所有规则文件里出现的键', () => {
  it('规则里每个键都有标签（否则政策溯源页显示裸键名）', () => {
    for (const { file, keys } of RULES) {
      for (const k of keys) {
        expect(SOURCE_LABELS[k], `${file} 的键 "${k}" 在 SOURCE_LABELS 里没有标签`).toBeTruthy()
      }
    }
  })

  it('每个规则文件都含 sources 且非空（溯源能力被掏空会在这里暴露）', () => {
    for (const { file, keys } of RULES) {
      expect(keys.length, `${file} 的 sources 为空`).toBeGreaterThan(0)
    }
  })
})

describe('SourceTag：用到它的文件必须真的 import 了它', () => {
  it('每个含 <SourceTag 的文件都有 import SourceTag', () => {
    for (const file of VUE_FILES) {
      const src = read(file)
      if (!/<SourceTag\b/.test(src)) continue
      expect(src, `${file} 用了 <SourceTag> 但没有 import`).toMatch(/import\s+SourceTag\s+from/)
    }
  })
})

describe('政策溯源页与 chip 共用同一份标签映射', () => {
  it('PolicyView 不再自带一份 FIELD_LABELS 字面量', () => {
    const policy = read('src/views/PolicyView.vue')
    // 直接复用 SOURCE_LABELS，避免两处映射各自漂移
    expect(policy).toMatch(/SOURCE_LABELS/)
    expect(policy).not.toMatch(/const\s+FIELD_LABELS\s*:\s*Record<string,\s*string>\s*=\s*\{/)
  })
})
