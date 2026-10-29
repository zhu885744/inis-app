/**
 * Mellow 路径 ↔ uni-app 页面 的映射表（P0 地基）
 *
 * 为什么要这张表：Mellow 页面里到处是 `router.push('/archives/12')`、`route.path === '/feed'`，
 * 而 uni-app 只有 `pages/xxx/yyy?id=12`。移植时不想改页面代码，就靠这里做双向翻译：
 *   - `toUniUrl('/archives/12')` → `/pages/article/detail?id=12`
 *   - `fromUniRoute('pages/article/detail', { id: '12' })` → `/archives/12`
 *
 * 新增页面时只要在这里补一行，页面代码不用动。
 */
export interface MellowRoute {
  /** Mellow 路径模板，动态段用 :name */
  path: string
  /** uni 页面路径（不含 query） */
  page: string
  /** Mellow 参数名 → uni query 名（默认同名，需要改名时才写） */
  params?: Record<string, string>
  /** 底部 Tab 目标：跳转用 reLaunch，避免栈无限增长 */
  tab?: boolean
}

export const ROUTES: MellowRoute[] = [
  // ---------- 底部 Tab ----------
  { path: '/', page: '/pages/index/index', tab: true },
  { path: '/goods', page: '/pages/goods/index', tab: true },
  { path: '/user', page: '/pages/mine/index', tab: true },
  { path: '/user/notifications', page: '/pages/user/notifications', tab: true },

  // ---------- 内容 ----------
  { path: '/articles', page: '/pages/article/list' },
  { path: '/archives', page: '/pages/article/archives' },
  { path: '/archives/:id', page: '/pages/article/detail', params: { id: 'id' } },
  { path: '/topics', page: '/pages/topic/index' },
  { path: '/topic/:key', page: '/pages/topic/detail', params: { key: 'key' } },
  { path: '/categories', page: '/pages/article/category-list' },
  { path: '/category/:key', page: '/pages/article/category-detail', params: { key: 'key' } },
  { path: '/moments/:id', page: '/pages/moment/detail', params: { id: 'id' } },
  { path: '/feed', page: '/pages/feed/index' },
  { path: '/links', page: '/pages/links/index' },
  { path: '/search', page: '/pages/search/index' },
  { path: '/checkin', page: '/pages/checkin/index' },
  { path: '/badges', page: '/pages/badge/index' },
  { path: '/about', page: '/pages/page/index', params: {} },
  { path: '/agreement', page: '/pages/agreement/index' },
  { path: '/privacy', page: '/pages/agreement/index' },
  { path: '/author/:id', page: '/pages/user/author', params: { id: 'id' } },
  { path: '/page/:id', page: '/pages/page/index', params: { id: 'id' } },
  // 独立页面的 key 兜底路由：仅在运行时按 query 处理，不参与静态匹配

  // ---------- 用户中心 ----------
  { path: '/user/profile', page: '/pages/user/profile' },
  { path: '/user/settings', page: '/pages/user/settings' },
  { path: '/user/security', page: '/pages/user/security' },
  { path: '/user/exp', page: '/pages/user/exp' },
  { path: '/user/integral', page: '/pages/user/integral' },
  { path: '/user/decorations', page: '/pages/user/decorations' },
  { path: '/user/badges', page: '/pages/user/badges' },
  { path: '/user/verification', page: '/pages/user/verification' },
  { path: '/user/blocks', page: '/pages/user/blocks' },

  // ---------- 创作中心 ----------
  { path: '/manage', page: '/pages/manage/index' },
  { path: '/manage/moments', page: '/pages/manage/moments' },
  { path: '/manage/posts', page: '/pages/manage/posts' },
  { path: '/manage/posts/write', page: '/pages/manage/post-write' },
  { path: '/manage/posts/edit/:id', page: '/pages/manage/post-write', params: { id: 'id' } },
  { path: '/manage/links', page: '/pages/manage/links' },

  // ---------- 账号 ----------
  { path: '/auth/login', page: '/pages/login/index' },
  { path: '/auth/register', page: '/pages/register/index' },
  { path: '/auth/forgot', page: '/pages/forgot/index' },
  { path: '/auth/oauth', page: '/pages/auth/oauth' },

  // ---------- 其它 ----------
  { path: '/blackroom', page: '/pages/blackroom/index' },
  { path: '/docs', page: '/pages/docs/projects' },
  { path: '/docs/:version', page: '/pages/docs/home', params: { version: 'version' } },
  { path: '/docs/:version/:group/:slug', page: '/pages/docs/page' },
  { path: '/install', page: '/pages/install/index' }
]

