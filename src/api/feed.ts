import { http } from './request'
import type { MomentItem, PageResult } from './types'

/**
 * 聚合流（feed）
 *
 * 与 moments/all 的区别：这里是「按人 / 按热度」算出来的动态流，只有动态，没有文章。
 * - follow    关注流：我关注的人发的动态（必须登录）
 * - recommend 推荐流：按互动分排的候选池，最多 300 条
 * - hot       热门流：近 30 天高分动态
 *
 * 后端对 page / limit 是**静默钳制**（page>30 → 30，limit>20 → 20），
 * 响应里不回显生效值，所以这里不按传入值算分页，一律以「返回条数 < limit」判是否取尽。
 * 详见 docs/API docs/feed.md
 */
export type FeedType = 'follow' | 'recommend' | 'hot'

export interface FeedResult extends PageResult<MomentItem> {
  /** 回显实际生效的流类型 */
  type?: FeedType
}

export const FEED_MAX_LIMIT = 20
export const FEED_MAX_PAGE = 30

export function getFeed(type: FeedType = 'follow', page = 1, limit = 10) {
  return http.get<FeedResult>(
    '/feed/all',
    {
      type,
      page: Math.min(Math.max(1, page), FEED_MAX_PAGE),
      limit: Math.min(Math.max(1, limit), FEED_MAX_LIMIT)
    },
    { auth: true, silent: true }
  )
}
