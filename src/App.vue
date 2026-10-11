<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-layout position="absolute">
        <n-layout-header bordered class="header">
          <div class="header-inner">
            <!-- Brand -->
            <div class="brand">
              <div class="brand-icon">
                <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
                </svg>
              </div>
              <span class="brand-name">灵算</span>
              <span class="brand-ver">PRO</span>
            </div>

            <!-- Nav -->
            <nav class="nav">
              <a v-for="item in navItems" :key="item.key"
                 :class="['nav-item', { active: activeKey === item.key }]"
                 @click="onNav(item.key)">
                {{ item.label }}
              </a>
            </nav>

            <!-- Status -->
            <div class="header-status">
              <span class="status-city">{{ store.rule?.cityName || '—' }}</span>
              <span class="status-sep">·</span>
              <span class="status-year">{{ store.rule ? `${store.rule.year}版` : '—' }}</span>
              <span
                v-if="store.rule"
                class="status-verified"
                :class="store.rule.verified ? 'ok' : 'warn'"
                :title="store.rule.verified ? '全部条目已回溯官方原文' : '存在未回溯官方原文的条目，详见各页数据来源标注'"
              >{{ store.rule.verified ? '已核验' : '部分待核验' }}</span>
            </div>
          </div>
        </n-layout-header>

        <n-layout has-sider position="absolute" style="top:48px; bottom:0">
          <n-layout-sider bordered collapse-mode="width" :collapsed-width="52" :width="220" show-trigger :native-scrollbar="false">
            <ParamSidebar />
          </n-layout-sider>

          <n-layout-content :native-scrollbar="false" class="main-content">
            <n-alert v-if="store.loadError" type="error" title="政策规则加载失败" :show-icon="true">
              <div>{{ store.loadError }}。请检查网络或重新选择城市后重试。</div>
              <n-button size="small" style="margin-top:8px" @click="store.loadRule(store.work.city)">重新加载</n-button>
            </n-alert>
            <router-view v-else v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </n-layout-content>
        </n-layout>
      </n-layout>
      <ChatAssistant :scenarios="store.scenarios" />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NConfigProvider, NMessageProvider, NLayout, NLayoutHeader, NLayoutSider, NLayoutContent, NAlert, NButton, type GlobalThemeOverrides } from 'naive-ui'
import { useMainStore } from './stores/main'
import ParamSidebar from './components/ParamSidebar.vue'
import ChatAssistant from './components/ChatAssistant.vue'

const router = useRouter()
const route = useRoute()
const store = useMainStore()

const activeKey = computed(() => (route.name as string) || 'dashboard')

const navItems = [
  { label: '总览', key: 'Dashboard' },
  { label: '方案对比', key: 'Scenario' },
  { label: '保障规划', key: 'Planning' },
  { label: '权益护航', key: 'Rights' },
  { label: '政策百科', key: 'Policy' },
]

function onNav(key: string) { router.push({ name: key }) }
onMounted(() => { store.loadRule(store.work.city) })

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0d9488',
    primaryColorHover: '#0f766e',
    primaryColorPressed: '#115e59',
    borderRadius: '4px',
    borderRadiusSmall: '3px',
    fontWeightStrong: '600',
  },
  Card: {
    color: '#ffffff',
    colorModal: '#ffffff',
    colorPopover: '#ffffff',
    textColor: '#1e293b',
    borderColor: '#e2e8f0',
    titleTextColor: '#0f172a',
  },
  DataTable: {
    thColor: '#f8fafc',
    tdColor: '#ffffff',
    tdColorHover: '#f1f5f9',
    borderColor: '#e2e8f0',
    thTextColor: '#475569',
    tdTextColor: '#334155',
  },
  Input: {
    color: '#ffffff',
    colorFocus: '#ffffff',
    border: '1px solid #e2e8f0',
    borderHover: '1px solid #94a3b8',
    borderFocus: '1px solid #0d9488',
    textColor: '#1e293b',
  },
  Select: {
    peers: {
      InternalSelection: {
        color: '#ffffff',
        border: '1px solid #e2e8f0',
        borderHover: '1px solid #94a3b8',
        textColor: '#1e293b',
      },
    },
  },
  Slider: {
    fillColor: '#0d9488',
    fillColorHover: '#0d9488',
    railColor: '#e2e8f0',
  },
  Statistic: {
    labelTextColor: '#64748b',
    valueTextColor: '#0f172a',
  },
  Tag: {
    colorInfo: 'rgba(13,148,136,0.08)',
    colorSuccess: 'rgba(34,197,94,0.08)',
    textColorInfo: '#0d9488',
    textColorSuccess: '#16a34a',
  },
  Menu: {
    itemTextColor: '#64748b',
    itemTextColorActive: '#0d9488',
    itemTextColorHover: '#1e293b',
    itemColorActive: 'rgba(13,148,136,0.06)',
  },
  Alert: {
    colorInfo: 'rgba(13,148,136,0.04)',
    borderColorInfo: 'rgba(13,148,136,0.15)',
    titleTextColorInfo: '#0f766e',
    textColorInfo: '#115e59',
  },
}
</script>

