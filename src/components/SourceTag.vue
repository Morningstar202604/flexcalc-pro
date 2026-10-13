<template>
  <!--
    挂在外源性数字旁的「依据」chip。source-key 对应 rule.sources 的键。
    键在当前城市规则里不存在时整体不渲染——静默缺省好过显示一个指向空处的依据。
    tests/wiring/source-tags.spec.ts 会把拼错的键拦在提交前。
  -->
  <n-popover v-if="source" trigger="hover" placement="top" :width="360" :style="{ maxWidth: '92vw' }" raw>
    <template #trigger>
      <span :class="['st-chip', `st-${source.confidence}`]" :title="`依据：${label || sourceLabel(sourceKey)}`">
        <span class="st-dot" />
        <span class="st-text">{{ text }}</span>
      </span>
    </template>

    <div class="st-pop">
      <div class="st-pop-head">
        <n-tag :type="confidenceType(source.confidence)" size="tiny" :bordered="false">
          {{ CONFIDENCE_LABELS[source.confidence] }}
        </n-tag>
        <span class="st-pop-label">{{ label || sourceLabel(sourceKey) }}</span>
      </div>
      <div class="st-pop-title">{{ source.title }}</div>
      <div v-if="source.docNo" class="st-pop-doc">{{ source.docNo }}</div>
      <div class="st-pop-meta">
        <span v-if="source.issuedBy">{{ source.issuedBy }}</span>
        <span v-if="source.effectiveFrom">生效：{{ source.effectiveFrom }}</span>
        <span>核对于 {{ source.retrievedAt }}</span>
      </div>
      <p v-if="source.note" class="st-pop-note">{{ source.note }}</p>
      <p v-if="source.confidence === 'unverified'" class="st-pop-warn">
        此项无权威来源，仅为占位假设，不可对外引用。
      </p>
      <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer" class="st-pop-link">查看原文 ↗</a>
    </div>
  </n-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NPopover, NTag } from 'naive-ui'
import { useMainStore } from '../stores/main'
import { sourceLabel, confidenceType, CONFIDENCE_LABELS } from '../utils/sources'

const props = defineProps<{
  /** rule.sources 的键，如 pension / minimumWage / income */
  sourceKey: string
  /** 覆盖默认标签（默认取 SOURCE_LABELS） */
  label?: string
  /** chip 上的文字，默认「依据」 */
  text?: string
}>()

const store = useMainStore()
const source = computed(() => store.rule?.sources?.[props.sourceKey])
const text = computed(() => props.text ?? '依据')
</script>

<style scoped>
.st-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 8px;
  cursor: help;
  vertical-align: middle;
  white-space: nowrap;
  border: 1px solid transparent;
}
.st-dot { width: 5px; height: 5px; border-radius: 50%; flex: none; }

.st-official { color: #0f766e; background: rgba(13, 148, 136, 0.08); border-color: rgba(13, 148, 136, 0.25); }
.st-official .st-dot { background: #0d9488; }
.st-derived { color: #b45309; background: #fffbeb; border-color: #fde68a; }
.st-derived .st-dot { background: #d97706; }
.st-unverified { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
.st-unverified .st-dot { background: #dc2626; }

.st-pop { padding: 12px 14px; }
.st-pop-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.st-pop-label { font-size: 11px; font-weight: 600; color: #475569; }
.st-pop-title { font-size: 13px; font-weight: 600; color: #0f172a; line-height: 1.5; }
.st-pop-doc {
  display: inline-block; margin-top: 5px;
  font-size: 11px; font-weight: 600; color: #0f766e;
  background: rgba(13, 148, 136, 0.07); border-radius: 3px; padding: 1px 6px;
}
.st-pop-meta {
  display: flex; flex-wrap: wrap; gap: 4px 10px;
  font-size: 11px; color: #94a3b8; margin-top: 6px;
}
.st-pop-note { font-size: 11px; color: #64748b; line-height: 1.6; margin: 8px 0 0; }
.st-pop-warn {
  font-size: 11px; color: #b91c1c; background: #fef2f2; border-left: 2px solid #dc2626;
  padding: 5px 8px; border-radius: 0 3px 3px 0; margin: 8px 0 0; line-height: 1.5;
}
.st-pop-link {
  display: inline-block; margin-top: 8px;
  font-size: 11px; color: #0d9488; text-decoration: none;
  border-bottom: 1px solid rgba(13, 148, 136, 0.3);
}
.st-pop-link:hover { border-bottom-color: #0d9488; }
</style>
