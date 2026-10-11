<template>
  <div>
    <!-- Header -->
    <n-card title="权益补偿计算器" class="card">
      <p class="desc">
        基于《劳动合同法》《新就业形态劳动者权益保障办法》等法规，测算您在各类侵权场景中可主张的补偿金额。
        所有结果仅供参考，实际维权请咨询专业律师或拨打 12348 法律援助热线。
      </p>
      <n-alert type="warning" :show-icon="true" style="margin-top: 8px">
        重要提醒：维权第一步永远是<strong>固定证据</strong>。请在任何争议发生后立即截图、录音、保存相关记录。
      </n-alert>
    </n-card>

    <!-- Scenario selector -->
    <n-card title="选择侵权场景" class="card" style="margin-top: 12px">
      <div class="scenario-grid">
        <div v-for="s in scenarios" :key="s.id"
             :class="['scenario-card', { active: currentScene === s.id }]"
             @click="currentScene = s.id; calc()">
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
              <label>月均应发工资 (元)</label>
              <n-input-number v-model:value="form.wage.monthly" :min="0" :step="500" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>欠薪比例</label>
              <n-slider v-model:value="form.wage.percent" :min="10" :max="100" :step="10" :format-tooltip="(v:number) => v + '%'" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>是否已签劳动合同</label>
              <n-switch v-model:value="form.wage.hasContract" @update:value="calc()" />
              <p class="form-note">{{ form.wage.hasContract ? '有书面合同（主张方便）' : '无书面合同 — 额外主张双倍工资差额（最多11个月）' }}</p>
            </div>
            <div class="form-item">
              <label>是否已被拖欠超过1年</label>
              <n-switch v-model:value="form.wage.over1year" />
              <p class="form-note">超过劳动仲裁1年时效期需做特殊处理</p>
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
              <label>实际医疗费 (元)</label>
              <n-input-number v-model:value="form.injury.medical" :min="0" :step="1000" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>误工天数</label>
              <n-input-number v-model:value="form.injury.days" :min="0" :max="365" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>月均收入 (元)</label>
              <n-input-number v-model:value="form.injury.income" :min="0" :step="500" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>有无职伤保障/工伤保险</label>
              <n-switch v-model:value="form.injury.hasInsurance" @update:value="calc()" />
              <p class="form-note">{{ form.injury.hasInsurance ? '美团骑手已覆盖职伤保障 — 优先走此渠道' : '未参保 — 全部工伤待遇由平台承担' }}</p>
            </div>
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
                { label: '无任何理由辞退（违法解约 2N）', value: 'wrongful' },
                { label: '未提前30天通知（N+1）', value: 'no_notice' },
                { label: '怀孕/产假/医疗期内被辞', value: 'protected' },
                { label: '因举报违规被辞（报复解雇）', value: 'retaliatory' },
              ]" @update:value="calc()" />
            </div>
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
          </div>

          <!-- Overwork -->
          <div v-if="currentScene === 'overwork'" class="form-section">
            <div class="form-item">
              <label>日均工作时间</label>
              <n-input-number v-model:value="form.overwork.hours" :min="0" :max="20" :step="0.5" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>月工作天数</label>
              <n-input-number v-model:value="form.overwork.days" :min="0" :max="31" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>未付加班费/月 (元)</label>
              <n-input-number v-model:value="form.overwork.overtime_pay" :min="0" :step="100" style="width:100%" @update:value="calc()" />
            </div>
            <div class="form-item">
              <label>涉及月份</label>
              <n-input-number v-model:value="form.overwork.months" :min="1" :max="12" style="width:100%" @update:value="calc()" />
            </div>
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
            <div class="result-total">
              <span>预估可主张总额</span>
              <strong>¥{{ result.total.toLocaleString() }}</strong>
            </div>
            <n-table :bordered="false" :single-line="true" size="small" :style="{ marginBottom: '12px' }">
              <thead>
                <tr><th>项目</th><th style="text-align:right">金额</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in result.items" :key="i">
                  <td>
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
import { ref, reactive, computed, inject, type Ref } from 'vue'
import { NCard, NAlert, NInputNumber, NSelect, NSlider, NSwitch, NButton, NTable, NGrid, NGi, NDivider, NSteps, NStep, NTooltip, useMessage } from 'naive-ui'

