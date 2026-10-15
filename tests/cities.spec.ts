/**
 * 城市规则完整性测试（多城市支持）
 *
 * 本项目对"数据诚实"有硬要求：每个外源性数字必须带 confidence 与 note。
 * 新增城市时最容易出的两类事故，这里都拦得住：
 *   A. 规则文件缺 sources / 某个来源缺 confidence → 界面上的「依据」chip 会静默消失；
 *   B. 城市注册表（地图用）与 public/rules 目录不同步 → 地图点选后加载失败、界面空白。
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { CITY_REGISTRY, provinceCoverage } from '../src/data/cities'
import type { CityRule } from '../src/types'

const RULE_FILES = readdirSync('public/rules').filter(f => f.endsWith('.json'))
const RULES = RULE_FILES.map(f => ({
  file: f,
  rule: JSON.parse(readFileSync(`public/rules/${f}`, 'utf8')) as CityRule,
}))

describe('城市规则文件基础完整性', () => {
  it('规则文件名与 city 字段一致（防止复制粘贴后忘记改 city）', () => {
    for (const { file, rule } of RULES) {
      expect(rule.city, `${file} 的 city 字段是 ${rule.city}`).toBe(file.replace('.json', ''))
    }
  })

  it('每个规则都必需字段齐全且数值合法', () => {
    for (const { file, rule } of RULES) {
      expect(rule.cityName.length, `${file} 缺 cityName`).toBeGreaterThan(0)
      expect(rule.income.basePricePerOrder, `${file} 单价异常`).toBeGreaterThan(0)
      expect(rule.benefit.pension.baseMin, `${file} 养老基数下限异常`).toBeGreaterThan(0)
      expect(rule.benefit.pension.baseMax, `${file} 养老基数上限异常`).toBeGreaterThan(rule.benefit.pension.baseMin)
      expect(rule.benefit.medical.baseMin, `${file} 医保基数下限异常`).toBeGreaterThan(0)
      expect(rule.minimumWage.monthly, `${file} 最低工资异常`).toBeGreaterThan(0)
      expect(rule.retirement.benefitBaseMonthly, `${file} 计发基数异常`).toBeGreaterThan(0)
      expect(rule.tax.laborRemuneration.taxTable.length, `${file} 税率表为空`).toBeGreaterThan(0)
    }
  })

  it('每个人身险费率在 (0,1) 区间内（防止误填 8 而不是 0.08）', () => {
    for (const { file, rule } of RULES) {
      const pr = rule.benefit.pension.rate
      const mr = rule.benefit.medical.rate
      expect(pr, `${file} 养老费率 ${pr}`).toBeGreaterThan(0)
      expect(pr, `${file} 养老费率 ${pr}`).toBeLessThan(1)
      expect(mr, `${file} 医保费率 ${mr}`).toBeGreaterThan(0)
      expect(mr, `${file} 医保费率 ${mr}`).toBeLessThan(1)
    }
  })
})

describe('溯源纪律：每个外源参数必须可追溯或明确标未核实', () => {
  const REQUIRED_SOURCE_KEYS = ['pension', 'pensionRate', 'medical', 'tax', 'minimumWage', 'retirement', 'income', 'soleVat', 'soleItr']
  const CONFIDENCE = ['official', 'derived', 'unverified']

  it('所有关键来源键都存在', () => {
    for (const { file, rule } of RULES) {
      for (const k of REQUIRED_SOURCE_KEYS) {
        expect(rule.sources[k], `${file} 缺 sources.${k}`).toBeTruthy()
      }
    }
  })

  it('每个来源都有 confidence 与 note（note 为空会让 chip 弹窗无内容）', () => {
    for (const { file, rule } of RULES) {
      for (const [k, s] of Object.entries(rule.sources)) {
        expect(CONFIDENCE, `${file}.${k} confidence=${s.confidence}`).toContain(s.confidence)
        expect((s.note ?? '').length, `${file}.${k} 缺 note`).toBeGreaterThan(0)
        expect(s.retrievedAt, `${file}.${k} 缺 retrievedAt`).toBeTruthy()
      }
    }
  })

  it('标 official 的条目必须带 url（否则"官方"无从核对）', () => {
    for (const { file, rule } of RULES) {
      for (const [k, s] of Object.entries(rule.sources)) {
        if (s.confidence === 'official') {
          expect(s.url, `${file}.${k} 标 official 但无 url`).toBeTruthy()
          expect(s.url, `${file}.${k} url 非法`).toMatch(/^https?:\/\//)
        }
      }
    }
  })

  it('未核实城市的占位值必须在 note 里写明不可引用', () => {
    for (const { file, rule } of RULES) {
      if (rule.verified) continue
      const notes = Object.values(rule.sources).map(s => s.note ?? '').join(' ')
      // 至少有一处明确提示"占位/未回溯/不可引用/以参保地为准"
      expect(
        /占位|未回溯|不可(对外)?引用|以参保地|请在参保地|务必核实/.test(notes),
        `${file} 未标 verified 但没有任何"未核实"提示`,
      ).toBe(true)
    }
  })
})

describe('城市注册表与规则文件同步', () => {
  it('注册表里每座城市都有对应规则文件', () => {
    for (const c of CITY_REGISTRY) {
      expect(RULE_FILES, `注册表城市 ${c.value} 没有规则文件`).toContain(`${c.value}.json`)
    }
  })

  it('每个规则文件都在注册表里（否则地图上点不到）', () => {
    const reg = new Set(CITY_REGISTRY.map(c => c.value))
    for (const { file, rule } of RULES) {
      expect(reg.has(rule.city), `${file} 未登记到 src/data/cities.ts`).toBe(true)
    }
  })

  it('城市 value / label 唯一，坐标在中国范围内', () => {
    const values = CITY_REGISTRY.map(c => c.value)
    const labels = CITY_REGISTRY.map(c => c.label)
    expect(new Set(values).size).toBe(values.length)
    expect(new Set(labels).size).toBe(labels.length)
    for (const c of CITY_REGISTRY) {
      expect(c.lng, `${c.label} 经度异常`).toBeGreaterThan(70)
      expect(c.lng, `${c.label} 经度异常`).toBeLessThan(140)
      expect(c.lat, `${c.label} 纬度异常`).toBeGreaterThan(15)
      expect(c.lat, `${c.label} 纬度异常`).toBeLessThan(55)
    }
  })

  it('注册表的 province 必须与地图 GeoJSON 的省名一致（否则省份不高亮）', () => {
    const geo = JSON.parse(readFileSync('public/maps/china.json', 'utf8')) as {
      features: { properties: { name: string } }[]
    }
    const provinces = new Set(geo.features.map(f => f.properties.name))
    for (const c of CITY_REGISTRY) {
      expect(provinces.has(c.province), `城市 ${c.label} 的 province="${c.province}" 与地图省名不匹配`).toBe(true)
    }
  })

  it('provinceCoverage 覆盖所有已收录城市', () => {
    const coverage = provinceCoverage()
    const total = [...coverage.values()].reduce((n, list) => n + list.length, 0)
    expect(total).toBe(CITY_REGISTRY.length)
  })
})
