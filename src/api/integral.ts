import { http } from './request'

/**
 * 积分（integral）
 *
 * - `status`：余额 + 累计收支 + 今日收支（需登录）
 * - `tasks`：今日任务进度（需登录），`list` 里每项含 name / done / remain
 *
 * 返回值结构由后端决定，这里用宽松类型，页面按需取值。
 */

export interface IntegralTaskItem {
  type?: string
  name?: string
  done?: boolean
  remain?: number
  [key: string]: any
}

export interface IntegralTasks {
  list?: IntegralTaskItem[]
  done_count?: number
  total_count?: number
  streak?: number
  [key: string]: any
}

/** 积分概览（需登录） */
export function getIntegral() {
  return http.get<Record<string, any>>('/integral/status', undefined, { auth: true, silent: true })
}

/** 今日积分任务进度（需登录） */
export function getIntegralTasks() {
  return http.get<IntegralTasks>('/integral/tasks', undefined, { auth: true, silent: true })
}
