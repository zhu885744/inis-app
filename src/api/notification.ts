import { http } from './request'
import { toIds, toIdsArray } from './ids'
import type { NotificationItem, PageResult } from './types'

/**
 * 消息通知（notification/*，全部需登录）
 *
 * 机制（见 docs/API docs/notification.md）：
 * - 通知只落库、**没有 WebSocket 推送**，前端靠拉列表 + 轮询未读数刷新角标
 * - 可见范围 = 自己的通知 + 广播（uid=0，且自己未隐藏）
 * - 广播的已读状态存在 notification_read 表，所以同一条广播在不同用户视角下 `is_read` 不同
 */

/** 列表字段白名单：带 result 才能拿到触发者（result.from_user） */
export const NOTIFICATION_FIELDS =
  'id,uid,from_uid,type,title,content,bind_id,bind_type,is_read,create_time,result'

/** 通知类型：与后端的 type 取值一一对应 */
export type NotificationType = 'comment' | 'like' | 'collect' | 'follow' | 'system'

/** 消息页顶部的分类：'all' 只在前端过滤，不传给后端 */
export type NotificationChannel = 'all' | NotificationType

export interface NotificationListParams {
  page?: number
  limit?: number
  order?: string
  /** 类型过滤 */
  type?: NotificationType
  /** 已读过滤：不传 / 传空表示「全部」；0=未读，1=已读 */
  is_read?: number
  field?: string
}

/**
 * 通知列表（GET notification/list，需登录）
 *
 * 注意后端分页参数名是 `limit`（走 meta.limit），不是文档里写的 `size`。
 * `is_read` 不传 / 传空串 / 传 null 都表示「全部」，只有显式传 0 / 1 才过滤。
 */
export function listNotifications(params: NotificationListParams = {}) {
  const {
    page = 1,
    limit = 15,
    order = 'create_time desc',
    type,
    is_read,
    field = NOTIFICATION_FIELDS
  } = params

  return http.get<PageResult<NotificationItem>>(
    '/notification/list',
    {
      page,
      limit,
      order,
      field,
      ...(type ? { type } : {}),
      ...(is_read === 0 || is_read === 1 ? { is_read } : {})
    },
    { auth: true }
  )
}

/** 未读通知总数（GET notification/unread-count，需登录） */
export function getUnreadCount() {
  return http.get<{ count: number }>('/notification/unread-count', {}, { auth: true, silent: true })
}

/** 标记单条已读（PUT notification/read，需登录） */
export function readNotification(id: number) {
  return http.put<{ id: number }>('/notification/read', { id }, { auth: true })
}

/** 全部标记已读（PUT notification/read-all，需登录） */
export function readAllNotifications() {
  return http.put<null>('/notification/read-all', {}, { auth: true })
}

/** 批量标记已读（PUT notification/read-batch，需登录；单次数量有上限） */
export function readBatchNotifications(ids: number | number[]) {
  return http.put<{ ids: number[] }>('/notification/read-batch', { ids: toIdsArray(ids) }, { auth: true })
}

/**
 * 删除通知（DELETE notification/remove，软删除，需登录）
 * 广播通知的删除对普通用户表现为「隐藏」（写 notification_read.is_deleted=1）
 */
export function removeNotifications(ids: number | number[], params: { type?: string; scope?: string } = {}) {
  return http.delete<{ ids: number[] }>('/notification/remove', { ids: toIds(ids), ...params }, { auth: true })
}

/**
 * 清空通知（DELETE notification/remove-all，软删除，需登录）
 * - 传 `is_read=1` 时只清空已读（做「清空已读」按钮）
 * - 单次最多 200 条，返回 `{ cleared, remaining }`，remaining>0 需要再调一次
 */
export function removeAllNotifications(params: { type?: NotificationType; is_read?: number } = {}) {
  return http.delete<{ ids?: number[]; cleared?: number; remaining?: number }>(
    '/notification/remove-all',
    params,
    { auth: true }
  )
}

/**
 * 反复调用 remove-all 直到清空（单次 200 条上限）
 * 返回累积清理数量，便于页面提示「已清空 N 条」
 */
export async function clearNotifications(
  params: { type?: NotificationType; is_read?: number } = {},
  rounds = 10
) {
  let cleared = 0
  for (let i = 0; i < rounds; i++) {
    const result = await removeAllNotifications(params)
    // 204 无数据时请求层会回传 null
    if (!result) break
    cleared += Number(result.cleared || 0)
    if (Number(result.remaining || 0) <= 0) break
  }
  return cleared
}