const message = useMessage()
// 由 RightsView 提供的内部 tab 切换（补偿计算 → 指南 / 文书）
const rightsTab = inject<Ref<string>>('rightsTab')
function goTab(t: string) { if (rightsTab) rightsTab.value = t }

const currentScene = ref('wage')

const scenarios = [
  { id: 'wage', name: '欠薪/克扣工资', icon: '1', legalBasis: '《劳动合同法》第85条' },
  { id: 'injury', name: '工伤/职业病', icon: '2', legalBasis: '《工伤保险条例》+《职伤保障办法》' },
  { id: 'dismiss', name: '违法解约', icon: '3', legalBasis: '《劳动合同法》第47、87条' },
  { id: 'algorithm', name: '平台算法侵权', icon: '4', legalBasis: '《个保法》第24条+算法管理规定' },
  { id: 'overwork', name: '超时加班', icon: '5', legalBasis: '《劳动法》第41、44条' },
]

const activeScene = computed(() => scenarios.find(s => s.id === currentScene.value)!)

const form = reactive({
  wage: { months: 3, monthly: 8000, percent: 50, hasContract: false, over1year: false },
  injury: { level: 0, medical: 5000, days: 30, income: 8000, hasInsurance: true },
  dismiss: { years: 2, monthly: 8000, type: 'wrongful' },
  algo: { type: 'unfair_dispatch', loss: 2000, duration: 3 },
  overwork: { hours: 12, days: 28, overtime_pay: 3000, months: 3 },
})

interface CalcItem { name: string; amount: number; note: string }
interface LegalRef { law: string; article: string; summary: string }
interface CalcResult { total: number; items: CalcItem[]; legalRefs: LegalRef[] }

const result = ref<CalcResult | null>(null)

function calcWage(): CalcResult {
  const { months, monthly, percent, hasContract, over1year } = form.wage
  const owed = Math.round(monthly * (percent / 100) * months)
  const items: CalcItem[] = [
    { name: '欠薪本金', amount: owed, note: `¥${monthly} × ${percent}% × ${months}个月` },
    { name: '加付赔偿金 (50%)', amount: Math.round(owed * 0.5), note: '《劳动合同法》第85条：责令限期支付逾期不付的按50%-100%加付赔偿金' },
  ]
  if (!hasContract) {
    items.push({ name: '未签合同双倍工资差额（最高11个月）', amount: monthly * Math.min(months, 11), note: '自用工第2个月起算，最多11个月双倍差额。注意1年时效' })
  }
  if (over1year) {
    items.push({ name: '时效救济可能性', amount: 0, note: '超过1年时效可尝试：①证明曾主张权利中断时效；②按侵权而非劳动报酬主张' })
  }
  return {
    total: items.reduce((s, i) => s + i.amount, 0),
    items,
    legalRefs: [
      { law: '劳动合同法', article: '38', summary: '未及时足额支付劳动报酬，劳动者可解除合同并主张经济补偿' },
      { law: '劳动合同法', article: '85', summary: '逾期不支付按50%-100%加付赔偿金' },
      { law: '劳动争议调解仲裁法', article: '27', summary: '仲裁时效1年，从知道权益被侵害之日/劳动关系终止日起算' },
    ]
  }
}

