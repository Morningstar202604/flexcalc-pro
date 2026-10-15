<template>
  <section class="fold-card" :class="{ 'is-open': open, dense }">
    <button
      type="button"
      class="fold-head"
      :aria-expanded="open"
      @click="open = !open"
    >
      <ChevronRightIcon class="fold-chevron" />
      <slot name="header">
        <span class="fold-title">{{ title }}</span>
        <span v-if="summary" class="fold-summary">{{ summary }}</span>
      </slot>
    </button>
    <!--
      用 v-if 而非 v-show：折叠体内的 ECharts 在 display:none 下拿不到宽度，
      首次展开时 ResizeObserver 在部分 webview 里不触发，图表会一直空白。
      v-if 让折叠体在展开时重新挂载，图表以真实宽度初始化，也避免折叠时白养实例。
    -->
    <div v-if="open" class="fold-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChevronRightIcon } from './icons'

const props = withDefaults(defineProps<{
  title?: string
  summary?: string
  defaultOpen?: boolean
  dense?: boolean
}>(), {
  title: '',
  summary: '',
  defaultOpen: false,
  dense: false,
})

const open = ref(props.defaultOpen)
</script>

<style scoped>
.fold-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--color-shadow-sm);
  overflow: hidden;
}

.fold-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: var(--color-text-primary);
  font: inherit;
  transition: background var(--transition-fast);
}

.fold-head:hover {
  background: var(--color-bg-tertiary);
}

.fold-chevron {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  transition: transform var(--transition-fast);
}

.is-open .fold-chevron {
  transform: rotate(90deg);
}

.fold-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.fold-summary {
  margin-left: auto;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 55%;
}

.fold-body {
  padding: 12px 16px 16px;
  border-top: 1px solid var(--color-border-primary);
}

/* 侧边栏参数分组用紧凑样式 */
.fold-card.dense {
  border-radius: var(--radius-sm);
}

.dense .fold-head {
  padding: 8px 10px;
  gap: 6px;
}

.dense .fold-chevron {
  width: 14px;
  height: 14px;
}

.dense .fold-title {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-tertiary);
}

.dense .fold-summary {
  font-size: var(--font-size-xs);
  max-width: 60%;
}

.dense .fold-body {
  padding: 8px 10px 10px;
}
</style>
