<template>
  <div>
    <!-- Header -->
    <n-card title="权益补偿计算器" class="card">
      <FoldCard title="测算依据与用工关系前提（务必先读）">
        <p class="desc">
          依据《劳动合同法》《工伤保险条例》《广东省工伤保险条例》（2019修正）《劳动法》及人社部发〔2021〕56号等现行规定测算。
          合计仅计入可直接主张项，需行政责令、劳动关系认定等前置条件的金额单列。所有结果不构成法律意见，实际维权请咨询12348法律援助热线或当地工会法律援助。
        </p>
        <n-alert type="warning" :show-icon="true" style="margin-top: 8px">
          多数外卖骑手与平台被认定为"不完全符合确立劳动关系情形"，此时本页以劳动关系为前提的项目（加班费、二倍工资、违法解除赔偿金、工伤保险待遇）可能全部不适用，需改走民事服务合同/侵权路径。请先确认用工关系定性。
        </n-alert>
      </FoldCard>
    </n-card>

    <!-- 维权现实核查：先看概率，再谈金额 -->
    <n-card class="card" style="margin-top: 12px">
      <FoldCard
        title="维权现实核查 — 先说真话，再算金额"
        :summary="conditionalSummary ? `条件项 ${conditionalSummary.count} 笔 / ¥${conditionalSummary.total.toLocaleString()}` : '7 条硬事实'"
      >
        <n-alert v-if="conditionalSummary" type="warning" :show-icon="true" style="margin-bottom: 12px">
          本情景中，需要前置条件才成立的「条件项」共 {{ conditionalSummary.count }} 笔、合计 ¥{{ conditionalSummary.total.toLocaleString() }}。
          在劳动关系未认定、行政程序未启动之前，它们大概率不会实际到手——下方第 1、2 条说的就是这件事。
        </n-alert>
        <RealityList :facts="rightsFacts" />
      </FoldCard>
    </n-card>

    <!-- Scenario selector -->
    <n-card title="选择侵权场景" class="card" style="margin-top: 12px">
      <div class="scenario-grid">
        <div v-for="s in scenarios" :key="s.id"
             :class="['scenario-card', { active: currentScene === s.id }]"
             @click="selectScene(s.id)">
          <div class="sc-icon">{{ s.icon }}</div>
          <div class="sc-name">{{ s.name }}</div>
          <div class="sc-basis">{{ s.legalBasis }}</div>
        </div>
      </div>
    </n-card>

    <!-- Calculator forms -->
    <n-grid :x-gap="12" cols="1 m:2" responsive="screen" style="margin-top: 12px">
      <n-gi>
        <n-card :title="activeScene.name + ' — 参数输入'" class="card">
          <!-- Wage arrears -->
          <div v-if="currentScene === 'wage'" class="form-section">
            <div class="form-item">
              <label>欠薪月数</label>
              <n-input-number v-model:value="form.wage.months" :min="1" :max="24" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>月均应发报酬 (元)</label>
              <n-input-number v-model:value="form.wage.monthly" :min="0" :step="500" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>被克扣比例</label>
              <n-slider v-model:value="form.wage.percent" :min="10" :max="100" :step="10" :format-tooltip="(v:number) => v + '%'" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>已连续工作月数（用于二倍工资）</label>
              <n-input-number v-model:value="form.wage.tenureMonths" :min="1" :max="24" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>是否已签书面合同</label>
              <n-switch v-model:value="form.wage.hasContract" @update:value="calc()" />
              <p class="form-note">{{ form.wage.hasContract ? '有书面合同' : '无书面合同 — 可另主张二倍工资差额（第2个月起，最多11个月）' }}</p>
            </div>
            <div class="form-item">
              <label>是否已以欠薪为由书面解除</label>
              <n-switch v-model:value="form.wage.forcedQuit" @update:value="calc()" />
              <p class="form-note">《劳动合同法》第38条要求先送达解除通知，才能主张第46条经济补偿</p>
            </div>
          </div>

          <!-- Workplace injury -->
          <div v-if="currentScene === 'injury'" class="form-section">
            <div class="form-item">
              <label>伤残等级</label>
              <n-select v-model:value="form.injury.level" :options="[
                { label: '未构成伤残（医疗费 + 误工费）', value: 0 },
                { label: '十级伤残（最轻）', value: 10 },
                { label: '九级', value: 9 },
                { label: '八级', value: 8 },
                { label: '七级', value: 7 },
                { label: '六级及以上', value: 6 },
              ]" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>医疗费（已发生，元）</label>
              <n-input-number v-model:value="form.injury.medical" :min="0" :step="1000" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>停工留薪期月数</label>
              <n-input-number v-model:value="form.injury.leaveMonths" :min="0" :max="24" style="width:100%" @update:value="calc()" />
              <p class="form-note">一般不超过12个月；伤情严重经市级劳动能力鉴定委员会确认可延长不超过12个月</p>
            </div>
            <div class="form-item">
              <label>本人月平均工资 (元)</label>
              <n-input-number v-model:value="form.injury.income" :min="0" :step="500" style="width:100%" @update:value="calc()" />
              <p class="form-note">按缴费工资口径，低于全省社平60%或高于300%时自动封顶保底（区间 ¥{{ wageBand().floor.toLocaleString() }} – ¥{{ wageBand().ceil.toLocaleString() }}）<SourceTag source-key="pension" /></p>
            </div>
            <div class="form-item">
              <label>住院伙食补助 元/天（当地标准，0=不计）</label>
              <n-input-number v-model:value="form.injury.mealPerDay" :min="0" :step="10" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>护理费 元/天（当地标准，0=不计）</label>
              <n-input-number v-model:value="form.injury.nursingPerDay" :min="0" :step="10" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>已参加工伤保险</label>
              <n-switch v-model:value="form.injury.hasInsurance" @update:value="calc()" />
              <p class="form-note">{{ form.injury.hasInsurance ? '已参保：基金支付部分待遇' : '未参保：第62条—全部待遇由用人单位按条例标准支付' }}</p>
            </div>
            <p class="form-note">注：平台按单缴费的职业伤害保障试点待遇项目少于工伤保险，本页按工伤保险口径计算，若实际走职伤渠道需重新核算。</p>
          </div>

          <!-- Wrongful termination -->
          <div v-if="currentScene === 'dismiss'" class="form-section">
            <div class="form-item">
              <label>工作年限</label>
              <n-input-number v-model:value="form.dismiss.years" :min="0" :max="20" :step="0.5" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>月均工资 (元)</label>
              <n-input-number v-model:value="form.dismiss.monthly" :min="0" :step="500" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>解约性质</label>
              <n-select v-model:value="form.dismiss.type" :options="[
                { label: '无理由辞退（违法解除 2N）', value: 'wrongful' },
                { label: '第40条情形未提前30天通知（N+1）', value: 'no_notice' },
                { label: '怀孕/产假/哺乳期内被辞', value: 'protected' },
                { label: '因举报违规被辞（报复解雇）', value: 'retaliatory' },
              ]" @update:value="calc()" />
            </div>
            <div v-if="form.dismiss.type === 'protected'" class="form-item">
              <label>主张的工资损失月数（0=不计）</label>
              <n-input-number v-model:value="form.dismiss.pregnancyMonths" :min="0" :max="24" style="width:100%" @update:value="calc()" />
              <p class="form-note">哺乳期满通常为婴儿满1周岁。广东裁审对"整个三期工资"是否支持口径不一，故列为条件项</p>
            </div>
            <p class="form-note">月工资超过全省社平300%时，经济补偿基数按300%计且年限封顶12年。</p>
          </div>

          <!-- Platform algorithm violation -->
          <div v-if="currentScene === 'algorithm'" class="form-section">
            <div class="form-item">
              <label>侵权类型</label>
              <n-select v-model:value="form.algo.type" :options="[
                { label: '不合理派单（强制远距离/超时）', value: 'unfair_dispatch' },
                { label: '恶意降价/压低单价', value: 'price_suppress' },
                { label: '违规扣分导致收入损失', value: 'unfair_penalty' },
                { label: '封号/冻结账户', value: 'account_ban' },
                { label: '强制二选一排他', value: 'exclusivity' },
              ]" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>月均收入损失 (元)</label>
              <n-input-number v-model:value="form.algo.loss" :min="0" :step="500" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>持续时间（月）</label>
              <n-input-number v-model:value="form.algo.duration" :min="1" :max="24" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>已确认存在劳动关系</label>
              <n-switch v-model:value="form.algo.hasLaborRelation" @update:value="calc()" />
              <p class="form-note">无劳动关系时，算法争议通常只能按民事服务合同/侵权路径主张，仲裁一般不受理</p>
            </div>
            <p class="form-note">本页所有金额均为估算，算法规则造成的收入差额举证难度大，实际胜诉金额往往低于估算值。</p>
          </div>

          <!-- Overwork -->
          <div v-if="currentScene === 'overwork'" class="form-section">
            <div class="form-item">
              <label>小时工资基数 (元/h)</label>
              <n-input-number v-model:value="form.overwork.hourlyBase" :min="0" :step="5" style="width:100%" @update:value="calc()" />
              <p class="form-note">不得低于非全日制小时最低工资 ¥{{ store.rule?.minimumWage.nonFullTimeHourly ?? '—' }}/h <SourceTag source-key="minimumWage" /></p>
            </div>
            <div class="form-item">
              <label>工作日延时小时/月</label>
              <n-input-number v-model:value="form.overwork.weekdayHours" :min="0" :max="200" :step="4" style="width:100%" @update:value="calc()" />
              <p class="form-note">《劳动法》第41条上限为每月36小时</p>
            </div>
            <div class="form-item">
              <label>休息日加班小时/月</label>
              <n-input-number v-model:value="form.overwork.weekendHours" :min="0" :max="200" :step="4" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>法定节假日加班小时/月</label>
              <n-input-number v-model:value="form.overwork.holidayHours" :min="0" :max="100" :step="2" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>涉及月份</label>
              <n-input-number v-model:value="form.overwork.months" :min="1" :max="24" style="width:100%" @update:value="calc()" />
            </div>
            <p class="form-note">不再按"未付加班费总额"折算固定比例，改为按 1.5/2/3 倍分别计算，避免凭空丢失或夸大金额。</p>
          </div>

          <n-divider style="margin:10px 0" />
          <n-button @click="resetForm()" size="small" ghost>重置参数</n-button>
        </n-card>
      </n-gi>

      <!-- Results -->
      <n-gi>
        <n-card title="可主张补偿明细" class="card">
          <div v-if="!result" class="result-empty">
            填写左侧参数后自动计算补偿金额
          </div>
          <div v-else class="result-section">
            <!-- 首屏用的是预填示例值：不加标识的话，用户会把示例金额当成自己的可主张金额 -->
            <n-alert v-if="isExample" type="info" :show-icon="true" style="margin-bottom: 10px">
              下面是按<strong>示例参数</strong>算出的金额，不是你的情况。请把左侧各项改成你的实际数字，
              金额才会更新并可用于文书生成。
            </n-alert>
            <div class="result-total">
              <span>{{ isExample ? '示例可直接主张合计' : '可直接主张合计' }}</span>
              <strong>¥{{ result.total.toLocaleString() }}</strong>
            </div>
            <div v-if="result.conditionalTotal > 0" class="result-conditional">
              <span>条件项合计（需行政责令 / 劳动关系认定 / 解除终止等前置成立）</span>
              <strong>¥{{ result.conditionalTotal.toLocaleString() }}</strong>
            </div>
            <n-table :bordered="false" :single-line="true" size="small" :style="{ marginBottom: '12px' }">
              <thead>
                <tr><th>项目</th><th style="text-align:right">金额</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in result.items" :key="i">
                  <td>
                    <n-tag v-if="item.kind === 'conditional'" size="tiny" type="warning" :bordered="false" class="kind-tag">条件</n-tag>
                    <n-tag v-else-if="item.kind === 'info'" size="tiny" :bordered="false" class="kind-tag">说明</n-tag>
                    {{ item.name }}
                    <n-tooltip v-if="item.note" trigger="hover" placement="right">
                      <template #trigger><span class="info-icon">ⓘ</span></template>
                      {{ item.note }}
                    </n-tooltip>
                  </td>
                  <td style="text-align:right">
                    <span v-if="item.amount > 0">¥{{ item.amount.toLocaleString() }}</span>
                    <span v-else class="text-muted">—</span>
                  </td>
                </tr>
              </tbody>
            </n-table>

            <n-divider style="margin:8px 0" />

            <div class="legal-refs">
              <div class="lr-title">法律依据</div>
              <div v-for="(ref, i) in result.legalRefs" :key="i" class="lr-item">
                《{{ ref.law }}》第{{ ref.article }}条 — {{ ref.summary }}
              </div>
            </div>

            <n-divider style="margin:8px 0" />

            <div class="action-buttons">
              <n-button text type="primary" @click="goTab('document')">生成法律文书 →</n-button>
              <n-button text @click="goTab('guide')">维权步骤</n-button>
            </div>
          </div>
        </n-card>

        <n-card title="维权途径与时效" class="card" style="margin-top: 12px">
          <n-steps :current="0" size="small" vertical>
            <n-step title="① 固定证据" description="截图工资单/扣款/派单记录，越早越好" />
            <n-step title="② 平台申诉" description="APP工单/客服 — 保留书面回复" />
            <n-step title="③ 行政投诉" description="拨打 12333 或向劳动监察大队举报" />
            <n-step title="④ 劳动仲裁" description="向劳动人事争议仲裁委申请（免费）" />
            <n-step title="⑤ 法院起诉" description="不服仲裁15日内向基层法院起诉" />
          </n-steps>
          <div class="hotline-bar">
            <span>12348 <b>法律援助</b></span>
            <span>12333 <b>人社投诉</b></span>
            <span>12351 <b>职工维权</b></span>
            <span>12368 <b>法院热线</b></span>
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, watch, type Ref } from 'vue'
import { NCard, NAlert, NInputNumber, NSelect, NSlider, NSwitch, NButton, NTable, NGrid, NGi, NDivider, NSteps, NStep, NTooltip, NTag, useMessage } from 'naive-ui'
import { useMainStore } from '../../stores/main'
import SourceTag from '../SourceTag.vue'
import FoldCard from '../FoldCard.vue'
import RealityList from '../RealityList.vue'
import { realityFactsBy } from '../../utils/reality'
import type { CompensationItem, CompensationLegalRef, CompensationResult } from '../../types'

