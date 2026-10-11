<template>
  <div>
    <!-- Header -->
    <n-card title="法律文书生成器 — 一键生成可提交的正式文件" class="card">
      <p class="desc">
        基于您在维权中心填写的参数和系统计算结果，自动生成符合格式要求的正式法律文书。
        生成后可复制或下载为文本文件，打印签字后直接提交给仲裁委或投诉窗口。
      </p>
    </n-card>

    <n-grid :x-gap="12" cols="1 l:3" responsive="screen" style="margin-top: 12px">
      <!-- Left: Document type & options -->
      <n-gi>
        <n-card title="选择文书类型" class="card">
          <div class="doc-type-list">
            <div v-for="doc in docTypes" :key="doc.id"
                 :class="['doc-type-item', { active: activeDoc === doc.id }]"
                 @click="activeDoc = doc.id">
              <div class="dt-icon">{{ doc.icon }}</div>
              <div class="dt-info">
                <div class="dt-name">{{ doc.name }}</div>
                <div class="dt-desc">{{ doc.desc }}</div>
              </div>
            </div>
          </div>
        </n-card>

        <n-card title="填写基本信息" class="card" style="margin-top: 12px">
          <div class="form-section">
            <div class="form-item">
              <label>您的姓名</label>
              <n-input v-model:value="userInfo.name" placeholder="申请人姓名" />
            </div>
            <div class="form-item">
              <label>联系电话</label>
              <n-input v-model:value="userInfo.phone" placeholder="手机号码" />
            </div>
            <div class="form-item">
              <label>身份证号</label>
              <n-input v-model:value="userInfo.id" placeholder="仅用于文书" />
            </div>
            <div class="form-item">
              <label>平台名称</label>
              <n-input v-model:value="userInfo.platform" placeholder="如：美团、饿了么、滴滴" />
            </div>
            <div class="form-item">
              <label>所属城市</label>
              <n-select v-model:value="userInfo.city" :options="[
                { label: '广州', value: '广州市' },
                { label: '深圳', value: '深圳市' },
                { label: '东莞', value: '东莞市' },
                { label: '佛山', value: '佛山市' },
                { label: '珠海', value: '珠海市' },
                { label: '中山', value: '中山市' },
              ]" />
            </div>
            <div class="form-item">
              <label>争议发生日期</label>
              <n-date-picker v-model:value="userInfo.date" type="date" style="width:100%" />
            </div>
          </div>
        </n-card>
      </n-gi>

      <!-- Center & Right: Document preview -->
      <n-gi :span="2">
        <n-card class="card">
          <template #header>
            <div class="preview-head">
              <span class="preview-title">{{ activeDocType.name }} — 预览</span>
              <div class="preview-actions">
                <n-button size="small" @click="copyDoc">
                  <template #icon><span class="btn-icon">📋</span></template>
                  一键复制
                </n-button>
                <n-button size="small" type="primary" @click="downloadDoc">
                  <template #icon><span class="btn-icon">⬇</span></template>
                  下载文书
                </n-button>
              </div>
            </div>
          </template>

          <div class="doc-preview" ref="previewRef">
            <pre class="doc-content">{{ generatedDoc }}</pre>
          </div>
        </n-card>

        <n-card title="使用说明" class="card" style="margin-top: 12px">
          <ol class="usage-list">
            <li>确认左侧信息无误后点击"一键复制"或"下载文书"</li>
            <li>打印后签字按手印（所有涉及您签名处均需手印）</li>
            <li>一式两份：一份提交仲裁委/投诉窗口，一份自留</li>
            <li>所有证据材料复印一份作为附件一并提交</li>
            <li>首次提交时要求收件窗口出具《收件回执》</li>
          </ol>
          <n-divider style="margin:8px 0" />
          <div class="warning-box">
            <strong>注意：</strong>本工具生成的文书仅供参考格式，建议在提交前通过 12348 法律援助热线或当地法援中心审核确认。
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { NCard, NGrid, NGi, NInput, NSelect, NDatePicker, NButton, NDivider, useMessage } from 'naive-ui'

const message = useMessage()
const activeDoc = ref('arbitration')

