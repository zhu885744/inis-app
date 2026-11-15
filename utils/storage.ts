/**
 * 本地存储封装
 *
 * token 存裸 JWT（请求时放 Authorization 头，后端不解析 Bearer 前缀）。
 * uni-app x 的 getStorageSync 返回 any，这里统一收口成 string，避免各页面自行判断类型。
 */

export const TOKEN_KEY = 'inis_token'
export const USER_KEY = 'inis_user'

export function getToken(): string {
  try {
    const value = uni.getStorageSync(TOKEN_KEY)
    return value == null ? '' : `${value}`
  } catch (e) {
    return ''
  }
}

export function setToken(token: string): void {
  try {
    uni.setStorageSync(TOKEN_KEY, token)
  } catch (e) {
    // 存储失败（配额 / 隐私模式）不影响本次会话
  }
}

export function clearToken(): void {
  try {
    uni.removeStorageSync(TOKEN_KEY)
  } catch (e) {
    // ignore
  }
}

/** 本地缓存的用户信息：冷启动先用它渲染，再由 check-token 校正 */
export function getCachedUser(): any {
  try {
    const raw = uni.getStorageSync(USER_KEY)
    if (raw == null || `${raw}` === '') return null
    return JSON.parse(`${raw}`)
  } catch (e) {
    return null
  }
}

export function setCachedUser(user: any): void {
  try {
    if (user == null) uni.removeStorageSync(USER_KEY)
    else uni.setStorageSync(USER_KEY, JSON.stringify(user))
  } catch (e) {
    // ignore
  }
}

export function clearUserCache(): void {
  setCachedUser(null)
}