const message = useMessage()
const store = useMainStore()
// 由 RightsView 提供的内部 tab 切换（补偿计算 → 指南 / 文书）
const rightsTab = inject<Ref<string>>('rightsTab')
function goTab(t: string) { if (rightsTab) rightsTab.value = t }

const currentScene = ref('wage')

const scenarios = [
  { id: 'wage', name: '欠薪/克扣报酬', icon: '1', legalBasis: '《劳动合同法》第30、38、85条' },
  { id: 'injury', name: '职业伤害/工伤', icon: '2', legalBasis: '《工伤保险条例》+广东省条例第34条' },
  { id: 'dismiss', name: '违法解约', icon: '3', legalBasis: '《劳动合同法》第47、87条' },
  { id: 'algorithm', name: '平台算法/处罚争议', icon: '4', legalBasis: '《个保法》第24条+人社部发〔2021〕56号' },
  { id: 'overwork', name: '超时加班费', icon: '5', legalBasis: '《劳动法》第41、44条' },
]

const activeScene = computed(() => scenarios.find(s => s.id === currentScene.value)!)

const DEFAULT_FORM = {
  wage: { months: 3, monthly: 8000, percent: 50, tenureMonths: 6, hasContract: false, forcedQuit: false },
  injury: { level: 0, medical: 5000, leaveMonths: 3, income: 8000, hasInsurance: true, mealPerDay: 0, nursingPerDay: 0 },
  dismiss: { years: 2, monthly: 8000, type: 'wrongful', pregnancyMonths: 0 },
  algo: { type: 'unfair_dispatch', loss: 2000, duration: 3, hasLaborRelation: false },
  overwork: { hourlyBase: 30, weekdayHours: 40, weekendHours: 16, holidayHours: 0, months: 3 },
}

