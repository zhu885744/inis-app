import { http } from './request'
import { APP_SOURCE } from '@/config/env'

/** 登录返回：token + 用户信息 */
export interface LoginResult {
  token: string
  user: any
  valid_time?: number
}

/**
 * 账号密码登录
 *
 * 不发送 X-Gorgon / X-Argus / X-Khronos 三个头就是明文登录（后端只在命中正则时走 AES 分支），
 * 安全性由 HTTPS 保证。
 */
export function login(account: string, password: string): Promise<LoginResult> {
  return http.post<LoginResult>('/comm/login', {
    source: APP_SOURCE,
    account: account,
    password: password
  })
}

/** 校验登录态（renew 时顺带续期） */
export function checkToken(renew: boolean = false): Promise<LoginResult> {
  return http.post<LoginResult>('/comm/check-token', { renew: renew }, { auth: true, silent: true })
}

/** 退出登录 */
export function logout(): Promise<any> {
  return http.post<any>('/comm/logout', {}, { silent: true })
}
