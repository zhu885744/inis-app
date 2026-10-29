import { defineConfig } from 'vite'
import uniPlugin from '@dcloudio/vite-plugin-uni'
import UnoCSS from 'unocss/vite'

/**
 * 兼容取名：
 * package.json 开了 `"type": "module"`（unocss 是 ESM-only，配置必须按 ESM 加载，
 * 否则报 "resolved to an ESM file. ESM file cannot be loaded by require"）。
 * 而 @dcloudio/vite-plugin-uni 是 CJS 包，ESM 下 `import uni from ...` 拿到的是
 * module.exports 整体（插件函数挂在它的 default 上），所以这里做一次取值兼容。
 */
const uni = (typeof uniPlugin === 'function' ? uniPlugin : (uniPlugin as any).default) as typeof uniPlugin

// https://vitejs.dev/config/
export default defineConfig({
  // UnoCSS 要排在 uni() 前面：它负责产出 virtual:uno.css，
  // 再交给后面的 uni 插件按平台（H5 / 小程序）编译
  plugins: [UnoCSS(), uni()],

  server: {
    host: true,
    port: 5173,
    proxy: {
      // 开发期把 /api 与 /dev 代理到本地后端（默认端口 8642），规避 H5 跨域：
      // 生产环境改用 .env.production 里的 VITE_API_BASE 指向真实域名，
      // 并把 H5 的访问来源加进后端 config/app.toml 的 [system.cors].allowed_origins
      '/api': { target: 'http://127.0.0.1:8642', changeOrigin: true },
      '/dev': { target: 'http://127.0.0.1:8642', changeOrigin: true }
    }
  }
})