const form = reactive(JSON.parse(JSON.stringify(DEFAULT_FORM)))

type CalcItem = CompensationItem
type LegalRef = CompensationLegalRef
type CalcResult = CompensationResult

const result = ref<CalcResult | null>(null)

/** 维权现实核查：把本情景的「条件项」金额抽出来，与硬事实一并展示，先压低预期再谈金额 */
const rightsFacts = realityFactsBy([
  'relation-gate', 'conditional-gap', 'evidence-hold',
  'limitation-clock', 'time-cost', 'enforcement', 'account-risk',
])
const conditionalSummary = computed(() => {
  if (!result.value) return null
  const items = result.value.items.filter(i => i.kind === 'conditional' && i.amount > 0)
  if (!items.length) return null
  return { count: items.length, total: items.reduce((s, i) => s + i.amount, 0) }
})

const claim = (name: string, amount: number, note: string): CalcItem => ({ name, amount: Math.round(amount), note, kind: 'claim' })
const cond = (name: string, amount: number, note: string): CalcItem => ({ name, amount: Math.round(amount), note, kind: 'conditional' })
const info = (name: string, note: string): CalcItem => ({ name, amount: 0, note, kind: 'info' })

/** 合计只累加 claim，conditional 与 info 单列——避免把"可能需要行政前置"或"罚给国家"的钱算进用户预期 */
function pack(items: CalcItem[], legalRefs: LegalRef[]): CalcResult {
  return {
    scene: activeScene.value.name,
    total: items.filter(i => i.kind === 'claim').reduce((s, i) => s + i.amount, 0),
    conditionalTotal: items.filter(i => i.kind === 'conditional').reduce((s, i) => s + i.amount, 0),
    items, legalRefs,
  }
}