interface MatchedRoute {
  rule: MellowRoute
  params: Record<string, string>
}

/** 把路径按 / 切开（忽略空段与结尾斜杠） */
function segments(path: string): string[] {
  return String(path || '/')
    .split('?')[0]
    .split('/')
    .filter(Boolean)
}

/** 按顺序做精确 / 动态段匹配；`/:key` 兜底路由单独处理 */
function matchPath(mellowPath: string): MatchedRoute | null {
  const target = segments(mellowPath)

  for (const rule of ROUTES) {
    const pattern = segments(rule.path)
    if (pattern.length !== target.length) continue

    const params: Record<string, string> = {}
    let ok = true

    for (let i = 0; i < pattern.length; i += 1) {
      const part = pattern[i]
      if (part.startsWith(':')) {
        params[part.slice(1)] = target[i]
      } else if (part !== target[i]) {
        ok = false
        break
      }
    }

    if (ok) return { rule, params }
  }

  return null
}

function buildQuery(query: Record<string, any>): string {
  const parts: string[] = []
  Object.keys(query).forEach((key) => {
    const value = query[key]
    if (value === undefined || value === null || value === '') return
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  })
  return parts.length ? `?${parts.join('&')}` : ''
}

export interface UniTarget {
  url: string
  tab: boolean
}

/**
 * Mellow 路径 → uni 跳转地址
 * 支持 `/archives/12` 字符串，也支持 `{ path, query }` / `{ name }`（Mellow 里两种写法都有）
 */
export function toUniUrl(to: string | { path?: string; query?: Record<string, any>; params?: Record<string, any> }): UniTarget {
  const mellowPath = typeof to === 'string' ? to : String(to?.path || '/')
  const extraQuery = typeof to === 'string' ? {} : { ...(to.params || {}), ...(to.query || {}) }

  const matched = matchPath(mellowPath)
  if (matched) {
    const { rule, params } = matched
    const query: Record<string, any> = { ...extraQuery }
    Object.keys(params).forEach((key) => {
      const name = rule.params?.[key] || key
      query[name] = params[key]
    })
    return { url: `${rule.page}${buildQuery(query)}`, tab: Boolean(rule.tab) }
  }

  // 未登记的路径：当作独立页面（Mellow 的 /:key 兜底），交给 pages/page/index 按 key 查
  const key = segments(mellowPath)[0]
  return { url: `/pages/page/index${buildQuery({ key, ...extraQuery })}`, tab: false }
}

export interface MellowRouteInfo {
  path: string
  fullPath: string
  query: Record<string, string>
  params: Record<string, string>
}

/**
 * uni 页面 → Mellow 路径（供 useRoute 还原）
 * 反向匹配：先按 page 找到规则，再把 query 填回动态段
 */
export function fromUniRoute(uniRoute: string, options: Record<string, any> = {}): MellowRouteInfo {
  const page = `/${String(uniRoute || '').replace(/^\/+/, '')}`
  const query: Record<string, string> = {}
  Object.keys(options || {}).forEach((key) => {
    query[key] = String(options[key])
  })

  // 同一页面可能对应多条规则（如 post-write 的新建 / 编辑），优先取动态段能被填满的那条
  const candidates = ROUTES.filter((rule) => rule.page === page)
  for (const rule of candidates) {
    let path = rule.path
    let ok = true

    const names = Object.keys(rule.params || {})
    names.forEach((name) => {
      const uniName = rule.params![name]
      const value = query[uniName]
      if (value === undefined || value === '') {
        ok = false
        return
      }
      path = path.replace(`:${name}`, value)
    })

    if (ok) {
      const rest = { ...query }
      names.forEach((name) => delete rest[rule.params![name]])
      return {
        path,
        fullPath: `${path}${buildQuery(rest)}`,
        query: rest,
        params: Object.fromEntries(names.map((name) => [name, query[rule.params![name]] || '']))
      }
    }
  }

  const fallback = candidates[0]?.path || page
  return { path: fallback, fullPath: `${fallback}${buildQuery(query)}`, query, params: {} }
}
