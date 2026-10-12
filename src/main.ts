import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './app/router'

const app = createApp(App)

// 无全局错误边界时，组件内异常会静默中断渲染并留下空白页
app.config.errorHandler = (err, _instance, info) => {
  console.error('[app] 运行时异常：', err, info)
}

app.use(createPinia())
app.use(router)
app.mount('#app')