/** 养老基数上下限即全省全口径社平的60%/300%，用它给"本人工资"封顶保底 */
function wageBand(): { floor: number; ceil: number } {
  const p = store.rule?.benefit.pension
  return { floor: p?.baseMin ?? 0, ceil: p?.baseMax ?? Infinity }
}

/** 《劳动合同法》第47条：满1年=1个月，满6个月不满1年=1个月，不满6个月=0.5个月 */
function severanceMonths(years: number): number {
  const full = Math.floor(years)
  const rest = years - full
  return rest >= 0.5 ? full + 1 : full + (rest > 0 ? 0.5 : 0)
}

function calcWage(): CalcResult {
  const { months, monthly, percent, tenureMonths, hasContract, forcedQuit } = form.wage
  const owed = monthly * (percent / 100) * months
  const items: CalcItem[] = [
    claim('欠付报酬本金', owed, `¥${monthly} × ${percent}% × ${months}个月`),
    cond('加付赔偿金 50%–100%', owed * 0.5, '《劳动合同法》第85条以"劳动行政部门责令限期支付、逾期不付"为前置条件，未经责令程序不成立，故不计入合计'),
  ]
  if (!hasContract) {
    // 第82条：自用工之日起满1个月的次日至满1年，最长11个月；与欠薪月数无关
    const doubleMonths = Math.max(0, Math.min(tenureMonths - 1, 11))
    items.push(cond('未订书面劳动合同二倍工资差额', monthly * doubleMonths,
      `按用工月数 ${tenureMonths} 个月计算第2个月起最多11个月：${doubleMonths} 个月 × ¥${monthly}。广东裁审倾向按"每月分别起算1年时效"，逾期部分可能不被支持`))
  }
  if (forcedQuit) {
    items.push(cond('因欠薪被迫解除的经济补偿（N）', monthly * severanceMonths(tenureMonths / 12),
      '《劳动合同法》第38、46条：以欠薪为由解除劳动合同可主张经济补偿，需先向单位送达解除通知'))
  }
  items.push(info('时效提醒', '劳动报酬争议在劳动关系存续期间不受1年时效限制；关系终止后须自终止之日起1年内申请（调解仲裁法第27条第4款）'))
  return pack(items, [
    { law: '劳动合同法', article: '30', summary: '用人单位应当按时足额支付劳动报酬' },
    { law: '劳动合同法', article: '82', summary: '用工超过1个月不满1年未订立书面合同的，支付二倍工资' },
    { law: '劳动合同法', article: '85', summary: '经责令限期支付而逾期不付，按应付金额50%–100%加付赔偿金' },
    { law: '劳动争议调解仲裁法', article: '27', summary: '仲裁时效1年；欠薪在关系存续期间不受限，终止后1年内提出' },
  ])
}

