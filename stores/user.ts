import { computed, ref } from 'vue'
import { checkToken, login as loginApi, logout as logoutApi } from '@/api/comm'
import type { LoginResult } from '@/api/comm'
import {
  clearToken,
  clearUserCache,
  getCachedUser,
  getToken,
  setCachedUser,
  setToken
} from '@/utils/storage'

/**
 * 用户登录态
 *
 * 不用 pinia：uni-app x 蒸汽模式下依赖越少越稳。
 * 模块级 ref 天然是单例，页面里 import 后模板自动解包，script 里用 .value。
 */
export const token = ref<string>(getToken())
export const user = ref<any>(getCachedUser())

export const isLogin = computed<boolean>(() => token.value !== '')
export const nickname = computed<string>(() => {
  if (user.value == null) return '未登录'
  const name = user.value.nickname
  if (name != null && `${name}` !== '') return `${name}`
  const account = user.value.account
  return account == null ? '未登录' : `${account}`
})
export const avatar = computed<string>(() => {
  if (user.value == null) return ''
  const value = user.value.avatar
  return value == null ? '' : `${value}`
})
export const uid = computed<number>(() => {
  if (user.value == null) return 0
  return Number(user.value.id ?? 0)
})

/** 写入登录态（登录 / 注册 / check-token 成功后统一走这里） */
export function applyLogin(result: LoginResult | null): void {
  if (result == null) return
  if (result.token != null && result.token !== '') {
    token.value = result.token
    setToken(result.token)
  }
  if (result.user != null) {
    user.value = result.user
    setCachedUser(result.user)
  }
}

/** 清空登录态 */
export function clearLogin(): void {
  token.value = ''
  user.value = null
  clearToken()
  clearUserCache()
}

/** 账号密码登录 */
export async function loginByPassword(account: string, password: string): Promise<LoginResult> {
  const result = await loginApi(account, password)
  applyLogin(result)
  return result
}

/** 校验登录态：token 失效会在请求层统一清理 */
export async function checkLoginState(): Promise<LoginResult | null> {
  if (token.value === '') return null
  const result = await checkToken()
  applyLogin(result)
  return result
}

/** 退出登录 */
export async function logout(): Promise<void> {
  try {
    await logoutApi()
  } catch (e) {
    // 后端失败也要清本地
  } finally {
    clearLogin()
  }
}
