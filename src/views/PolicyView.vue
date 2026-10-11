<template>
  <div>
    <n-card title="政策百科 — 三级法规与权益指南" class="card">
      <p class="desc">
        从国家到省市、从平台到个人，一站式梳理灵活就业相关政策法规。所有内容基于公开政策文件，仅供参考。
      </p>
    </n-card>

    <n-tabs type="line" v-model:value="tab" style="margin-top: 12px">
      <n-tab-pane name="national" tab="国家级">
        <n-card class="card" style="margin-top: 0">
          <div v-for="p in policies.national" :key="p.id" class="policy-item">
            <div class="pi-head">
              <n-tag :type="p.priority === 2 ? 'warning' : 'info'" size="small" :bordered="false">
                {{ p.priority === 2 ? '征求意见' : '已施行' }}
              </n-tag>
              <strong class="pi-title">{{ p.title }}</strong>
            </div>
            <p class="pi-summary">{{ p.summary }}</p>
            <div class="pi-value">{{ p.value }}</div>
          </div>
        </n-card>
      </n-tab-pane>

      <n-tab-pane name="guangdong" tab="广东省">
        <n-card class="card" style="margin-top: 0">
          <div v-for="p in policies.guangdong" :key="p.id" class="policy-item">
            <div class="pi-head">
              <n-tag type="success" size="small" :bordered="false">已施行</n-tag>
              <strong class="pi-title">{{ p.title }}</strong>
            </div>
            <p class="pi-summary">{{ p.summary }}</p>
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

      <n-tab-pane name="platform" tab="平台规则">
        <n-card class="card" style="margin-top: 0">
          <n-table :bordered="false" :single-line="false" size="small">
            <thead><tr><th>平台</th><th>计价要素</th><th>高峰倍率</th><th>保障</th></tr></thead>
            <tbody>
              <tr v-for="row in platformRules" :key="row.platform">
                <td><strong>{{ row.platform }}</strong></td>
                <td>{{ row.pricing }}</td>
                <td>{{ row.peakRate }}</td>
                <td>
                  <n-tag v-for="t in row.insurance" :key="t" size="small" type="info" style="margin-right:4px">{{ t }}</n-tag>
                </td>
              </tr>
            </tbody>
          </n-table>
        </n-card>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NTabs, NTabPane, NGrid, NGi, NTag, NSteps, NStep, NTable } from 'naive-ui'

const tab = ref('national')

const policies = {
  national: [
    { id: 1, title: '新就业形态劳动者权益保障办法', priority: 1, summary: '人社部发布，明确平台应承担用工责任，保障劳动者获得劳动报酬、休息休假、职业安全等基本权益。', value: '首次从国家层面为灵活就业者提供统一保障框架' },
    { id: 2, title: '互联网平台企业涉税信息报送规定（810号令）', priority: 1, summary: '2025年6月施行，要求平台按累计预扣法预扣预缴从业人员劳务报酬个税。', value: '税务合规有据可依，税负透明化' },
    { id: 3, title: '职业伤害保障办法', priority: 1, summary: '美团出资15亿元为600多万骑手缴纳职业伤害保障，全国推广中。', value: '外卖骑手首次获得类工伤保险覆盖' },
    { id: 4, title: '新就业形态劳动者书面协议订立指引', priority: 2, summary: '明确平台应与不完全符合确立劳动关系的劳动者订立书面协议。', value: '书面协议具有法律约束力' },
  ],
  guangdong: [
    { id: 1, title: '广东省灵活就业人员社保补贴', summary: '就业困难人员和毕业2年内高校毕业生，每月可领600元补贴，最长3年，距退休5年内可延至退休。申请渠道：广东公共就业服务云平台。' },
    { id: 2, title: '新就业形态劳动者建会入会集中行动', summary: '依托粤工惠平台，外卖骑手、网约车司机可线上加入工会，享受维权服务和福利。全省已建新就业形态工会组织3000多个。' },
    { id: 3, title: '广州市总工会蓝宝书', summary: '首次将平台算法规则（派单、计价、考核等）纳入集体协商参考，骑手平均年薪超15万元（2025）。' },
    { id: 4, title: '深圳新就业形态劳动报酬指引', summary: '规定外卖骑手小时最低工资标准为22.2元，明确法定节假日工作时间应计发额外报酬。' },
  ]
}

const reliefGuide = [
  { title: '发生工伤怎么办？', steps: ['立即报警并保留现场证据', '就医保留所有病历和费用单据', '向人社局申请工伤认定（30日内）', '必要时申请劳动仲裁', '联系工会法援热线：12351'] },
  { title: '平台拖欠/乱扣工资？', steps: ['保留APP工资明细和扣款记录截图', '平台客服申诉并留存记录', '拨打12333人社热线投诉', '向劳动监察大队举报', '必要时申请劳动仲裁（免费）'] },
  { title: '如何自己交社保？', steps: ['微信粤省事小程序 → 社保服务', '办理灵活就业人员缴费登记', '选择缴费基数（平均工资60%-300%）', '绑定银行卡按月自动扣费', '也可通过粤税通办理'] },
]

const platformRules = [
  { platform: '美团', pricing: '起步价¥3.5 + 距离 + 重量 + 时段', peakRate: '1.2-1.4x', insurance: ['职业伤害', '商业意外'] },
  { platform: '饿了么', pricing: '起步价¥4 + 距离 + 重量', peakRate: '1.2-1.5x', insurance: ['职业伤害', '雇主责任'] },
  { platform: '滴滴', pricing: '起步价¥8 + 里程 + 时长 + 远途', peakRate: '1.0-1.6x', insurance: ['商业险'] },
  { platform: '顺丰同城', pricing: '起步价¥5 + 距离 + 难度', peakRate: '1.2-1.3x', insurance: ['商业意外', '雇主责任'] },
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
.pi-value { font-size: 12px; color: #0d9488; padding-left: 8px; border-left: 2px solid #0d9488; }

.step-text { color: #64748b; font-size: 12px; }
</style>