function calcInjury(): CalcResult {
  const { level, medical, leaveMonths, income, hasInsurance, mealPerDay, nursingPerDay } = form.injury
  const { floor, ceil } = wageBand()
  // 工伤保险条例第64条：本人工资低于统筹地区职工平均工资60%的按60%，高于300%的按300%
  const ownWage = Math.min(Math.max(income, floor), ceil)
  const items: CalcItem[] = [
    claim('医疗费（据实）', medical, '以工伤医疗机构发生的、符合目录的费用凭据为准，保留发票与住院清单原件'),
    claim('停工留薪期原工资福利', ownWage * leaveMonths,
      `按本人工资 ¥${Math.round(ownWage)} × ${leaveMonths} 个月。停工留薪期一般不超过12个月，伤情严重经设区的市级劳动能力鉴定委员会确认可延长不超过12个月`),
  ]
  if (mealPerDay > 0) items.push(claim('住院伙食补助费', mealPerDay * leaveMonths * 30, '按统筹地区标准填写（每日金额需以当地规定为准，本工具不内置未经核实的数字）'))
  if (nursingPerDay > 0) items.push(claim('生活护理费', nursingPerDay * leaveMonths * 30, '生活不能自理需护理的，由用人单位负责或按当地护理费标准'))

  // 广东省工伤保险条例第34条（2019修正）一次性补助金月数，以本人工资为基数
  const subsidy: Record<number, number> = { 10: 7, 9: 9, 8: 11, 7: 13, 6: 16, 5: 18, 4: 21, 3: 23, 2: 25, 1: 27 }
  const medFund: Record<number, number> = { 10: 1, 9: 2, 8: 4, 7: 6, 6: 8, 5: 10 }
  const jobFund: Record<number, number> = { 10: 4, 9: 8, 8: 15, 7: 25, 6: 40, 5: 50 }
  if (level >= 5 && level <= 10) {
    items.push(claim(`一次性伤残补助金（${level}级 · ${subsidy[level]}个月本人工资）`, ownWage * subsidy[level],
      '《工伤保险条例》第35–37条月数表，由工伤保险基金支付'))
    items.push(cond(`一次性工伤医疗补助金（广东 ${level}级 · ${medFund[level]}个月）`, ownWage * medFund[level],
      '广东省工伤保险条例第34条：以劳动合同期满终止或本人提出解除为前提，由工伤保险基金支付'))
    items.push(cond(`一次性伤残就业补助金（广东 ${level}级 · ${jobFund[level]}个月）`, ownWage * jobFund[level],
      '广东省工伤保险条例第34条：同上以劳动关系解除/终止为前提，由用人单位支付'))
  } else if (level === 0) {
    items.push(info('尚未进行劳动能力鉴定', '伤残等级决定一次性补助金有无与月数，建议先申请劳动能力鉴定再主张'))
  }
  if (!hasInsurance) {
    items.push(info('未参加工伤保险的后果', '《工伤保险条例》第62条：应当参保而未参保期间发生工伤的，由用人单位按照条例规定的待遇项目和标准支付全部费用'))
  } else {
    items.push(info('职业伤害保障与工伤保险的区别', '平台按单缴费的职业伤害保障试点待遇项目少于工伤保险（通常无一次性伤残补助金/就业补助金），两者不可混同计算'))
  }
  return pack(items, [
    { law: '工伤保险条例', article: '33、35–37', summary: '停工留薪期原工资福利待遇不变；一次性伤残补助金按等级月数支付' },
    { law: '工伤保险条例', article: '64', summary: '本人工资为前12个月平均月缴费工资，低于60%或高于300%的按60%/300%计' },
    { law: '广东省工伤保险条例', article: '34', summary: '一次性工伤医疗补助金五级10月至十级1月；一次性伤残就业补助金五级50月至十级4月' },
    { law: '工伤保险条例', article: '62', summary: '未参保期间发生工伤，由用人单位按条例项目和标准支付' },
  ])
}

