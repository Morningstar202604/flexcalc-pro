<template>
  <n-tabs type="line" v-model:value="tab" style="margin-top: -8px">
    <n-tab-pane name="compare" tab="方案对比">
      <ScenarioCompare />
    </n-tab-pane>
    <n-tab-pane name="detail" tab="收支明细">
      <IncomeDetail />
    </n-tab-pane>
  </n-tabs>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NTabs, NTabPane } from 'naive-ui'
import ScenarioCompare from '../components/panels/ScenarioCompare.vue'
import IncomeDetail from '../components/panels/IncomeDetail.vue'

const tab = ref('compare')
</script>
