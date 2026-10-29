import type { UserInfo } from '@/api/types'

export const TOKEN_KEY = 'inis_token'
export const USER_KEY = 'inis_user'

/** token 用裸 JWT 存本地（请求时放 Authorization 头，不加 Bearer） */
export function getToken(): string {
  try {
    return uni.getStorageSync(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token: string): void {
  try {
    uni.setStorageSync(TOKEN_KEY, token)
  } catch {
    // 忽略存储异常（隐私模式 / 配额满）
  }
}

export function clearToken(): void {
  try {
    uni.removeStorageSync(TOKEN_KEY)
  } catch {
    // ignore
  }
}

/** 本地缓存的用户信息：用于冷启动时先渲染，再由 check-token 校正 */
export function getCachedUser(): UserInfo | null {
  try {
    const raw = uni.getStorageSync(USER_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

export function setCachedUser(user: UserInfo | null): void {
  try {
    if (user) uni.setStorageSync(USER_KEY, JSON.stringify(user))
    else uni.removeStorageSync(USER_KEY)
  } catch {
    // ignore
  }
}

/** 清理本地用户缓存（登录态失效 / 退出登录时调用） */
export function clearUserCache(): void {
  setCachedUser(null)
}

export const SEARCH_HISTORY_KEY = 'inis_search_history'
const SEARCH_HISTORY_MAX = 10

/** 搜索历史（最多 10 条，最近搜的在前） */
export function getSearchHistory(): string[] {
  try {
    const raw = uni.getStorageSync(SEARCH_HISTORY_KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(list) ? list.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

export function pushSearchHistory(keyword: string): string[] {
  const value = String(keyword || '').trim()
  if (!value) return getSearchHistory()

  const next = [value, ...getSearchHistory().filter((item) => item !== value)].slice(0, SEARCH_HISTORY_MAX)
  try {
    uni.setStorageSync(SEARCH_HISTORY_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

export function clearSearchHistory(): void {
  try {
    uni.removeStorageSync(SEARCH_HISTORY_KEY)
  } catch {
    // ignore
  }
}

export const RECENT_SERVICES_KEY = 'inis_recent_services'
const RECENT_SERVICES_MAX = 5

/** 「最近使用」的服务 key 列表（最近打开过的在前，最多 5 个） */
export function getRecentServices(): string[] {
  try {
    const raw = uni.getStorageSync(RECENT_SERVICES_KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(list) ? list.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

/** 记录一次服务打开（已存在则提到最前），返回新列表 */
export function pushRecentService(key: string): string[] {
  const value = String(key || '').trim()
  if (!value) return getRecentServices()

  const next = [value, ...getRecentServices().filter((item) => item !== value)].slice(0, RECENT_SERVICES_MAX)
  try {
    uni.setStorageSync(RECENT_SERVICES_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

/** 清空最近使用（退出登录时调用，避免串账号） */
export function clearRecentServices(): void {
  try {
    uni.removeStorageSync(RECENT_SERVICES_KEY)
  } catch {
    // ignore
  }
}