function calcDismiss(): CalcResult {
  const { years, monthly, type, pregnancyMonths } = form.dismiss
  const { ceil } = wageBand()
  const capped = Math.min(monthly, ceil)
  const yearsCapped = monthly > ceil ? Math.min(years, 12) : years
  const n = severanceMonths(yearsCapped)
  const items: CalcItem[] = []

  if (type === 'wrongful' || type === 'protected' || type === 'retaliatory') {
    items.push(claim(`违法解除赔偿金 2N（N=${n}）`, 2 * n * capped,
      `《劳动合同法》第87条：按第47条经济补偿标准的二倍。月工资超过全省社平300%时，按300=${Math.round(ceil)}元计且年限封顶12年（第47条第2款）${monthly > ceil ? '（本案已触发封顶）' : ''}`))
  } else {
    items.push(claim(`经济补偿金 N（${n} 个月）`, n * capped,
      '第46、47条：每满1年支付1个月工资，满6个月不满1年按1年，不满6个月按半个月'))
    items.push(cond('代通知金（+1个月）', capped,
      '第40条：仅在医疗期满不能工作、不能胜任经培训调岗后仍不能胜任、客观情况重大变化三种情形且未提前30日书面通知时才支付；与2N不可并用'))
  }
  if (type === 'protected') {
    items.push(cond('三期工资损失（解除之日至哺乳期满）', capped * pregnancyMonths,
      `按 ${pregnancyMonths} 个月计算（需自行填写，哺乳期满通常为婴儿满1周岁）。广东裁审对"是否支持整个三期工资"口径不一，不作为确定可主张项`))
    if (pregnancyMonths === 0) items.push(info('三期案件需填写月数', '未填写月数则此项按0计，建议先咨询12348或工会法援'))
  }
  if (type === 'retaliatory') {
    items.push(info('报复性解雇与精神损害赔偿', '劳动争议仲裁通常不受理精神损害赔偿请求；可另行以侵权之诉主张，但胜诉与金额均不确定，故不计入合计'))
  }
  items.push(info('举证要点', '解除通知、APP封号/清退截图、工资流水、工牌工服与派单记录是认定劳动关系与解除违法性的关键证据'))
  return pack(items, [
    { law: '劳动合同法', article: '40', summary: '三种情形下未提前30日书面通知的，额外支付1个月工资' },
    { law: '劳动合同法', article: '42', summary: '孕期、产期、哺乳期内及工伤医疗期内不得依第40、41条解除' },
    { law: '劳动合同法', article: '47', summary: '经济补偿按工作年限计；高收入者基数封顶3倍社平、年限封顶12年' },
    { law: '劳动合同法', article: '87', summary: '违法解除按经济补偿标准的二倍支付赔偿金' },
  ])
}

