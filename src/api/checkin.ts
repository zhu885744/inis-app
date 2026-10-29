import { http } from './request'

/**
 * 每日签到（checkin）
 *
 * - `status` 返回签到状态与奖励预览：`{ enabled, checked, streak, days, preview_days, ... }`
 *   `checked` 表示今天是否已签，`streak` 是连续天数（未签到时算到昨天）
 * - `sign` 直接签到，返回本次获得的奖励；**今天已签会返回 code=202**（"今日已签到"），
 *   请求层会把它当失败抛出并提示，调用方不用自己判重
 */

export interface CheckinStatus {
  /** 站点是否开启签到 */
  enabled?: boolean
  /** 今天是否已签到 */
  checked?: boolean
  /** 连续签到天数 */
  streak?: number
  /** 与 streak 同值，后端两个字段都给 */
  days?: number
  /** 签到后的预期连续天数 */
  preview_days?: number
  today?: string
  today_text?: string
  [key: string]: any
}

/** 签到状态（GET checkin/status，需登录） */
export function getCheckinStatus() {
  return http.get<CheckinStatus>('/checkin/status', {}, { auth: true, silent: true })
}

/** 每日签到（POST checkin/sign，需登录）；已签到返回 202 */
export function signIn() {
  return http.post<Record<string, any>>('/checkin/sign', {}, { auth: true })
}
