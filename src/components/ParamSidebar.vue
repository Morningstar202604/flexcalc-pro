<template>
  <div class="param-sidebar">
    <!-- City indicator -->
    <div class="ps-head">
      <span class="ps-city">{{ store.rule?.cityName || '—' }}</span>
      <span class="ps-hint">调整参数实时计算</span>
    </div>

    <n-divider style="margin:6px 0 10px" />

    <!-- City -->
    <div class="ps-group">
      <div class="ps-group-title">所在城市</div>
      <n-select
        :value="store.work.city"
        :options="cityOptions"
        size="small"
        :disabled="store.loading"
        @update:value="(v: string) => store.setCity(v)"
      />
    </div>

    <n-divider style="margin:6px 0" />

    <!-- Work params -->
    <div class="ps-group">
      <div class="ps-group-title">工作参数</div>

      <div class="ps-item">
        <div class="ps-label">日均工时 <b>{{ store.work.dailyHours }}h</b></div>
        <n-slider v-model:value="store.work.dailyHours" :min="4" :max="14" :step="1" :tooltip-formatter="(v: number) => v + ' 小时'" />
      </div>

      <div class="ps-item">
        <div class="ps-label">日均接单 <b>{{ store.work.dailyOrders }}单</b></div>
        <n-slider v-model:value="store.work.dailyOrders" :min="15" :max="60" :step="5" :tooltip-formatter="(v: number) => v + ' 单'" />
      </div>

      <div class="ps-item">
        <div class="ps-label">平均距离 <b>{{ store.work.avgDistance }}km</b></div>
        <n-slider v-model:value="store.work.avgDistance" :min="1" :max="6" :step="0.5" :tooltip-formatter="(v: number) => v + ' km'" />
      </div>

      <div class="ps-item">
        <div class="ps-label">月工作天 <b>{{ store.work.workDaysMonth }}天</b></div>
        <n-slider v-model:value="store.work.workDaysMonth" :min="20" :max="31" :step="1" :tooltip-formatter="(v: number) => v + ' 天'" />
      </div>

      <div class="ps-item">
        <div class="ps-label">月雨天 <b>{{ store.work.rainDaysMonth }}天</b></div>
        <n-slider v-model:value="store.work.rainDaysMonth" :min="0" :max="15" :step="1" :tooltip-formatter="(v: number) => v + ' 天'" />
      </div>

      <div class="ps-item">
        <div class="ps-label">月节假日 <b>{{ store.work.holidayDaysMonth }}天</b></div>
        <n-slider v-model:value="store.work.holidayDaysMonth" :min="0" :max="10" :step="1" :tooltip-formatter="(v: number) => v + ' 天'" />
      </div>
    </div>

    <n-divider style="margin:6px 0" />

    <!-- Costs -->
    <div class="ps-group">
      <div class="ps-group-title">车辆与成本</div>

      <div class="ps-item">
        <div class="ps-label">车辆类型</div>
        <n-radio-group v-model:value="store.costs.vehicleType" size="small">
          <n-radio-button value="electric">电动</n-radio-button>
          <n-radio-button value="fuel">燃油</n-radio-button>
          <n-radio-button value="mixed">混合</n-radio-button>
        </n-radio-group>
      </div>

      <div v-if="store.costs.vehicleType !== 'electric'" class="ps-item">
        <div class="ps-label">月油费 <b>¥{{ store.costs.fuelCostMonth }}</b></div>
        <n-slider v-model:value="store.costs.fuelCostMonth" :min="0" :max="3000" :step="100" />
      </div>

      <div v-if="store.costs.vehicleType !== 'fuel'" class="ps-item">
        <div class="ps-label">月充电费 <b>¥{{ store.costs.electricityCostMonth }}</b></div>
        <n-slider v-model:value="store.costs.electricityCostMonth" :min="0" :max="1200" :step="50" />
      </div>

      <div class="ps-item">
        <div class="ps-label">维护费 <b>¥{{ store.costs.maintenanceMonth }}</b></div>
        <n-slider v-model:value="store.costs.maintenanceMonth" :min="0" :max="1000" :step="50" />
      </div>

      <div class="ps-item">
        <div class="ps-label">餐饮费 <b>¥{{ store.costs.foodCostMonth }}</b></div>
        <n-slider v-model:value="store.costs.foodCostMonth" :min="200" :max="2000" :step="100" />
      </div>

      <div class="ps-item">
        <div class="ps-label">商业保险 <b>¥{{ store.costs.insuranceMonth }}</b></div>
        <n-slider v-model:value="store.costs.insuranceMonth" :min="0" :max="800" :step="50" />
      </div>

      <div class="ps-item">
        <div class="ps-label">通讯费 <b>¥{{ store.costs.phoneCostMonth }}</b></div>
        <n-slider v-model:value="store.costs.phoneCostMonth" :min="0" :max="500" :step="25" />
      </div>

      <div class="ps-item">
        <div class="ps-label">交通罚款 <b>¥{{ store.costs.trafficFineMonth }}</b></div>
        <n-slider v-model:value="store.costs.trafficFineMonth" :min="0" :max="500" :step="25" />
      </div>

      <div class="ps-item">
        <div class="ps-label">车辆折旧 <b>¥{{ store.costs.vehicleDepreciationMonth }}</b></div>
        <n-slider v-model:value="store.costs.vehicleDepreciationMonth" :min="0" :max="1000" :step="50" />
      </div>

      <div class="ps-item">
        <div class="ps-label">其他 <b>¥{{ store.costs.otherCostMonth }}</b></div>
        <n-slider v-model:value="store.costs.otherCostMonth" :min="0" :max="1000" :step="50" />
      </div>
    </div>

    <n-divider style="margin:6px 0" />

    <!-- Tax & Insurance -->
    <div class="ps-group">
      <div class="ps-group-title">税务与社保</div>

      <div class="ps-item">
        <div class="ps-label">当前年龄 <b>{{ store.personal.currentAge }}岁</b></div>
        <n-slider v-model:value="store.personal.currentAge" :min="16" :max="65" :step="1" :tooltip-formatter="(v: number) => v + ' 岁'" />
      </div>

      <div class="ps-item">
        <div class="ps-label">预计退休年龄 <b>{{ store.personal.expectedRetireAge }}岁</b></div>
        <n-slider v-model:value="store.personal.expectedRetireAge" :min="store.personal.currentAge + 1" :max="70" :step="1" :tooltip-formatter="(v: number) => v + ' 岁'" />
      </div>

      <div class="ps-item ps-switch-row">
        <span class="ps-label">已缴社保</span>
        <n-switch v-model:value="store.personal.hasSocialInsurance" size="small" />
      </div>

      <div class="ps-item">
        <div class="ps-label">专项附加扣除/月 <b>¥{{ store.personal.specialDeductionMonth }}</b></div>
        <n-slider v-model:value="store.personal.specialDeductionMonth" :min="0" :max="5000" :step="500" />
        <div class="ps-note">子女教育 / 房贷 / 租金 / 赡养老人</div>
      </div>
    </div>

    <div class="ps-foot">
      <n-tag size="small" :bordered="false" type="info">参数与测算均在本机完成</n-tag>
      <div v-if="store.paramsRestored" class="ps-restored">已恢复上次未完成的测算参数</div>
      <n-button size="tiny" quaternary block @click="store.resetParams()">重置为默认参数</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NSlider, NRadioGroup, NRadioButton, NSwitch, NDivider, NTag, NSelect, NButton } from 'naive-ui'
import { useMainStore, CITIES } from '../stores/main'

const store = useMainStore()
const cityOptions = CITIES
</script>

<style scoped>
.param-sidebar {
  padding: 10px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ps-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 2px 0;
}
.ps-city {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.ps-hint {
  font-size: 11px;
  color: #94a3b8;
}

.ps-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ps-group-title {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 6px 2px 2px;
}

.ps-item {
  padding: 2px 0;
}
.ps-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ps-label b {
  margin-left: auto;
  color: #0f172a;
  font-weight: 600;
  font-size: 12px;
}

.ps-switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}
.ps-switch-row .ps-label {
  margin-bottom: 0;
}

.ps-note {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
  padding-left: 2px;
}

.ps-foot {
  margin-top: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ps-restored {
  font-size: 10px;
  color: #0f766e;
  background: rgba(13,148,136,0.07);
  border-radius: 3px;
  padding: 3px 6px;
}
</style>
