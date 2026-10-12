<template>
  <div>
    <n-card title="政策百科 — 法规依据与维权指引" class="card">
      <p class="desc">
        本页每条政策均标注文件名、文号、施行状态与原文链接。标注「待核实」的条目尚无权威出处，请勿对外引用。
      </p>
    </n-card>

    <n-tabs type="line" v-model:value="tab" style="margin-top: 12px">
      <n-tab-pane name="national" tab="国家级">
        <n-card class="card" style="margin-top: 0">
          <div v-for="p in policies.national" :key="p.id" class="policy-item">
            <div class="pi-head">
              <n-tag :type="statusType(p.status)" size="small" :bordered="false">{{ p.status }}</n-tag>
              <strong class="pi-title">{{ p.title }}</strong>
            </div>
            <div class="pi-meta">
              <span v-if="p.docNo" class="pi-doc">{{ p.docNo }}</span>
              <span v-if="p.effectiveFrom">施行/报送：{{ p.effectiveFrom }}</span>
              <a v-if="p.url" :href="p.url" target="_blank" rel="noopener noreferrer" class="pi-link">原文</a>
            </div>
            <p class="pi-summary">{{ p.summary }}</p>
            <p v-if="p.caveat" class="pi-caveat">注意：{{ p.caveat }}</p>
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="guangdong" tab="广东省 / 广州">
        <n-card class="card" style="margin-top: 0">
          <div v-for="p in policies.guangdong" :key="p.id" class="policy-item">
            <div class="pi-head">
              <n-tag :type="statusType(p.status)" size="small" :bordered="false">{{ p.status }}</n-tag>
              <strong class="pi-title">{{ p.title }}</strong>
            </div>
            <div class="pi-meta">
              <span v-if="p.docNo" class="pi-doc">{{ p.docNo }}</span>
              <span v-if="p.effectiveFrom">施行/报送：{{ p.effectiveFrom }}</span>
              <a v-if="p.url" :href="p.url" target="_blank" rel="noopener noreferrer" class="pi-link">原文</a>
            </div>
            <p class="pi-summary">{{ p.summary }}</p>
            <p v-if="p.caveat" class="pi-caveat">注意：{{ p.caveat }}</p>
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="sources" tab="本城数据溯源">
        <n-card class="card" style="margin-top: 0" title="当前城市参数逐条溯源">
          <p class="desc" style="margin-bottom:10px">
            测算页的每个外部参数都来自左侧规则文件，此处展示其出处与置信度。
            <strong>official</strong>=已回溯官方原文；<strong>derived</strong>=据官方口径推算；<strong>unverified</strong>=无权威来源，仅作占位。
          </p>
          <n-empty v-if="!rule" description="规则文件未加载" />
          <div v-else>
            <div v-for="(s, key) in rule.sources" :key="key" class="src-item">
              <div class="src-head">
                <n-tag :type="s.confidence === 'official' ? 'success' : s.confidence === 'derived' ? 'warning' : 'error'"
                       size="small" :bordered="false">{{ s.confidence }}</n-tag>
                <span class="src-key">{{ FIELD_LABELS[key] || key }}</span>
                <a v-if="s.url" :href="s.url" target="_blank" rel="noopener noreferrer" class="pi-link">原文</a>
              </div>
              <div class="src-title">{{ s.title }}<span v-if="s.docNo" class="pi-doc">{{ s.docNo }}</span></div>
              <div class="src-meta">
                <span v-if="s.issuedBy">{{ s.issuedBy }} · </span>
                <span v-if="s.effectiveFrom">生效：{{ s.effectiveFrom }} · </span>
                <span>核对于 {{ s.retrievedAt }}</span>
              </div>
              <p v-if="s.note" class="src-note">{{ s.note }}</p>
            </div>
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="relief" tab="权益救济">
        <n-grid :x-gap="12" cols="1 s:2" responsive="screen" style="margin-top: 0">
          <n-gi v-for="(item, i) in reliefGuide" :key="i">
            <n-card class="card" style="height: 100%">
              <template #header>
                <span class="pi-title">{{ item.title }}</span>
              </template>
              <n-steps :current="item.steps.length" size="small" vertical>
                <n-step v-for="(step, j) in item.steps" :key="j" :title="`步骤 ${j+1}`">
                  <span class="step-text">{{ step }}</span>
                </n-step>
              </n-steps>
            </n-card>
          </n-gi>
        </n-grid>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NCard, NTabs, NTabPane, NGrid, NGi, NTag, NSteps, NStep, NEmpty } from 'naive-ui'
