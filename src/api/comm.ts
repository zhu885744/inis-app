import { http } from './request'
import type { SliderChallenge } from '@/utils/captcha'
import type { LoginResult, UserInfo } from './types'

/** 移动端来源标识：后端按 source 区分不同客户端的账号体系 */
export const SOURCE = 'inis-app'

/**
 * 登录
 *
 * 后端在 `X-Gorgon` 命中 `^([\w+]{16})\D+([\w+]{16})$` 时才走 AES 解密分支
 * （见 app/api/controller/comm.go），因此**不发送** X-Gorgon / X-Argus / X-Khronos
 * 这三个头就是明文登录，安全由 HTTPS 保障（小程序端本来也只能走 https）。
 */
export function login(data: { account: string; password: string }) {
  return http.post<LoginResult>('/comm/login', { source: SOURCE, ...data })
}

/**
 * 注册
 * - 不传 code：只发验证码（返回 null，业务码 201）
 * - 传了 code：完成注册，返回登录态；若站点开启人工审核则返回 { user, need_audit: true }（无 token）
 */
export function register(data: {
  social: string
  code?: string
  password?: string
  account?: string
  nickname?: string
  source?: string
}) {
  return http.post<LoginResult | { user: UserInfo; need_audit?: boolean } | null>('/comm/register', {
    source: SOURCE,
    ...data
  })
}

/**
 * 验证码登录
 * - 不传 code：给 social 发登录验证码（返回 null，业务码 201）
 * - 传了 code：免密登录
 */
export function signCode(data: { social: string; code?: string }) {
  return http.post<LoginResult | null>('/comm/sign-code', { source: SOURCE, ...data })
}

/**
 * 重置密码
 * - 不传 code/password：发重置验证码（返回 null，业务码 201）
 * - 传 code + password：完成重置
 */
export function resetPassword(data: { social: string; code?: string; password?: string }) {
  return http.post<null>('/comm/reset-password', { source: SOURCE, ...data })
}

/** 校验登录态（token 从 Authorization 头取；renew 为 true 时顺带续期） */
export function checkToken(renew = false) {
  return http.post<LoginResult>('/comm/check-token', { renew }, { auth: true, silent: true })
}

/** 退出登录：清后端 Cookie（移动端主要清本地） */
export function logout() {
  return http.post<null>('/comm/logout', {}, { silent: true })
}

/**
 * 滑块验证码题目（428 风控场景）
 *
 * 注意 `target` 是**数字**（落点百分比 10~90），不是字符串；
 * 428 响应里的 `data.captcha` 与这里的结构完全一致（见 utils/captcha.ts）
 */
export function getCaptcha() {
  return http.get<SliderChallenge>('/comm/captcha', {}, { silent: true })
}