function calcInjury(): CalcResult {
  const { level, medical, days, income, hasInsurance } = form.injury
  const dailyWage = income / 21.75
  const items: CalcItem[] = [
    { name: '医疗费（据实报销）', amount: medical, note: '保留所有发票、病历、检查报告原件，住院清单需盖章' },
    { name: '停工留薪期原工资', amount: Math.round(dailyWage * days), note: `${days}天 × ¥${dailyWage.toFixed(0)}/天，原工资福利待遇不变` },
  ]
  if (level === 0) {
    items.push({ name: '住院伙食补助', amount: Math.min(days, 90) * 50, note: '各地标准不同，广州/深圳约50元/天' })
    items.push({ name: '护理费（按实际需要）', amount: Math.round(Math.min(days, 90) * 80), note: '按当地护工同级别报酬标准' })
  }
  if (level >= 6 && level <= 10) {
    const mapping: Record<number, number> = { 10: 7, 9: 9, 8: 11, 7: 13, 6: 16 }
    const m = mapping[level]
    items.push({ name: `一次性伤残补助金 (${level}级, ${m}个月)`, amount: income * m, note: `劳动能力鉴定${level}级伤残，按${m}个月本人工资核算` })
    items.push({ name: '一次性工伤医疗补助金（离职时）', amount: (11 - level) * income * 0.5, note: '各省标准不同，由工伤保险基金支付' })
  }
  if (!hasInsurance) {
    items.push({ name: '用人单位替代性全额赔偿', amount: 0, note: '未参保工伤保险 — 全部工伤待遇改由用人单位承担，可直接诉至法院' })
  }
  return {
    total: items.reduce((s, i) => s + i.amount, 0),
    items,
    legalRefs: [
      { law: '工伤保险条例', article: '30-38', summary: '工伤医疗费、停工留薪期、伤残补助金等待遇标准' },
      { law: '新就业形态职业伤害保障办法', article: '全文', summary: '美团、饿了么骑手等优先走职伤保障认定渠道，由平台出资' },
      { law: '工伤保险条例', article: '62', summary: '未参保单位须按条例待遇标准全额支付' },
    ]
  }
}

function calcDismiss(): CalcResult {
  const { years, monthly, type } = form.dismiss
  const n = Math.ceil(years)
  const items: CalcItem[] = []
  if (type === 'wrongful') {
    items.push({ name: `违法解除赔偿金 (2N=${n}×2)`, amount: 2 * n * monthly, note: `2 × ${n}年 × ¥${monthly} = 违法解约双倍经济补偿` })
  } else if (type === 'protected') {
    items.push({ name: `三期女职工赔偿 (2N=${n}×2)`, amount: 2 * n * monthly, note: '孕期/产期/哺乳期不得解除，违法解除须双倍赔偿' })
    items.push({ name: '三期工资损失（至哺乳期满）', amount: monthly * 15, note: '主张恢复劳动关系或赔偿至哺乳期结束（约15个月）' })
  } else if (type === 'retaliatory') {
    items.push({ name: `报复解雇赔偿 (2N=${n}×2)`, amount: 2 * n * monthly, note: '因举报用工违法行为被违法解雇，双倍赔偿外另可主张精神损害赔偿' })
    items.push({ name: '精神惩罚性赔偿', amount: 5000, note: '具有惩戒性质的报复解雇可主张5000-50000不等精神损害赔偿' })
  } else {
    items.push({ name: `经济补偿金 (N=${n})`, amount: n * monthly, note: `${n}年 × ¥${monthly}` })
    items.push({ name: '代通知金 (+1个月)', amount: monthly, note: '未提前30天书面通知，额外支付1个月' })
  }
  return {
    total: items.reduce((s, i) => s + i.amount, 0),
    items,
    legalRefs: [
      { law: '劳动合同法', article: '47', summary: '经济补偿按工作年限，每满1年支付1个月工资（6个月以上按1年计）' },
      { law: '劳动合同法', article: '87', summary: '违法解除按经济补偿标准的2倍支付赔偿金' },
      { law: '劳动合同法', article: '42', summary: '三期女职工/工伤职工医疗期内等不得解除' },
    ]
  }
}

function calcAlgo(): CalcResult {
  const { loss, duration } = form.algo
  const items: CalcItem[] = [
    { name: '收入损失赔偿（直接损失）', amount: loss * duration, note: `月均损失¥${loss} × ${duration}个月` },
    { name: '维权成本（律师费+公证费）', amount: 5000, note: '胜诉后部分律师费可主张由败诉方承担' },
  ]
  return {
    total: items.reduce((s, i) => s + i.amount, 0),
    items,
    legalRefs: [
      { law: '个人信息保护法', article: '24', summary: '自动化决策应保证透明公平公正，不得实行不合理差别待遇' },
      { law: '互联网信息服务算法推荐管理规定', article: '22', summary: '算法应向劳动者提供便捷申诉和争议解决渠道' },
      { law: '关于维护新就业形态劳动者劳动保障权益的指导意见', article: '3', summary: '平台应完善算法规则，不得将最严苛算法要求强加于劳动者' },
    ]
  }
}