import { useMainStore } from '../stores/main'

const store = useMainStore()
const rule = computed(() => store.rule)
const tab = ref('national')

const FIELD_LABELS: Record<string, string> = {
  pension: '养老保险缴费基数上下限',
  pensionRate: '养老保险缴费比例',
  medical: '医疗保险缴费规则',
  medicalBase: '医疗保险缴费基数上下限',
  tax: '劳务报酬累计预扣',
  taxPlatform: '平台涉税信息报送规定',
  income: '平台接单计价规则',
  minimumWage: '最低工资标准',
  retirement: '养老金计发公式与假设',
}

type Status = '已施行' | '试点扩围' | '待核实' | '企业披露'
const statusType = (s: Status) => s === '已施行' ? 'success' : s === '待核实' ? 'error' : 'warning'

interface Policy {
  id: number
  title: string
  status: Status
  docNo?: string
  effectiveFrom?: string
  url?: string
  summary: string
  caveat?: string
}

const policies: { national: Policy[]; guangdong: Policy[] } = {
  national: [
    {
      id: 1, title: '关于维护新就业形态劳动者劳动保障权益的指导意见', status: '已施行',
      docNo: '人社部发〔2021〕56号', effectiveFrom: '2021-07',
      url: 'https://hrss.sz.gov.cn/ztfw/xjyxtfwbzzt/xjyxtldzzcwj/content/post_10413952.html',
      summary: '确立三分法用工关系，要求平台对"不完全符合确立劳动关系情形"的劳动者保障劳动报酬、休息、职业安全等权益，并推动职业伤害保障试点。',
      caveat: '网传"新就业形态劳动者权益保障办法"这一国家级规章并不存在，本项目早前版本误引，现以本文件为准。',
    },
    {
      id: 2, title: '互联网平台企业涉税信息报送规定', status: '已施行',
      docNo: '国务院令第810号', effectiveFrom: '2025-06-20 公布，2025-10 首次报送',
      url: 'https://www.mee.gov.cn/zcwj/gwywj/202506/t20250624_1121806.shtml',
      summary: '要求平台向税务机关报送平台内经营者和从业人员涉税信息。',
      caveat: '官方解读明确：在平台内从事配送、运输、家政等便民劳务活动的从业人员，其收入信息免予报送。外卖骑手的收入不在该规定报送范围内，本产品的个税测算属自行申报口径下的估算，不是平台代扣结果。',
    },
    {
      id: 3, title: '关于扩大新就业形态人员职业伤害保障试点的通知', status: '试点扩围',
      docNo: '人社部等九部门，2025-08',
      url: 'https://guangdong.chinatax.gov.cn/gdsw/zjfg/2025-08/18/content_8a392a22eed04f0f9477c8ee5294cbeb.shtml',
      summary: '2026年推动职业伤害保障试点在全国31个省份和新疆生产建设兵团实施，出行、即时配送、同城货运三个行业平台企业总体纳入。',
      caveat: '职业伤害保障由平台按单缴费，不构成骑手个人支出；其待遇标准与工伤保险不同，不可等同表述。',
    },
    {
      id: 4, title: '新就业形态劳动者休息和劳动报酬权益保障指引 / 劳动规则公示指引 / 权益维护服务指南', status: '已施行',
      docNo: '人社部办公厅 2023', url: '',
      summary: '要求平台公开算法规则、合理确定计件单价与抽成比例，并订立书面协议。',
      caveat: '原文页面待补链接；"书面协议订立指引"这一单独文件名不准确，实际为上述"两指引一指南"。',
    },
  ],
  guangdong: [
    {
      id: 1, title: '广东省灵活就业人员参加企业职工基本养老保险办法', status: '已施行',
      docNo: '粤人社规〔2026〕14号', effectiveFrom: '2026-05-01',
      url: 'https://hrss.sz.gov.cn/szsi/sbjxxgk/zcfggfxwj/zcfg/sbzs/content/post_12855003.html',
      summary: '第七条：缴费比例20%，其中12%记入统筹基金、8%记入个人账户；第六条：在参保地企业职保缴费基数上下限范围内自选基数。',
    },
    {
      id: 2, title: '关于公布2026年职工基本养老保险缴费基数上下限有关问题的通知', status: '已施行',
      docNo: '粤人社发〔2026〕24号', effectiveFrom: '下限2026-01-01，上限与下限调整自2026-07-01',
      url: 'https://guangdong.chinatax.gov.cn/gdsw/ssfggds/2026-10/08/content_b40dcb7bf605411fbb12e0f81281dc6b.shtml',
      summary: '缴费基数下限自2026-01-01起全省统一为5510元，不再划分片区；自2026-07-01起，下限调整为5521元、上限调整为27603元。',
      caveat: '深圳此前按本市口径单列较低下限，2026年起并入全省统一标准，跨口径历史对比数据不可直接混用。因调整产生的补差在本社保年度内缴纳视为正常缴费。',
    },
    {
      id: 3, title: '广东省人民政府关于调整我省最低工资标准的通知', status: '已施行',
      docNo: '粤府2026年调整通知', effectiveFrom: '2026-09-01',
      url: 'https://www.sz.gov.cn/cn/xxgk/zfxxgj/zwdt/content/post_12936470.html',
      summary: '广州一类2680元/月、深圳一类2700元/月，广深非全日制小时最低工资均为25.4元/小时；二类2300元/月（东莞执行）。',
      caveat: '早前版本使用的"深圳小时最低工资22.2元"已失效，测算与文案均已改为25.4元。东莞非全日制小时最低工资18.9元未能回溯到原文表格数值，标记待核实。',
    },
    {
      id: 4, title: '广州市职工医疗保险和生育保险筹资标准的通知', status: '已施行',
      docNo: '穗医保规字〔2026〕4号', effectiveFrom: '2027-01-01（2026年内沿用〔2022〕1号）',
      url: 'https://www.gz.gov.cn/gzybj/gkmlpt/content/11/11029/post_11029015.html',
      summary: '灵活就业人员应当按其缴费基数的8%按月足额缴纳职工基本医疗保险费；缴费基数为本人申报的工资收入，上限为本市上上年度全口径城镇单位就业人员月平均工资的300%，下限为60%。',
      caveat: '2026年度具体上下限（上限31170/下限6234）据广州税务公布并经南方日报等一致转述核对，尚未回溯到税务官网逐年发布的原始公告页面，标记为 derived。',
    },
    {
      id: 5, title: '深圳市医疗保障局：2026年度职工医保缴费基数与费率提示', status: '已施行',
      effectiveFrom: '2026-01-01 至 2026-12-31',
      url: 'https://hsa.sz.gov.cn/xwzx/tzgg/content/post_12567884.html',
      summary: '深圳职工基本医疗保险和生育保险缴费基数下限6727元、上限33633元；自2026-01-01起，灵活就业人员缴费费率由7%恢复为8%。依据《深圳市医疗保障办法》（深圳市人民政府令第358号）第九条，灵活就业人员参加职工医保一档，以本人申报的月工资收入为基数按8%缴纳。',
      caveat: '深圳医保分一档/二档，灵活就业人员一律参加一档，费率8%为全市统一口径，不随收入变化。',
    },
    {
      id: 6, title: '东莞市2026年度医疗保险缴费基数和费率表 / 东府规〔2026〕5号', status: '已施行',
      docNo: '东府规〔2026〕5号', effectiveFrom: '基数表2026-01-01起；费率调整2026-07-01起',
      url: 'https://www.dg.gov.cn/zwgk/zfxxgkml/szfbgs/zcwj/gfxwj/content/post_4554768.html',
      summary: '东莞职工医保缴费基数下限4775元、上限27549元。灵活就业人员分档：单建统筹3.65%（2026-07-01起由3.5%调整）、统账结合无个账4.3%、统账结合有个账6.3%，可另自愿参加大额补助0.5%。单位和个人部分均由本人承担。',
      caveat: '东莞无单一法定医保费率，档次不同直接决定参保成本与退休医保待遇。本产品默认按单建统筹（最低档）测算，用户应在参数栏按实际参保档次切换。',
    },
    {
      id: 7, title: '广州市总工会"蓝宝书"与集体协商、新就业形态形态工会建会入会', status: '待核实',
      summary: '网传将平台算法规则纳入集体协商参考，并称"骑手平均年薪超15万元"。',
      caveat: '该年薪数字未回溯到工会原文报告，且与本产品测算的广州骑手年毛收入约11万元存在明显差距，暂不用于任何测算，仅作线索保留。',
    },
  ],
}

