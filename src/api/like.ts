import { http } from './request'
import type { LikeItem, LikeState, TargetType } from './types'

/**
 * 点赞（user-likes）
 *
 * 设计是「存在即点赞」：点赞 = 新增一条记录，取消 = 删除记录，
 * 因此没有软删除 / 回收站（见 docs/API docs/user-likes.md）。
 *
 * 鉴权说明：`is-liked` 在权限规则里是 `type=login`（app/model/auth-rules.go），
 * **未登录调用会 401**，所以未登录时直接跳过请求、按「未点赞」展示。
 */

/** 是否已点赞 + 总数（GET user-likes/is-liked，需登录） */
export function isLiked(targetType: TargetType, targetId: number) {
  return http.get<LikeState>(
    '/user-likes/is-liked',
    { target_type: targetType, target_id: targetId },
    { auth: true, silent: true }
  )
}

/**
 * 点赞（POST user-likes/like，需登录）
 *
 * 不加 silent：已点过时后端返回 400「已经点赞过了」，让用户看到原因，
 * 调用方在失败时回滚本地的乐观更新（见 components/CommentList.vue 的 onLike）
 */
export function like(targetType: TargetType, targetId: number) {
  return http.post<{ target_type: string; target_id: number }>(
    '/user-likes/like',
    { target_type: targetType, target_id: targetId },
    { auth: true }
  )
}

/** 取消点赞（PUT user-likes/unlike，需登录）；记录不存在也返回成功 */
export function unlike(targetType: TargetType, targetId: number) {
  return http.put<{ target_type: string; target_id: number }>(
    '/user-likes/unlike',
    { target_type: targetType, target_id: targetId },
    { auth: true }
  )
}

/**
 * 批量查询点赞数（GET user-likes/counts，无需登录）
 * 返回 `{ counts: { '1': 10, '2': 5 } }`，key 是 target_id 的字符串形式
 */
export function getLikeCounts(targetType: TargetType, targetIds: number[]) {
  return http.get<{ counts: Record<string, number> }>('/user-likes/counts', {
    target_type: targetType,
    target_ids: targetIds.filter((id) => Number(id) > 0).join(',')
  })
}

/**
 * 点赞列表（GET user-likes/likes，无需登录）
 *
 * 返回 `{ list, count }`（注意不是通用分页结构）。
 * 未登录时必须传 `uid`；查他人时对方若关闭了「公开我的点赞」会返回 `{ private: true }`。
 */
export function getUserLikes(params: { uid?: number; target_type?: TargetType; field?: string }) {
  return http.get<{ list?: LikeItem[]; count?: number; private?: boolean }>('/user-likes/likes', params)
}

/**
 * 我在某类目标下点过赞的 id 集合（用「我的点赞记录」反查，避免对每条评论单独调 is-liked）
 *
 * 走 `user-likes/all`：非管理员只能看到自己的记录，所以不需要显式带 uid。
 * `limit` 有上限（站点分页配置），因此这是「最近 limit 条点赞」，
 * 只用于评论 / 动态列表的点赞态初始化，个别历史数据缺失可接受。
 */
export async function getMyLikedIds(targetType: TargetType, limit = 200): Promise<Set<number>> {
  const result = await http.get<{ data?: LikeItem[] }>(
    '/user-likes/all',
    {
      page: 1,
      limit,
      field: 'id,target_id,target_type',
      where: JSON.stringify({ target_type: targetType })
    },
    { auth: true, silent: true }
  )

  const ids = new Set<number>()
  for (const item of result?.data || []) {
    if (Number(item?.target_id) > 0) ids.add(Number(item.target_id))
  }
  return ids
}