<style>
/* ===== Layout ===== */
.header {
  background: #ffffff !important;
  height: 48px !important;
  border-bottom: 1px solid #e2e8f0 !important;
}
.header-inner {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 100%;
  padding: 0 20px;
}

/* ===== Brand ===== */
.brand {
  display: flex;
  align-items: center;
  gap: 6px;
}
.brand-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #0d9488;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 1px;
}
.brand-ver {
  font-size: 9px;
  font-weight: 600;
  color: #0d9488;
  border: 1px solid #0d9488;
  border-radius: 3px;
  padding: 0 4px;
  line-height: 14px;
}

/* ===== Nav ===== */
.nav {
  display: flex;
  gap: 2px;
  height: 100%;
}
.nav-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color 0.15s;
}
.nav-item:hover {
  color: #1e293b;
}
.nav-item.active {
  color: #0d9488;
  border-bottom-color: #0d9488;
}

/* ===== Status ===== */
.header-status {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}
.status-city {
  font-weight: 500;
  color: #475569;
}
.status-sep {
  color: #cbd5e1;
}
.status-verified {
  font-size: 10px;
  font-weight: 600;
  border-radius: 3px;
  padding: 1px 5px;
  letter-spacing: 0.3px;
}
.status-verified.ok {
  color: #059669;
  background: rgba(5, 150, 105, 0.08);
  border: 1px solid rgba(5, 150, 105, 0.2);
}
.status-verified.warn {
  color: #d97706;
  background: rgba(217, 119, 6, 0.08);
  border: 1px solid rgba(217, 119, 6, 0.2);
}

/* ===== Content ===== */
.main-content {
  padding: 20px 24px;
  background: #f8fafc !important;
}

/* ===== Sider ===== */
.n-layout-sider {
  background: #ffffff !important;
}

/* ===== Transition ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Shared UI（全局提取，视图层不再重复定义） ===== */
.card { background: #ffffff !important; border: 1px solid #e2e8f0 !important; }
.desc { color: #64748b; font-size: 13px; margin-bottom: 0; line-height: 1.6; }

/* KPI 数据条 */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
}
.stat {
  padding: 14px 16px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat:last-child { border-right: none; }
.stat-label {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}
.stat-foot {
  font-size: 11px;
  color: #94a3b8;
}
.text-danger { color: #dc2626 !important; }
.text-warn { color: #d97706 !important; }
.text-safe { color: #059669 !important; }

/* 明细行（收入/成本/税负拆解通用） */
.d-row, .t-row { display: flex; justify-content: space-between; align-items: baseline; padding: 7px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b; }
.d-row:last-of-type, .t-row:last-child { border-bottom: none; }
.d-row b, .t-row b { color: #0f172a; font-weight: 600; font-size: 13px; }
.d-row b.danger, .t-row.danger b { color: #dc2626; }
.d-row b.ok, .t-row.success b, .t-row.total b.ok { color: #059669; }
.d-row.total, .t-row.total { border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 8px; }
.detail-block, .tax-block { display: flex; flex-direction: column; }

/* 洞察/建议列表 */
.insight-list, .advice-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.insight-list li, .advice-list li {
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}
.insight-list li:last-child, .advice-list li:last-child { border-bottom: none; }
.advice-list b { color: #0d9488; }

/* ===== Scrollbar ===== */
.main-content ::-webkit-scrollbar {
  width: 6px;
}
.main-content ::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.main-content ::-webkit-scrollbar-track {
  background: transparent;
}
</style>