const reliefGuide = [
  { title: '发生职业伤害怎么办？', steps: ['立即就医并保留病历、诊断证明、费用发票原件', '保留接单记录、事故现场证据、报警或交通事故责任认定书', '先走平台侧职业伤害保障报案（由平台按单缴费）', '若主张劳动关系工伤，向人社局申请工伤认定（个人申请时效1年）', '必要时申请劳动仲裁，或拨打12351工会维权热线'] },
  { title: '平台拖欠/乱扣报酬？', steps: ['保留APP报酬明细和扣款记录截图（含时间戳）', '平台客服工单申诉并留存书面回复', '拨打12333人社热线或向劳动保障监察机构投诉', '注意：若无法确认劳动关系，可能按民事服务合同争议处理', '必要时申请劳动仲裁（免费）或向法院起诉'] },
  { title: '如何自己交社保？', steps: ['粤省事小程序或粤税通 → 灵活就业人员缴费登记', '养老可在全省统一上下限（5521–27603元）内自选基数，费率20%（粤人社发〔2026〕24号、粤人社规〔2026〕14号）', '医保以本人申报收入为基数：广州、深圳费率均为8%（基数分别为6234–31170、6727–33633）', '东莞医保分档，单建统筹3.65%、统账结合无个账4.3%、有个账6.3%，基数4775–27549，需按实际参保档次选择', '绑定银行卡按月扣费', '仅需养老+医保两项，职业伤害保障由平台缴费，个人无需缴纳'] },
]
</script>

