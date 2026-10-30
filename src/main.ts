import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// UnoCSS 产物：原子类在这里注入，H5 与小程序都需要
import 'virtual:uno.css'
/**
 * Mellow 移植层的全局样式（设计 token / 组件类 / 图标字体）
 *
 * 放在 main.ts 里而不是 App.vue 的 `<style src>`：
 * dev 模式下 App.vue 的 style src 会被按项目根目录解析
 * （报错找不到 `inis-app/mellow/assets/index.css`），用 JS 相对导入最稳。
 */
import './mellow/assets/index.css'

// uni-app 要求导出 createApp 工厂函数（内部使用 createSSRApp）
export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
