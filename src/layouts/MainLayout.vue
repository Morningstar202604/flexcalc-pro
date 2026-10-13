<template>
  <div class="main-layout">
    <!-- Header -->
    <header class="header" :class="{ 'header-scrolled': scrolled }">
      <div class="header-container">
        <!-- Brand -->
        <div class="header-brand" @click="goDashboard">
          <div class="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">灵算</span>
            <span class="brand-ver">Pro</span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="header-nav" aria-label="主导航">
          <a
            v-for="item in navItems"
            :key="item.key"
            :href="item.path"
            class="nav-link"
            :class="{ active: activeKey === item.key }"
            @click.prevent="onNav(item.key)"
          >
            <span class="nav-icon" aria-hidden="true">
              <component :is="item.icon" />
            </span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        </nav>

        <!-- Status & Actions -->
        <div class="header-actions">
          <!-- City Status -->
          <div class="status-badge" v-if="store.rule">
            <span class="status-dot" :class="store.rule.verified ? 'verified' : 'partial'" />
            <span class="status-text">{{ store.rule.cityName }} · {{ store.rule.year }}版</span>
            <span class="status-label" :class="store.rule.verified ? 'verified' : 'partial'">
              {{ store.rule.verified ? '已核验' : '部分待核验' }}
            </span>
          </div>

          <!-- Theme Toggle -->
          <button
            class="icon-btn"
            @click="toggleTheme"
            :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
            title="切换主题"
          >
            <SunIcon v-if="isDark" class="icon" />
            <MoonIcon v-else class="icon" />
          </button>

          <!-- AI Assistant Trigger -->
          <ChatAssistantTrigger :scenarios="store.scenarios" />
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="layout-main">
      <!-- Sidebar -->
      <aside
        class="sidebar"
        :class="{ collapsed: sidebarCollapsed }"
        aria-label="参数设置"
      >
        <div class="sidebar-header">
          <h2 class="sidebar-title">参数设置</h2>
          <button
            class="sidebar-toggle"
            @click="sidebarCollapsed = !sidebarCollapsed"
            :aria-label="sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'"
          >
            <ChevronLeftIcon v-if="!sidebarCollapsed" class="icon" />
            <ChevronRightIcon v-else class="icon" />
          </button>
        </div>

        <div class="sidebar-content" v-show="!sidebarCollapsed">
          <ParamSidebar />
        </div>

        <div class="sidebar-collapsed-hint" v-show="sidebarCollapsed">
          <span>参数设置</span>
          <ChevronRightIcon class="icon" />
        </div>
      </aside>

      <!-- Content -->
      <main class="content" :class="{ 'content-full': sidebarCollapsed }">
        <!-- Global Alerts -->
        <Teleport to="body">
          <n-message-provider />
        </Teleport>

        <div v-if="store.loadError" class="global-alert error">
          <AlertIcon class="icon" />
          <div class="alert-content">
            <p class="alert-title">政策规则加载失败</p>
            <p>{{ store.loadError }}</p>
          </div>
          <n-button size="small" @click="store.loadRule(store.work.city)" variant="outlined">
            重新加载
          </n-button>
        </div>

        <!-- Page Content -->
        <div class="page-container">
          <router-view v-slot="{ Component }">
            <transition name="page" mode="out-in">
              <component :is="Component" class="page-content" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <div
      class="sidebar-overlay"
      :class="{ visible: mobileSidebarOpen }"
      @click="mobileSidebarOpen = false"
      v-show="isMobile"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NButton } from 'naive-ui'
import { useMainStore } from '../stores/main'
import ParamSidebar from '../components/ParamSidebar.vue'
import ChatAssistantTrigger from '../components/ChatAssistantTrigger.vue'

// Icons
import {
  DashboardIcon,
  GitCompareIcon,
  ReceiptIcon,
  CalculatorIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertIcon,
} from '../components/icons'

const router = useRouter()
const route = useRoute()
const store = useMainStore()

const activeKey = computed(() => route.name as string || 'dashboard')
const scrolled = ref(false)
const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
const isDark = ref(false)
const isMobile = ref(false)

const navItems = [
  { key: 'dashboard', label: '总览', path: '/dashboard', icon: DashboardIcon },
  { key: 'scenario', label: '方案对比', path: '/scenario', icon: GitCompareIcon },
  { key: 'income', label: '收支明细', path: '/income', icon: ReceiptIcon },
  { key: 'planning', label: '税务与养老', path: '/planning', icon: CalculatorIcon },
  { key: 'rights', label: '权益护航', path: '/rights', icon: ShieldCheckIcon },
  { key: 'policy', label: '政策百科', path: '/policy', icon: BookOpenIcon },
]

function onNav(key: string) {
  router.push({ name: key })
  if (isMobile.value) mobileSidebarOpen.value = false
}

function goDashboard() {
  router.push({ name: 'dashboard' })
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) sidebarCollapsed.value = true
}

