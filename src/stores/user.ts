import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as commApi from '@/api/comm'
import type { LoginResult, UserInfo } from '@/api/types'
import {
  clearRecentServices,
  clearToken,
  clearUserCache,
  getCachedUser,
  getToken,
  setCachedUser,
  setToken
} from '@/utils/storage'
import { clearFollowingCache } from '@/api/follow'
import { pickUserTitlePayload, pickUserTitleText } from '@/utils/helper'

export const useUserStore = defineStore('user', () => {
  /** token（裸 JWT，请求时放 Authorization 头） */
  const token = ref<string>(getToken())
  /** 用户信息：先读本地缓存，再用 check-token 校正 */
  const user = ref<UserInfo | null>(getCachedUser())

  const isLogin = computed(() => Boolean(token.value))
  const nickname = computed(() => user.value?.nickname || user.value?.account || '未登录')
  const avatar = computed(() => user.value?.avatar || '')
  const title = computed(() => pickUserTitleText(user.value))
  const titlePayload = computed(() => pickUserTitlePayload(user.value))

  /** 写入登录态（登录 / 注册 / check-token 成功后统一走这里） */
  function applyLogin(result: LoginResult): void {
    if (result?.token) {
      token.value = result.token
      setToken(result.token)
    }
    if (result?.user) {
      user.value = result.user
      setCachedUser(result.user)
    }
  }

  /** 清空登录态 */
  function clearLogin(): void {
    token.value = ''
    user.value = null
    clearToken()
    clearUserCache()
    // 关注态是按用户算的，切换账号后必须失效，否则会串数据
    clearFollowingCache()
    clearRecentServices()
  }

  /** 账号密码登录 */
  async function loginByPassword(account: string, password: string): Promise<LoginResult> {
    const result = await commApi.login({ account, password })
    applyLogin(result)
    return result
  }

  /** 校验登录态：token 失效会在请求层统一清理 */
  async function checkLoginState(): Promise<LoginResult | null> {
    if (!token.value) return null
    const result = await commApi.checkToken()
    applyLogin(result)
    return result
  }

  /** 退出登录 */
  async function logout(): Promise<void> {
    try {
      await commApi.logout()
    } finally {
      clearLogin()
    }
  }

  return {
    token,
    user,
    isLogin,
    nickname,
    avatar,
    title,
    titlePayload,
    applyLogin,
    clearLogin,
    loginByPassword,
    checkLoginState,
    logout
  }
})
