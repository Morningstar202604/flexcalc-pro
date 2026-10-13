<template>
  <div class="chat-trigger">
    <button
      class="trigger-btn"
      @click="$emit('open')"
      :aria-label="isOnline ? '打开 AI 助手' : 'AI 助手（离线模式）'"
    >
      <svg v-if="!open" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      <span class="status-dot" :class="isOnline ? 'online' : 'offline'" />
    </button>

    <!-- Tooltip -->
    <div class="tooltip">
      <span>{{ isOnline ? 'AI 助手' : 'AI 助手（离线）' }}</span>
      <kbd class="shortcut">⌘K</kbd>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAIChat } from '../composables/useAIChat'

const props = defineProps<{
  scenarios: import('../types').ScenarioResult[]
}>()
const emit = defineEmits<{ open: [] }>()

const { config, isOnline } = useAIChat()
const open = ref(false)

const isOnlineComputed = computed(() => isOnline.value && config.value.enabled && config.value.apiKey)
</script>

<style scoped>
.chat-trigger {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-fixed);
}

.trigger-btn {
  position: relative;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: var(--radius-xl);
  background: var(--color-primary-600);
  color: var(--color-text-inverse);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--color-shadow-lg);
  transition: all var(--transition-normal);
}

.trigger-btn:hover {
  background: var(--color-primary-700);
  transform: scale(1.02);
  box-shadow: var(--color-shadow-xl);
}

.trigger-btn:active {
  transform: scale(0.98);
}

.trigger-btn:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 3px;
}

.status-dot {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  border: 3px solid var(--color-bg-primary);
}

.status-dot.online {
  background: var(--color-success-500);
  box-shadow: 0 0 0 2px var(--color-success-100);
}

.status-dot.offline {
  background: var(--color-neutral-400);
}

/* Tooltip */
.tooltip {
  position: absolute;
  bottom: 72px;
  right: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-neutral-900);
  color: var(--color-neutral-50);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px);
  transition: all var(--transition-fast);
  pointer-events: none;
}

.trigger-btn:hover .tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.tooltip::after {
  content: '';
  position: absolute;
  bottom: -4px;
  right: 16px;
  width: 8px;
  height: 8px;
  background: var(--color-neutral-900);
  transform: rotate(45deg);
}

.shortcut {
  padding: 1px 6px;
  background: rgba(255,255,255,0.15);
  border-radius: var(--radius-sm);
  font-family: var(--font-family-mono);
  font-size: 10px;
}

/* Keyboard shortcut hint */
@media (hover: none) {
  .tooltip {
    display: none;
  }
}
</style>