const docTypes = [
  { id: 'arbitration', name: '劳动仲裁申请书', icon: '⚖', desc: '请求仲裁委裁决被申请人支付补偿/赔偿' },
  { id: 'complaint', name: '行政投诉书', icon: '📮', desc: '向劳动监察/市场监管部门投诉举报' },
  { id: 'evidence', name: '证据清单', icon: '📋', desc: '系统化整理所有证据材料' },
  { id: 'demand', name: '维权诉求函', icon: '✉', desc: '先向平台发送正式书面诉求函' },
]

const activeDocType = computed(() => docTypes.find(d => d.id === activeDoc.value)!)

const userInfo = reactive({
  name: '',
  phone: '',
  id: '',
  platform: '美团',
  city: '广州市',
  date: Date.now(),
})

const previewRef = ref<HTMLElement>()
const formattedDate = computed(() => {
  const d = new Date(userInfo.date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const todayDate = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

// --- Arbitration Application ---
const arbitrationDoc = computed(() => {
  const { name, phone, id, platform, city } = userInfo
  return `${city}劳动人事争议仲裁委员会

仲 裁 申 请 书

申请人：${name || '___'}，男/女，____族，____年__月__日出生
地址：${city}____区____路____号
身份证号：${id || '________________'}
联系电话：${phone || '________________'}

被申请人：${platform}运营主体公司
地址：${city}____区____路____号
法定代表人/负责人：____  职务：____

仲裁请求：
1. 裁决被申请人支付拖欠工资人民币________元；
2. 裁决被申请人支付加付赔偿金人民币________元（按拖欠金额50%计算）；
3. 裁决被申请人支付未签订书面劳动合同双倍工资差额人民币________元；
4. 裁决被申请人支付解除劳动合同赔偿金人民币________元；
5. 裁决被申请人支付工伤医疗费、停工留薪期工资等合计人民币________元。
（以上合计：人民币________元）

事实与理由：
申请人于____年__月__日起在${platform}平台从事外卖骑手/网约车司机工作。工作期间，被申请人存在下述严重违反劳动法律法规的行为：

一、未依法按时足额支付劳动报酬。自____年__月起，被申请人累计拖欠申请人工资____个月，合计人民币____元。

二、未依法与申请人签订书面劳动合同。申请人入职后至今，被申请人始终未与其订立书面劳动合同。

三、未依法为申请人缴纳社会保险费。被申请人未依法为申请人缴纳养老保险、医疗保险、工伤保险等社会保险。

四、____（其他侵权事实：如不合理处罚、强制远距离派单、违法封号等）。

综上所述，被申请人的上述行为已严重违反了《中华人民共和国劳动合同法》《中华人民共和国社会保险法》以及《新就业形态劳动者权益保障办法》等有关法律法规规定。为维护申请人合法权益，特依法向你委提出仲裁申请，请求依法支持申请人全部仲裁请求。

此致

${city}劳动人事争议仲裁委员会

    申请人（签名/指印）：${'________'}
    ${todayDate.value}

附：
1. 申请人身份证复印件 1 份
2. 被申请人企业信用信息公示报告 1 份
3. 证据清单及证据材料 1 套
4. 仲裁申请书副本 ____ 份（与被申请人数量一致）`
})

// --- Complaint Letter ---
const complaintDoc = computed(() => {
  const { name, phone, id, platform, city } = userInfo
  return `${city}人力资源和社会保障局 / 劳动监察大队

行 政 投 诉 书

投诉人：${name || '___'}
身份证号：${id || '________________'}
联系电话：${phone || '________________'}
住址：${city}____区____路____号

被投诉人：${platform}（平台运营主体）
地址：${city}____区____路____号

投诉事项：
投诉人在${platform}平台（外卖骑手/网约车司机）工作期间，被投诉人存在以下违反劳动保障法律法规的行为：
□ 未依法按时足额支付劳动报酬（欠薪/克扣/罚款）
□ 未依法签订书面劳动合同
□ 未依法缴纳社会保险费
□ 违反工作时间规定强制超时劳动
□ 不合理扣款/处罚机制
□ 其他侵害劳动者合法权益的行为

具体事实与理由：
投诉人于____年__月入职被投诉人平台，从事____工作。自____年__月起，被投诉人存在上述违反劳动保障法律法规的违法行为，严重损害了投诉人的合法权益。

具体表现如下：
1. _____________________________________________________________
2. _____________________________________________________________
3. _____________________________________________________________

被投诉人的上述行为违反了《中华人民共和国劳动法》《中华人民共和国劳动合同法》以及人力资源和社会保障部等八部门《关于维护新就业形态劳动者劳动保障权益的指导意见》等规定。

投诉请求：
1. 依法对被投诉人违反劳动保障法律法规的行为进行查处并责令改正；
2. 责令被投诉人立即支付拖欠投诉人的工资人民币____元；
3. 责令被投诉人依法与投诉人订立书面劳动合同；
4. 责令被投诉人依法为投诉人补缴社会保险费；
5. 对投诉人的个人信息及投诉事项依法予以保密。

此致

${city}人力资源和社会保障局
${city}劳动保障监察大队

    投诉人（签名/指印）：${'________'}
    ${todayDate.value}

附件：
1. 投诉人身份证复印件
2. 工资发放记录截图
3. 扣款/罚款通知截图
4. 考勤/在线时长记录
5. 平台APP工单记录
6. 其他相关证据材料`
})

// --- Evidence List ---
const evidenceDoc = computed(() => {
  const { platform } = userInfo
  return `劳动仲裁 / 投诉案件
证 据 清 单 与 说 明

申请人/投诉人：${userInfo.name || '________'}
被申请人/被投诉人：${userInfo.platform}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
序号 │ 证据名称  │ 页数 │ 证明目的
━━━━━━━━━━━━━━━━━━━━━━━━━━━

一、劳动关系证据

 1  │ ${platform}APP注册信息截图（个人中心含手机号、实名认证）
    │      │ 页 │ 证明双方存在服务/劳动关系
 2  │ 银行流水（标注"${platform}"的报酬转账记录，盖银行业务章）
    │      │ 页 │ 证明收入金额、发放周期及双方关系
 3  │ 工牌/工服/配送箱照片
    │      │ 页 │ 证明实际提供劳动的事实
 4  │ 工作群聊天记录截图
    │      │ 页 │ 证明与平台的从属关系
 5  │ 考勤/在线时长/系统派单记录
    │      │ 页 │ 证明实际工作时间和工作量
 6  │ 平台服务协议/电子合同
    │      │ 页 │ 证明双方权利义务约定

二、侵权事实证据

 7  │ 工资明细截图（标注扣款项目及金额）
    │      │ 页 │ 证明拖欠/克扣的具体金额
 8  │ 扣款通知截图及扣款原因说明
    │      │ 页 │ 证明不合理扣款行为
 9  │ 派单记录截图
    │      │ 页 │ 证明不合理派单/强制接单
10  │ 处罚/封号通知
    │      │ 页 │ 证明违规处罚行为
11  │ 平台客服工单记录及回复
    │      │ 页 │ 证明已按内部程序主张权利
12  │ 微信/电话沟通记录截图
    │      │ 页 │ 证明已向平台提出异议

三、工伤专用证据

13  │ 交通事故责任认定书（如适用）
    │      │ 页 │ 证明事故责任划分
14  │ 医院诊断证明/出院小结
    │      │ 页 │ 证明伤情及医疗方案
15  │ 医疗费发票及费用清单（原件）
    │      │ 页 │ 证明医疗费用金额
16  │ 劳动能力鉴定结论（如已申请）
    │      │ 页 │ 证明伤残等级

四、维权成本证据

17  │ 律师费发票（如聘请律师）
    │      │ 页 │ 证明维权合理开支
18  │ 交通费发票
    │      │ 页 │ 证明维权期间合理费用

━━━━━━━━━━━━━━━━━━━━━━━━━━━

证据说明：
1. 以上证据来源合法，客观真实；
2. 电子证据已通过可信时间戳或公证云等方式认证固定；
3. 所有复印件与原件一致。

    申请人/投诉人（签章）：${'________'}
    ${todayDate.value}`
})

// --- Demand Letter ---
const demandDoc = computed(() => {
  const { name, phone, platform, city } = userInfo
  return `正 式 维 权 诉 求 函

致：${platform}平台运营主体公司 / 法务部 / 投诉处理中心

发自：${name || '________'}
争议发生日期：${formattedDate.value}
联系电话：${phone || '________'}
平台账号（注册手机号）：________________
所在城市：${city}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

尊敬的${platform}平台：

本人${name || '____'}自____年__月__日起在贵平台从事外卖配送/网约车驾驶工作。
现就贵平台对本人作出的以下处理决定，正式提出书面异议及维权诉求：

一、事实经过

（详细描述事件发生的时间、经过、具体情形）
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

二、贵平台处理决定

贵平台于____年__月__日通过APP通知/系统消息通知本人：
□ 扣款 ____元，扣款原因：__________________
□ 账户被限制/冻结/永久封禁
□ 其他：_________________________________

三、本人异议及诉求

1. 贵平台的上述处理认定事实不清/证据不足/违反程序正当原则；
2. 贵平台扣款/处罚所依据的平台规则违反相关法律法规；
3. 现正式要求贵平台：

   （1）在收到本函之日起 3 个工作日内撤销对本人作出的上述处理决定；
   （2）在收到本函之日起 7 个工作日内补还扣款/恢复账户至正常状态；
   （3）赔偿因上述处理给本人造成的直接收入损失人民币____元；
   （4）就上述处理决定出具书面说明，并保留进一步公开回应的权利。

四、后续措施

如贵平台未在上述期限内妥善处理，本人将依法采取以下措施：
1. 向劳动监察部门/市场监管部门投诉举报；
2. 向劳动人事争议仲裁委员会申请仲裁；
3. 向人民法院提起诉讼；
4. 通过国务院"互联网+督查"平台反映；
5. 向新闻媒体及社会公众合理披露事件经过。

望贵平台在收到本函后 3 个工作日内回复本人。

联系方式：${phone || '________'}
通讯地址：${city}____区____路____号

    发自：${name || '________'}（签名/指印）
    ${todayDate.value}

（本函一式两份：一份通过APP工单/EMS快递发送贵平台，一份本人留存）`
})

const generatedDoc = computed(() => {
  switch (activeDoc.value) {
    case 'arbitration': return arbitrationDoc.value
    case 'complaint': return complaintDoc.value
    case 'evidence': return evidenceDoc.value
    case 'demand': return demandDoc.value
    default: return ''
  }
})

function copyDoc() {
  navigator.clipboard.writeText(generatedDoc.value).then(() => {
    message.success('已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败，请手动选择文本复制')
  })
}

function downloadDoc() {
  const blob = Blob ? new Blob([generatedDoc.value], { type: 'text/plain;charset=utf-8' }) : null
  if (!blob) {
    message.error('当前浏览器不支持下载')
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${activeDocType.value.name}_${todayDate.value.replace(/[年月日]/g, '_').replace(/__/, '')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  message.success('文书已下载')
}
</script>

<style scoped>
.card { background: #ffffff !important; border: 1px solid #e2e8f0 !important; }
.desc { color: #64748b; font-size: 13px; margin-bottom: 0; line-height: 1.6; }

.doc-type-list { display: flex; flex-direction: column; gap: 6px; }
.doc-type-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border: 1px solid #e2e8f0;
  border-radius: 4px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.doc-type-item:hover { border-color: #0d9488; }
.doc-type-item.active { border-color: #0d9488; background: rgba(13,148,136,0.04); }
.dt-icon { font-size: 18px; flex-shrink: 0; }
.dt-info { display: flex; flex-direction: column; gap: 2px; }
.dt-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.dt-desc { font-size: 11px; color: #94a3b8; }

.form-section { display: flex; flex-direction: column; gap: 10px; }
.form-item label { font-size: 12px; color: #475569; font-weight: 500; display: block; margin-bottom: 3px; }

.preview-head { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.preview-title { font-size: 14px; font-weight: 600; color: #0f172a; }
.preview-actions { display: flex; gap: 6px; }
.btn-icon { font-size: 12px; }

.doc-preview {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;
  max-height: 560px; overflow: auto;
}
.doc-content {
  font-family: 'SimSun', '宋体', 'Noto Serif SC', serif;
  font-size: 12px; line-height: 1.8; color: #334155;
  padding: 16px; margin: 0; white-space: pre-wrap;
  word-break: break-all;
}

.usage-list { padding-left: 20px; margin: 0; }
.usage-list li { font-size: 12px; color: #64748b; line-height: 1.8; }

.warning-box {
  background: #fef3c7; border: 1px solid #fde68a;
  border-radius: 4px; padding: 8px 12px;
  font-size: 12px; color: #92400e; line-height: 1.6;
}
</style>
