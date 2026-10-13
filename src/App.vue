<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <MainLayout />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider, type GlobalThemeOverrides } from 'naive-ui'
import MainLayout from './layouts/MainLayout.vue'

// Import global styles
import '@/styles/global.css'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0d9488',
    primaryColorHover: '#0f766e',
    primaryColorPressed: '#115e59',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontWeightStrong: '600',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  Card: {
    color: '#ffffff',
    colorModal: '#ffffff',
    colorPopover: '#ffffff',
    textColor: '#1e293b',
    borderColor: '#e2e8f0',
    titleTextColor: '#0f172a',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
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
    colorWarning: 'rgba(245,158,11,0.08)',
    colorError: 'rgba(239,68,68,0.08)',
    textColorInfo: '#0d9488',
    textColorSuccess: '#16a34a',
    textColorWarning: '#d97706',
    textColorError: '#dc2626',
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
    colorSuccess: 'rgba(34,197,94,0.04)',
    borderColorSuccess: 'rgba(34,197,94,0.15)',
    colorWarning: 'rgba(245,158,11,0.04)',
    borderColorWarning: 'rgba(245,158,11,0.15)',
    colorError: 'rgba(239,68,68,0.04)',
    borderColorError: 'rgba(239,68,68,0.15)',
  },
  Button: {
    textColor: '#ffffff',
    fontWeight: 500,
  },
  Modal: {
    color: '#ffffff',
    borderColor: '#e2e8f0',
  },
  Drawer: {
    color: '#ffffff',
  },
  Popover: {
    color: '#ffffff',
  },
  Tooltip: {
    color: '#1e293b',
  },
}
</script>

<style>
/* Global app styles are now in src/styles/global.css */
</style>