<template>
  <n-tabs type="line" v-model:value="tab" style="margin-top: -8px">
    <n-tab-pane name="compensation" tab="补偿计算">
      <RightsCompensation />
    </n-tab-pane>
    <n-tab-pane name="guide" tab="维权指南">
      <RightsGuide />
    </n-tab-pane>
    <n-tab-pane name="document" tab="文书生成">
      <DocumentGenerator />
    </n-tab-pane>
  </n-tabs>
</template>

<script setup lang="ts">
import { provide, ref } from 'vue'
import { NTabs, NTabPane } from 'naive-ui'
import RightsCompensation from '../components/panels/RightsCompensation.vue'
import RightsGuide from '../components/panels/RightsGuide.vue'
import DocumentGenerator from '../components/panels/DocumentGenerator.vue'

// 维权是一条链路：算补偿 → 查指南 → 出文书，面板间通过该 ref 切换
const tab = ref('compensation')
provide('rightsTab', tab)
</script>
