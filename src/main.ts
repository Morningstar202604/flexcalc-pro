import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './app/router'

const app = createApp(App)

// 无全局错误边界时，组件内异常会静默中断渲染并留下空白页。
// 这里给出用户可见的提示，并监听 router 的 chunk 失败事件。
app.config.errorHandler = (err, _instance, info) => {
  console.error('[app] 运行时异常：', err, info)
  const detail = err instanceof Error ? err.message : String(err)
  showFatalError(`应用出现异常，请刷新页面重试（${info}: ${detail}）`)
}

function showFatalError(message: string) {
  const el = document.getElementById('app')
  if (!el) return
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:system-ui,sans-serif;background:#f8fafc">'
    + '<div style="max-width:420px;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:32px">'
    + '<div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:8px">灵算 Pro</div>'
    + '<div style="font-size:13px;color:#64748b;line-height:1.6;margin-bottom:16px">' + message + '</div>'
    + '<button onclick="location.reload()" style="background:#0d9488;color:#fff;border:none;border-radius:4px;padding:8px 20px;font-size:13px;cursor:pointer">刷新页面</button>'
    + '</div></div>'
}

// router.onError 派发的 chunk 失败事件，同样给出可见提示
window.addEventListener('app:chunk-error', () => {
  showFatalError('页面资源加载失败（可能是版本更新后缓存了旧文件），请刷新重试')
})

app.use(createPinia())
app.use(router)
app.mount('#app')