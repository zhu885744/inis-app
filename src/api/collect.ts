import { http } from './request'
import type { TargetType } from './types'

/**
 * 收藏（user-collects）
 *
 * 与点赞（user-likes）同构：存在即收藏，取消即删记录。
 * `is-collected` 在权限规则里是 `type=login`，未登录调用会 401，所以未登录时直接跳过请求。
 */

/** 收藏状态与总数（GET user-collects/is-collected，需登录） */
export function isCollected(targetType: TargetType, targetId: number) {
  return http.get<{ is_collected: boolean; count: number }>(
    '/user-collects/is-collected',
    { target_type: targetType, target_id: targetId },
    { auth: true, silent: true }
  )
}

/** 收藏（POST user-collects/collect，需登录）；已收藏会返回 400 */
export function collect(targetType: TargetType, targetId: number) {
  return http.post<{ target_type: string; target_id: number }>(
    '/user-collects/collect',
    { target_type: targetType, target_id: targetId },
    { auth: true }
  )
}

/** 取消收藏（PUT user-collects/uncollect，需登录） */
export function uncollect(targetType: TargetType, targetId: number) {
  return http.put<{ target_type: string; target_id: number }>(
    '/user-collects/uncollect',
    { target_type: targetType, target_id: targetId },
    { auth: true }
  )
}

/** 批量收藏数（GET user-collects/counts，无需登录）：返回 { counts: { '1': 15 } } */
export function getCollectCounts(targetType: TargetType, targetIds: number[]) {
  return http.get<{ counts: Record<string, number> }>('/user-collects/counts', {
    target_type: targetType,
    target_ids: targetIds.filter((id) => Number(id) > 0).join(',')
  })
}
