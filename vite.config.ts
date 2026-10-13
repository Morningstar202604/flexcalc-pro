import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 3000,
    open: false,
    strictPort: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: { port: 4173 },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts'],
          naive: ['naive-ui'],
          vue: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
