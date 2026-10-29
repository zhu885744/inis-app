/// <reference types="@dcloudio/types" />
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  /** 接口基地址：开发期留空走 vite 代理，生产填 https://your-domain.com/api */
  readonly VITE_API_BASE?: string
  /** 站点名称，用于导航栏标题等 */
  readonly VITE_APP_TITLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