function calcOverwork(): CalcResult {
  const { hours, days, overtime_pay, months } = form.overwork
  const items: CalcItem[] = []
  if (hours > 8) {
    items.push({ name: '延时加班费 (1.5倍)', amount: Math.round(overtime_pay * months * 0.6), note: `月均加班${hours - 8}h/天，按1.5倍 ${months}个月累计` })
  }
  if (days >= 26) {
    items.push({ name: '休息日加班费 (2倍)', amount: Math.round(overtime_pay * months * 0.3), note: '超出21.75天法定工时部分按2倍计算' })
  }
  if (hours > 10) {
    items.push({ name: '违法超时加班罚则', amount: 100 * Math.round(days * months), note: '《劳动法》第90条：超时劳动每单位可处100-500元/人罚款' })
  }
  if (items.length === 0) {
    items.push({ name: '当前参数下未超过法定上限', amount: 0, note: '日均≤8h且月均≤21.75日 不构成违规超时加班' })
  }
  return {
    total: items.reduce((s, i) => s + i.amount, 0),
    items,
    legalRefs: [
      { law: '劳动法', article: '41', summary: '每日加班≤1h（特殊情况≤3h），月累计≤36h' },
      { law: '劳动法', article: '44', summary: '延时1.5倍 / 休息日2倍 / 法定休假日3倍' },
    ]
  }
}

function calc() {
  switch (currentScene.value) {
    case 'wage': result.value = calcWage(); break
    case 'injury': result.value = calcInjury(); break
    case 'dismiss': result.value = calcDismiss(); break
    case 'algorithm': result.value = calcAlgo(); break
    case 'overwork': result.value = calcOverwork(); break
  }
}

function resetForm() {
  if (currentScene.value === 'wage') {
    form.wage = { months: 3, monthly: 8000, percent: 50, hasContract: false, over1year: false }
  }
  calc()
  message.success('已重置')
}

// Default calc on load
calc()
</script>

<style scoped>
.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.scenario-card {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px 8px;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
}
.scenario-card:hover { border-color: #0d9488; }
.scenario-card.active { border-color: #0d9488; background: rgba(13,148,136,0.04); }
.sc-icon { width: 28px; height: 28px; margin: 0 auto 6px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #64748b; }
.scenario-card.active .sc-icon { background: #0d9488; color: #ffffff; }
.sc-name { font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 2px; }
.sc-basis { font-size: 10px; color: #94a3b8; }

.form-section { display: flex; flex-direction: column; gap: 10px; }
.form-item label { font-size: 12px; color: #475569; font-weight: 500; display: block; margin-bottom: 3px; }
.form-note { font-size: 11px; color: #94a3b8; margin-top: 4px; margin-bottom: 0; line-height: 1.5; }

.result-empty { text-align: center; color: #94a3b8; padding: 40px 0; font-size: 13px; }

.result-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px; background: #0d9488; color: #ffffff;
  border-radius: 6px; margin-bottom: 12px;
}
.result-total span { font-size: 12px; opacity: 0.85; }
.result-total strong { font-size: 20px; }

.info-icon { color: #0d9488; cursor: help; font-size: 11px; margin-left: 2px; }
.text-muted { color: #cbd5e1; }

.legal-refs { display: flex; flex-direction: column; gap: 3px; }
.lr-title { font-size: 11px; font-weight: 600; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.lr-item { font-size: 11px; color: #64748b; padding: 3px 0; border-left: 2px solid #e2e8f0; padding-left: 8px; }

.action-buttons { display: flex; gap: 8px; }

.hotline-bar {
  display: flex; gap: 14px; padding-top: 8px;
  border-top: 1px solid #f1f5f9; margin-top: 6px;
  font-size: 11px; color: #64748b; flex-wrap: wrap;
}
.hotline-bar span{white-space:nowrap;}
.hotline-bar b { color: #0f172a; }
</style>
