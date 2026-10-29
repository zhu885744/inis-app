/**
 * vue-router 的 uni-app 垫片（P0 地基）
 *
 * 目的：Mellow 的 45 个文件写着 `import { useRoute, useRouter } from '@/mellow/router'`，
 * 38 个文件里还有 `<router-link>`。让它们零改动跑在 uni-app 里的办法是——
 * 在 vite.config.ts 里把 `vue-router` 这个模块名 alias 到本文件：
 *
 *   resolve: { alias: { 'vue-router': .../src/mellow/router/index.ts } }
 *
 * 于是 useRoute / useRouter / RouterLink 全部由这里接管，页面源码一行都不用改。
 *
 * 限制（明确写在这里，避免以后踩坑）：
 *   - useRoute() 返回的是**进入页面那一刻的快照**，不跟随 query 变化；
 *   - 没有嵌套路由 / 命名视图 / 导航守卫，`meta.auth` 之类的逻辑要在页面里自己判。
 */
import { defineComponent, h } from 'vue'
import { fromUniRoute, toUniUrl, type MellowRouteInfo } from './routes'

type To = string | { path?: string; query?: Record<string, any> }

interface UniPageLike {
  route?: string
  options?: Record<string, any>
}

function currentPage(): UniPageLike {
  const pages = getCurrentPages() as unknown as UniPageLike[]
  return pages.length ? pages[pages.length - 1] : {}
}

export interface MellowRoute extends MellowRouteInfo {
  name: string
  hash: string
  meta: Record<string, any>
}

/** 当前页面的 Mellow 视角路由（快照） */
export function useRoute(): MellowRoute {
  const page = currentPage()
  const info = fromUniRoute(page.route || '', page.options || {})
  return { ...info, name: '', hash: '', meta: {} }
}

/** 统一的跳转实现：Tab 用 reLaunch 清栈，replace 用 redirectTo */
function navigate(to: To, mode: 'push' | 'replace'): void {
  const { url, tab } = toUniUrl(to)

  if (tab) {
    uni.reLaunch({ url })
    return
  }

  if (mode === 'replace') {
    uni.redirectTo({ url, fail: () => uni.reLaunch({ url }) })
    return
  }

  // 页面栈顶到上限（10 层）时降级为 redirect，避免「跳不动」
  uni.navigateTo({ url, fail: () => uni.redirectTo({ url }) })
}

/**
 * 全局唯一的 router 对象
 *
 * Mellow 里两种用法都有：
 *   - 组件内 `const router = useRouter()`
 *   - store / utils 里 `import router from '@/mellow/router'`
 * 所以这里既导出 `useRouter()`，也提供默认导出，两者是同一个对象。
 */
const router = {
  push: (to: To): void => navigate(to, 'push'),
  replace: (to: To): void => navigate(to, 'replace'),
  back: (): void => {
    if (getCurrentPages().length > 1) uni.navigateBack({ delta: 1 })
    else uni.reLaunch({ url: '/pages/index/index' })
  },
  /** Mellow 里 router.go(-1) 表返回；正数这里不支持（uni 只能按层数返回） */
  go: (delta: number): void => {
    const step = Math.abs(delta) || 1
    if (getCurrentPages().length > step) uni.navigateBack({ delta: step })
    else uni.reLaunch({ url: '/pages/index/index' })
  },
  /** 对齐 vue-router 的 `router.currentRoute.value.path` 读法 */
  get currentRoute() {
    return { value: useRoute() }
  }
}

export function useRouter() {
  return router
}

export default router

/**
 * `<router-link>` 的替身
 *
 * 渲染成 div（App / H5 都是 webview，div 直接可用），保留调用方传的 class，
 * 并按照 Mellow 的写法补上 activeClass / exactActiveClass。
 */
export const RouterLink = defineComponent({
  name: 'RouterLink',
  inheritAttrs: false,
  props: {
    to: { type: [String, Object], required: true },
    activeClass: { type: String, default: 'router-link-active' },
    exactActiveClass: { type: String, default: 'router-link-exact-active' },
    replace: { type: Boolean, default: false }
  },
  setup(props, { slots, attrs }) {
    return () => {
      const route = useRoute()
      const target = typeof props.to === 'string' ? props.to : String((props.to as any)?.path || '/')
      const exact = route.path === target
      const active = exact || (target !== '/' && route.path.startsWith(`${target}/`))

      const onClick = (attrs as any).onClick

      return h(
        'div',
        {
          ...attrs,
          class: [attrs.class, active ? props.activeClass : '', exact ? props.exactActiveClass : ''],
          onClick: (event: MouseEvent) => {
            if (typeof onClick === 'function') onClick(event)
            navigate(props.to, props.replace ? 'replace' : 'push')
          }
        },
        slots.default?.()
      )
    }
  }
})

/**
 * 兜底导出：Mellow 里个别工具（如 utils/progress.js）会 import createRouter 之类，
 * 复制过来时不至于直接编译失败。移植后如果没人用，可以删掉。
 */
export const createRouter = () => ({
  beforeEach() {},
  afterEach() {},
  push() {},
  replace() {},
  back() {},
  currentRoute: { value: { path: '/', query: {}, meta: {} } }
})

export const createWebHistory = () => ({})
export const createWebHashHistory = () => ({})