function calcAlgo(): CalcResult {
  const { loss, duration, hasLaborRelation } = form.algo
  const items: CalcItem[] = [
    cond('收入差额/扣分损失', loss * duration,
      `月均 ¥${loss} × ${duration} 个月。需先证明损失与算法规则之间的因果关系${hasLaborRelation ? '' : '，且多数情形须先确认劳动关系才能走仲裁'}`),
    info('律师费与公证费', '广东劳动争议仲裁与诉讼一般不支持由败诉方承担律师费，故不计入可主张金额；小额诉讼可自行完成'),
    info('可并行主张的渠道', '①向平台申诉并要求书面说明算法依据；②向人社部门、市场监管部门投诉算法规则未公示；③个人主张自动化决策解释权（个保法第24条）'),
  ]
  return pack(items, [
    { law: '个人信息保护法', article: '24', summary: '自动化决策应保证透明度与结果公平公正，不得实行不合理差别待遇' },
    { law: '互联网信息服务算法推荐管理规定', article: '22', summary: '向劳动者提供便捷的申诉渠道，健全投诉处理机制' },
    { law: '关于维护新就业形态劳动者劳动保障权益的指导意见', article: '人社部发〔2021〕56号', summary: '平台应完善算法规则并向劳动者公示，听取工会和劳动者意见' },
  ])
}

function calcOverwork(): CalcResult {
  const { hourlyBase, weekdayHours, weekendHours, holidayHours, months } = form.overwork
  const weekdayPay = weekdayHours * 1.5 * hourlyBase * months
  const weekendPay = weekendHours * 2 * hourlyBase * months
  const holidayPay = holidayHours * 3 * hourlyBase * months
  const items: CalcItem[] = []
  if (weekdayHours > 0) items.push(claim('工作日延时加班费（1.5倍）', weekdayPay, `${weekdayHours}h/月 × 1.5 × ¥${hourlyBase}/h × ${months}个月`))
  if (weekendHours > 0) items.push(claim('休息日加班费（2倍）', weekendPay, `${weekendHours}h/月 × 2 × ¥${hourlyBase}/h × ${months}个月（不能安排补休时才支付2倍）`))
  if (holidayHours > 0) items.push(claim('法定节假日加班费（3倍）', holidayPay, `${holidayHours}h/月 × 3 × ¥${hourlyBase}/h × ${months}个月`))
  if (weekdayHours > 36) items.push(info('工时合法性提示', `月延时 ${weekdayHours}h 已超《劳动法》第41条每月不超过36小时的上限`))
  if (items.every(i => i.amount === 0)) items.push(info('当前参数下无加班费主张', '工作日延时、休息日、法定节假日小时数均为0'))
  items.push(info('适用前提', '加班费请求权以存在劳动关系为前提；经人社部门审批实行不定时工作制的人员一般不适用延时与休息日加班费。灵活就业骑手多数被认定为非劳动关系，此项很可能不成立'))
  return pack(items, [
    { law: '劳动法', article: '41', summary: '一般每日加班不超过1小时，特殊原因不超过3小时，每月不超过36小时' },
    { law: '劳动法', article: '44', summary: '延时1.5倍；休息日不能补休2倍；法定休假日3倍' },
  ])
}