function handleScroll() {
  scrolled.value = window.scrollY > 8
}

// Initialize theme
onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDark.value = savedTheme === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  document.documentElement.classList.toggle('dark', isDark.value)

  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('scroll', handleScroll)
})

// Cleanup
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped lang="css">
/* ==========================================================================
   Main Layout
   ========================================================================== */

.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
}

/* ---------- Header ---------- */
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  height: var(--header-height);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-primary);
  transition: box-shadow var(--transition-normal), background var(--transition-normal);
}

.header-scrolled {
  box-shadow: var(--color-shadow-md);
}

.header-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 var(--space-4);
  height: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

/* Brand */
.header-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.header-brand:hover {
  background: var(--color-bg-tertiary);
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-primary-600);
  color: var(--color-text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.brand-name {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.brand-ver {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-2);
  line-height: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Navigation */
.header-nav {
  display: flex;
  gap: var(--space-1);
  margin-left: var(--space-2);
  padding: var(--space-1) 0;
  flex: 1;
  max-width: 720px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
}

.nav-link.active {
  color: var(--color-primary-600);
  background: var(--color-primary-50);
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: currentColor;
}

.nav-label {
  display: none;
}

@media (min-width: 640px) {
  .nav-label {
    display: inline;
  }
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
  flex-shrink: 0;
}

/* Status Badge */
.status-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-neutral-400);
}

.status-dot.verified {
  background: var(--color-success-500);
  box-shadow: 0 0 0 2px var(--color-success-100);
}

.status-dot.partial {
  background: var(--color-warning-500);
  box-shadow: 0 0 0 2px var(--color-warning-100);
}

.status-text {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.status-label {
  font-weight: var(--font-weight-semibold);
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-label.verified {
  color: var(--color-success-700);
  background: var(--color-success-50);
  border: 1px solid var(--color-success-200);
}

.status-label.partial {
  color: var(--color-warning-700);
  background: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
}

/* Icon Button */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.icon-btn:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.icon-btn .icon {
  width: 20px;
  height: 20px;
}

/* ---------- Layout Main ---------- */
.layout-main {
  display: flex;
  flex: 1;
  min-height: calc(100vh - var(--header-height));
}

/* ---------- Sidebar ---------- */
.sidebar {
  position: fixed;
  left: 0;
  top: var(--header-height);
  bottom: 0;
  width: var(--sider-width);
  background: var(--color-bg-primary);
  border-right: 1px solid var(--color-border-primary);
  z-index: var(--z-fixed);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal), transform var(--transition-normal);
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sider-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--color-border-primary);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar.collapsed .sidebar-title {
  display: none;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.sidebar-toggle:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.sidebar-toggle .icon {
  width: 18px;
  height: 18px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

.sidebar-collapsed-hint {
  display: none;
  align-items: center;
  justify-content: center;
  height: 100%;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-tertiary);
  gap: var(--space-2);
  white-space: nowrap;
}

.sidebar.collapsed .sidebar-collapsed-hint {
  display: flex;
}

.sidebar.collapsed .sidebar-collapsed-hint .icon {
  width: 16px;
  height: 16px;
}

/* ---------- Content ---------- */
.content {
  flex: 1;
  margin-left: var(--sider-width);
  min-height: calc(100vh - var(--header-height));
  transition: margin-left var(--transition-normal);
}

.content-full {
  margin-left: var(--sider-collapsed-width);
}

.page-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
  width: 100%;
}

.page-content {
  animation: fadeIn var(--transition-normal);
}

/* ---------- Global Alert ---------- */
.global-alert {
  position: fixed;
  top: calc(var(--header-height) + var(--space-4));
  left: calc(var(--sider-width) + var(--space-4));
  right: var(--space-4);
  z-index: var(--z-tooltip);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--color-shadow-lg);
  animation: slideDown var(--transition-normal);
}

.global-alert.error {
  background: var(--color-danger-50);
  border-color: var(--color-danger-200);
}

.global-alert .icon {
  width: 20px;
  height: 20px;
  color: var(--color-danger-500);
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-danger-700);
  margin-bottom: var(--space-1);
}

.alert-content p {
  font-size: var(--font-size-sm);
  color: var(--color-danger-600);
  margin: 0;
}

/* ---------- Mobile Sidebar Overlay ---------- */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  z-index: calc(var(--z-fixed) - 1);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.sidebar-overlay.visible {
  display: block;
  opacity: 1;
}

@media (max-width: 767px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
    box-shadow: var(--color-shadow-xl);
  }

  .sidebar.collapsed {
    width: var(--sider-width);
  }

  .content,
  .content-full {
    margin-left: 0;
  }

  .sidebar-overlay {
    display: block;
  }
}

/* ---------- Page Transitions ---------- */
.page-enter-active,
.page-leave-active {
  transition: opacity var(--transition-normal), transform var(--transition-normal);
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>