<style scoped>
.card { background: #ffffff !important; border: 1px solid #e2e8f0 !important; }
.desc { color: #64748b; font-size: 13px; margin-bottom: 0; }

.policy-item { padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
.policy-item:last-child { border-bottom: none; }
.pi-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.pi-title { font-size: 14px; color: #0f172a; font-weight: 600; }
.pi-summary { color: #64748b; font-size: 13px; line-height: 1.6; margin-bottom: 4px; }
.pi-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 11px; color: #94a3b8; margin-bottom: 5px; }
.pi-doc { color: #0f766e; background: rgba(13,148,136,0.07); border-radius: 3px; padding: 1px 6px; font-weight: 600; }
.pi-link { color: #0d9488; text-decoration: none; border-bottom: 1px solid rgba(13,148,136,0.3); }
.pi-link:hover { border-bottom-color: #0d9488; }
.pi-caveat { font-size: 12px; color: #b45309; background: #fffbeb; border-left: 2px solid #d97706; padding: 6px 8px; border-radius: 0 3px 3px 0; margin: 6px 0 0; line-height: 1.5; }

.src-item { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.src-item:last-child { border-bottom: none; }
.src-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.src-key { font-size: 12px; font-weight: 600; color: #0f172a; }
.src-title { font-size: 12px; color: #334155; margin-bottom: 3px; }
.src-meta { font-size: 11px; color: #94a3b8; margin-bottom: 3px; }
.src-note { font-size: 11px; color: #64748b; line-height: 1.5; margin: 0; }

.step-text { color: #64748b; font-size: 12px; }
</style>
