import { http } from './request'
import type {
  FollowItem,
  FollowRelation,
  PageResult,
  SocialStats,
  SuggestUser,
  UserInfo
} from './types'

/**
 * 关注（user-follows）
 *
 * 关注 / 取关的判定口径见 docs/API docs/user-follows.md：
 * - `follow` 重复关注直接成功，不能关注自己（400）
 * - `unfollow` 没有记录也返回成功（后端按状态位处理）
 * - `is-following` / `relation` / `suggest` 都是 `type=login`，未登录 401
 */

/** 关注用户（POST user-follows/follow，需登录） */
export function follow(followUid: number) {
  return http.post<{ follow_uid: number }>('/user-follows/follow', { follow_uid: followUid }, { auth: true })
}

/** 取消关注（PUT user-follows/unfollow，需登录） */
export function unfollow(followUid: number) {
  return http.put<{ follow_uid: number }>('/user-follows/unfollow', { follow_uid: followUid }, { auth: true })
}

/** 是否已关注（GET user-follows/is-following，需登录） */
export function isFollowing(followUid: number) {
  return http.get<{ is_following: boolean }>(
    '/user-follows/is-following',
    { follow_uid: followUid },
    { auth: true, silent: true }
  )
}

/**
 * 互关状态（GET user-follows/relation，需登录）
 *
 * 主页按钮据此显示四态：未关注 → 关注；已关注 → 已关注；对方关注我 → 回关；互相关注 → 互关。
 * 查自己主页时后端强制 `is_follower=false`（避免「互关自己」）。
 */
export function getRelation(followUid: number) {
  return http.get<FollowRelation>('/user-follows/relation', { follow_uid: followUid }, { auth: true, silent: true })
}

/**
 * 关注列表（GET user-follows/following，无需登录）
 * 未登录时必须传 uid；对方设了私密会返回 `{ private: true }`
 */
export function getFollowing(uid: number, page = 1, limit = 20) {
  return http.get<PageResult<FollowItem>>('/user-follows/following', { uid, page, limit })
}

/** 粉丝列表（GET user-follows/followers，无需登录），隐私口径同 following */
export function getFollowers(uid: number, page = 1, limit = 20) {
  return http.get<PageResult<FollowItem>>('/user-follows/followers', { uid, page, limit })
}

/**
 * 社交数据卡片（GET user-follows/stats，无需登录）
 * 关注 / 粉丝 / 动态 / 文章 / 获赞；结果后端缓存 5 分钟
 */
export function getSocialStats(uid?: number) {
  return http.get<SocialStats>('/user-follows/stats', uid ? { uid } : {})
}

/**
 * 可能认识的人（GET user-follows/suggest，需登录）
 *
 * 三种「空列表但都返回 200」的分支，不能只判 `list.length`：
 * ① 我没关注任何人；② 二度查询异常（静默降级）；③ 没有候选人 —— 提示语在 msg 里。
 */
export function getSuggestUsers() {
  return http.get<{ list: SuggestUser[] }>('/user-follows/suggest', {}, { auth: true, silent: true })
}

/**
 * 用户公开信息（GET users/one，无需登录）
 * 用于作者主页展示昵称 / 简介 / 头衔（列表项里已内联作者，这里只在单独进主页时补全）
 */
export function getUserInfo(id: number) {
  return http.get<UserInfo>('/users/one', { id }, { silent: true })
}

/* ---------- 关注态缓存 ---------- */

/**
 * 关注态缓存
 *
 * 列表里每条内容都带作者，若逐条调 is-following，一屏就是十来个请求
 * （小程序并发上限正好是 10）。所以改成「点击时懒查 + 结果缓存」：
 * 第一次点某作者时才问后端，之后再点直接用缓存。
 */
const followingCache = new Map<number, boolean>()

export function getCachedFollowing(uid: number): boolean | undefined {
  return followingCache.get(Number(uid))
}

export function setCachedFollowing(uid: number, value: boolean): void {
  followingCache.set(Number(uid), value)
}

/** 取关注态（优先用缓存，未命中时请求一次；未登录按未关注处理） */
export async function resolveFollowing(uid: number): Promise<boolean> {
  const key = Number(uid)
  const cached = followingCache.get(key)
  if (cached !== undefined) return cached

  try {
    const result = await isFollowing(key)
    const value = Boolean(result?.is_following)
    followingCache.set(key, value)
    return value
  } catch {
    return false
  }
}

/** 退出登录 / 切换账号时清缓存（关注态是按用户算的，不能跨账号复用） */
export function clearFollowingCache(): void {
  followingCache.clear()
}