/**
 * 只有用户实际改动过任一输入项，才把结果交给文书生成器。
 * 首屏的 DEFAULT_FORM 是预填示例而非用户主张的依据，
 * 若在 setup 里就写入 store，文书页会把未经核对的示例金额当作"测算结果"填进仲裁请求。
 */
const userTouched = ref(false)

/** 切场景：新场景的输入仍是示例值，确认状态必须跟着复位，
 *  否则新场景的默认金额会被当作"用户已确认"送进文书 */
function selectScene(id: string) {
  if (currentScene.value === id) return
  currentScene.value = id
  userTouched.value = false
  calc()
}

/** 结果是否只是示例（未确认）：UI 必须与"用户已确认"区分开 */
const isExample = computed(() => !userTouched.value && !!result.value)

function calc() {
  switch (currentScene.value) {
    case 'wage': result.value = calcWage(); break
    case 'injury': result.value = calcInjury(); break
    case 'dismiss': result.value = calcDismiss(); break
    case 'algorithm': result.value = calcAlgo(); break
    case 'overwork': result.value = calcOverwork(); break
  }
  // 文书生成器读取同一份结果，避免两处各自换算导致金额不一致
  store.setCompensation(userTouched.value ? result.value : null)
}

// 用户改动任一输入项即视为已确认，之后的结果才可进入文书
watch(form, () => {
  userTouched.value = true
  calc()
}, { deep: true })

function resetForm() {
  const defaults = JSON.parse(JSON.stringify(DEFAULT_FORM))[currentScene.value as keyof typeof DEFAULT_FORM]
  Object.assign(form[currentScene.value as keyof typeof form], defaults)
  // 重置回示例值后同样不能算作"用户已确认"（watch 会把它标为 true，此处必须覆盖）
  userTouched.value = false
  message.success('已重置当前场景参数')
  calc()
}

// 首屏渲染（不写入 store）
calc()
</script>

<style scoped>
.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.scenario-card {
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  padding: 12px 8px;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
}
.scenario-card:hover { border-color: var(--color-text-brand); }
.scenario-card.active { border-color: var(--color-text-brand); background: rgba(13,148,136,0.04); }
.sc-icon { width: 28px; height: 28px; margin: 0 auto 6px; border-radius: 50%; background: var(--color-bg-tertiary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: var(--color-text-secondary); }
.scenario-card.active .sc-icon { background: var(--color-primary-500); color: var(--color-text-inverse); }
.sc-name { font-size: 12px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 2px; }
.sc-basis { font-size: 10px; color: var(--color-text-tertiary); }

.form-section { display: flex; flex-direction: column; gap: 10px; }
.form-item label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; display: block; margin-bottom: 3px; }
.form-note { font-size: 11px; color: var(--color-text-tertiary); margin-top: 4px; margin-bottom: 0; line-height: 1.5; }

.result-empty { text-align: center; color: var(--color-text-tertiary); padding: 40px 0; font-size: 13px; }

.result-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px; background: var(--color-primary-500); color: var(--color-text-inverse);
  border-radius: 6px; margin-bottom: 12px;
}
.result-total span { font-size: 12px; opacity: 0.85; }
.result-total strong { font-size: 20px; }
.result-conditional {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; background: var(--color-warning-50);
  border: 1px solid var(--color-warning-200); border-radius: 6px; margin-bottom: 12px;
}
.result-conditional span { font-size: 11px; color: var(--color-text-warning); line-height: 1.4; max-width: 60%; }
.result-conditional strong { font-size: 15px; color: var(--color-text-warning); }
.kind-tag { margin-right: 4px; }

.info-icon { color: var(--color-text-brand); cursor: help; font-size: 11px; margin-left: 2px; }
.text-muted { color: var(--color-border-secondary); }

.legal-refs { display: flex; flex-direction: column; gap: 3px; }
.lr-title { font-size: 11px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.lr-item { font-size: 11px; color: var(--color-text-secondary); padding: 3px 0; border-left: 2px solid var(--color-border-primary); padding-left: 8px; }

.action-buttons { display: flex; gap: 8px; }

.hotline-bar {
  display: flex; gap: 14px; padding-top: 8px;
  border-top: 1px solid var(--color-bg-tertiary); margin-top: 6px;
  font-size: 11px; color: var(--color-text-secondary); flex-wrap: wrap;
}
.hotline-bar span{white-space:nowrap;}
.hotline-bar b { color: var(--color-text-primary); }
</style>
