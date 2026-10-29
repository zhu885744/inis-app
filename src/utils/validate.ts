import { toast } from './toast'

export const PHONE_RE = /^1[3-9]\d{9}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isPhone(value: string): boolean {
  return PHONE_RE.test(String(value || '').trim())
}

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(String(value || '').trim())
}

/**
 * 校验「邮箱或手机号」并给出提示
 * 注册 / 发码 / 重置密码共用（后端 social 字段同时接受两者）
 */
export function validateSocial(value: string, silent = false): boolean {
  const social = String(value || '').trim()
  const ok = isPhone(social) || isEmail(social)
  if (!ok && !silent) toast(social ? '请输入正确的邮箱或手机号' : '请输入邮箱或手机号')
  return ok
}

/** 密码规则：与后端保持一致的最小长度约束 */
export const PASSWORD_MIN = 6

export function validatePassword(value: string, silent = false): boolean {
  const ok = String(value || '').length >= PASSWORD_MIN
  if (!ok && !silent) toast(`密码至少 ${PASSWORD_MIN} 位`)
  return ok
}

/** 6 位数字验证码 */
export function validateCode(value: string, silent = false): boolean {
  const ok = /^\d{6}$/.test(String(value || '').trim())
  if (!ok && !silent) toast('请输入 6 位数字验证码')
  return ok
}
