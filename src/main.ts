import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// UnoCSS 产物：原子类在这里注入，H5 与小程序都需要
import 'virtual:uno.css'

// uni-app 要求导出 createApp 工厂函数（内部使用 createSSRApp）
export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
