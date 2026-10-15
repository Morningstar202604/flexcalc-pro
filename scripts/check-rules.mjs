/**
 * 规则文件溯源门禁。
 *
 * 规则文件是产品主张的一部分：数字可以待核实，但不允许「缺出处」「置信度误标」
 * 「official 却没有文号或链接」这类问题混进来。此脚本在 CI 与本地都能跑：
 *
 *   node scripts/check-rules.mjs
 *
 * 说明：原先这段校验内联在 .github/workflows/ci.yml 的 `node -e "..."` 里，
 * 脚本中含有「冒号+空格」（如 `费率越界: `），在 YAML 中会被解析成映射键值，
 * 导致整个 workflow 文件语法错误、CI 从未真正启动过。抽出为独立文件后
 * workflow 只负责调用，语法与逻辑各自可验证。
 */

import { readFileSync, readdirSync } from 'node:fs'

const RULES_DIR = 'public/rules'
const CONFIDENCE_LEVELS = ['official', 'derived', 'unverified']

let checked = 0
const errors = []

function fail(msg) {
  errors.push(msg)
}

for (const file of readdirSync(RULES_DIR).filter(f => f.endsWith('.json'))) {
  const path = `${RULES_DIR}/${file}`
  let rule
  try {
    rule = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    fail(`${file} 不是合法 JSON: ${e.message}`)
    continue
  }
  checked++

  const sources = Object.entries(rule.sources ?? {})
  if (sources.length < 6) fail(`${file} 来源条目不足（${sources.length} < 6）`)

  for (const [key, s] of sources) {
    if (!CONFIDENCE_LEVELS.includes(s.confidence)) fail(`${file} ${key} 置信度非法: ${s.confidence}`)
    if (s.confidence === 'official' && !(s.docNo || s.url)) fail(`${file} ${key} 标为 official 但既无文号也无链接`)
    if (!s.retrievedAt) fail(`${file} ${key} 缺 retrievedAt（无法判断数据时效）`)
  }

  if (rule.verified && !sources.every(([, s]) => s.confidence === 'official')) {
    fail(`${file} verified=true 但存在非 official 来源`)
  }

  // 医保分档是外部数据，分档费率必须能回溯到 medical 档的官方来源
  const tiers = rule.benefit?.medicalTiers
  if (tiers) {
    if (!rule.sources.medical) fail(`${file} 有 medicalTiers 但缺 medical 来源`)
    else if (rule.sources.medical.confidence !== 'official') fail(`${file} medicalTiers 存在但 medical 来源非 official`)

    const ids = tiers.map(t => t.id)
    if (new Set(ids).size !== ids.length) fail(`${file} medicalTiers 存在重复 id`)
    const rates = tiers.map(t => t.rate)
    if (new Set(rates).size !== rates.length) fail(`${file} medicalTiers 存在重复费率`)
    for (const t of tiers) {
      if (!(t.rate > 0 && t.rate < 0.2)) fail(`${file} 档次 ${t.id} 费率越界: ${t.rate}`)
      if (!t.note) fail(`${file} 档次 ${t.id} 缺口径说明`)
    }
    if (!rates.includes(rule.benefit.medical.rate)) {
      fail(`${file} 默认档费率 ${rule.benefit.medical.rate} 不在任何 medicalTiers 中`)
    }
  }

  // 退休计发基数是外部数据，不得被静默改成写死值
  if (!(rule.retirement?.benefitBaseMonthly > 0)) fail(`${file} 计发基数非法`)
  if (!rule.sources.retirement) fail(`${file} 缺 retirement 来源`)

  // 个体户税负：增值税与个税是两个税种，必须分列且各有来源。
  // 历史上曾把增值税的 1% 优惠税率当作个税核定征收率，导致税负被严重低估。
  const sole = rule.soleProprietorship
  if (!sole) fail(`${file} 缺 soleProprietorship 配置`)
  else {
    if (!(sole.vatRate > 0 && sole.vatRate < 0.1)) fail(`${file} 增值税税率越界: ${sole.vatRate}`)
    if (!(sole.vatThresholdMonthly > 0)) fail(`${file} 增值税起征点非法`)
    if (!(sole.itrIncomeRate > 0 && sole.itrIncomeRate < 1)) fail(`${file} 个税所得率越界: ${sole.itrIncomeRate}`)
  }
  if (!rule.sources.soleVat?.docNo) fail(`${file} 个体户增值税缺官方文号`)
  if (!rule.sources.soleItr) fail(`${file} 个体户个税缺来源`)
  // 旧字段留着就会被误当成个税税率
  if (rule.tax?.soleRate !== undefined) fail(`${file} tax.soleRate 已废止，请改用 soleProprietorship.itrIncomeRate`)
}

if (errors.length > 0) {
  console.error(`规则溯源门禁未通过（检查 ${checked} 个文件，${errors.length} 项问题）：`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`rule provenance OK（${checked} 个规则文件）`)
