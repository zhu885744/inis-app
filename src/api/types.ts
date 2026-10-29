/** 后端统一响应体：HTTP 状态码恒为 200，业务结果看 code */
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

/** 分页响应：列表在 data.data，总数 data.count，总页数 data.page */
export interface PageResult<T> {
  data: T[]
  count: number
  page: number
}

/** 后端业务错误码（详见 docs/API docs/comm.md） */
export const Code = {
  SUCCESS: 200,
  SENT: 201,
  NO_DATA: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 405,
  NOT_INSTALL: 412,
  NEED_CAPTCHA: 428
} as const

export interface UserInfo {
  id: number
  account?: string
  nickname?: string
  avatar?: string
  email?: string
  phone?: string
  description?: string
  /** 文字头衔（图片头衔时为空，取 json.title_decoration） */
  title?: string
  status?: number
  create_time?: number
  json?: Record<string, any>
  [key: string]: any
}

/** 登录 / check-token 返回 */
export interface LoginResult {
  user: UserInfo
  token: string
  /** token 剩余有效秒数 */
  valid_time: number
}

/** 作者信息：列表项里内联返回，见 item.result.author */
export interface AuthorInfo {
  id: number
  nickname?: string
  avatar?: string
  description?: string
  title?: string
  json?: Record<string, any>
}

/** 文章列表项 */
export interface ArticleItem {
  id: number
  uid: number
  title?: string
  abstract?: string
  covers?: string
  views?: number
  tags?: string
  create_time?: number
  publish_time?: number
  result?: {
    author?: AuthorInfo
    comment?: { allow?: number; show?: number; count?: number }
    [key: string]: any
  }
  [key: string]: any
}

/** 动态列表项 */
export interface MomentItem {
  id: number
  uid: number
  content?: string
  images?: string
  location?: string
  views?: number
  top?: number
  create_time?: number
  result?: {
    author?: AuthorInfo
    comment?: { allow?: number; show?: number; count?: number }
    [key: string]: any
  }
  [key: string]: any
}

/** 互动目标类型：点赞 / 评论 / 收藏共用同一套取值 */
export type TargetType = 'article' | 'page' | 'moments' | 'comment'

/**
 * 评论项（comment/flat 返回）
 *
 * 注意 `replies` 是**扁平数组**：后端从根评论出发递归收集了**所有层级**的后代 id，
 * 一次性挂在根评论上（见 app/api/controller/comment.go 的 replies()），不是嵌套树。
 * 需要真实层级时用 pid 在前端重建，见 utils/comment.ts 的 buildCommentTree。
 */
export interface CommentItem {
  id: number
  pid: number
  uid: number
  content?: string
  images?: string
  bind_id?: number
  bind_type?: string
  audit?: number
  reason?: string
  create_time?: number
  update_time?: number
  result?: {
    author?: AuthorInfo
    article?: { id: number; title?: string }
    page?: { id: number; key?: string; title?: string }
    moments?: { id: number; content?: string }
    [key: string]: any
  }
  /** 根评论下的全部后代（扁平，只有根评论有该字段） */
  replies?: CommentItem[]
  [key: string]: any
}

/** 点赞状态与总数（user-likes/is-liked，需登录） */
export interface LikeState {
  is_liked: boolean
  count: number
}

/** 点赞记录（user-likes/likes 的 list 项） */
export interface LikeItem {
  id: number
  uid?: number
  target_type: string
  target_id: number
  create_time?: number
  result?: { author?: AuthorInfo; [key: string]: any }
  [key: string]: any
}

/** 关注关系（user-follows/relation，需登录） */
export interface FollowRelation {
  is_following: boolean
  is_follower: boolean
  mutual: boolean
}

/** 关注 / 粉丝列表项 */
export interface FollowItem {
  id: number
  uid: number
  follow_uid: number
  status?: number
  create_time?: number
  result?: { follow_user?: AuthorInfo; [key: string]: any }
  [key: string]: any
}

/** 可能认识的人（user-follows/suggest，需登录） */
export interface SuggestUser extends AuthorInfo {
  /** 共同关注数（仅聚合数字，不暴露关系明细） */
  mutual_count?: number
}

/** 社交数据卡片（user-follows/stats，无需登录） */
export interface SocialStats {
  follow: number
  fans: number
  moment: number
  article: number
  likes: number
}

/** 商品（/api/goods/all 列表项，见 docs/API docs/goods.md） */
export interface GoodsItem {
  id: number
  title: string
  description?: string
  cover?: string
  /** 积分价格 */
  price: number
  stock: number
  sold?: number
  status?: number
  type?: 'virtual' | 'physical' | string
  /** 发货方式：text 文本 / card 卡密 / decoration 装扮 / "" 无 */
  deliver_type?: string
  decoration_id?: number
  category?: string
  limit_per_user?: number
  min_exp?: number
  start_time?: number
  end_time?: number
  sort?: number
  create_time?: number
  update_time?: number
  delete_time?: number
  /** 附加字段：能否兑换 / 原因 / 我已兑换数 / 限购剩余（-1 不限） */
  can_buy?: boolean
  buy_reason?: string
  my_bought?: number
  limit_remain?: number
  decoration_name?: string
  decoration_type?: string
  decoration_duration?: number
  decoration_permanent?: boolean
  [key: string]: any
}

/** 商品分类聚合（/api/goods/categories，data 直接是数组） */
export interface GoodsCategory {
  category: string
  name: string
  count: number
}

/** 兑换商品返回 */
export interface GoodsBuyResult {
  order_id: number
  order_no: string
  price: number
  /** 扣费后的积分余额 */
  integral: number
  status: number
  deliver_content?: string
  limit_remain?: number
}

/** 我的兑换统计（/api/goods/my-stats） */
export interface GoodsStats {
  order_total: number
  pending: number
  shipped: number
  completed: number
  canceled: number
  integral_spent: number
  integral: number
}

/** 装扮类型元数据（/api/decoration/types） */
export interface DecorationTypeMeta {
  type: string
  name: string
  icon?: string
  slot?: string
  allow_custom_text?: number
  fields?: string[]
  description?: string
}

/** 装扮配置（/api/decoration/config，直接就是配置本体） */
export interface DecorationConfig {
  enabled: number
  show_in_goods: number
  currency: string
  avatar_frame: { enabled: number; frame_scale?: number }
  title: { enabled: number; allow_custom?: number; max_length?: number; presets?: string[] }
}

/** 装扮（商城 / 详情 / 我的装扮通用，字段随场景取舍） */
export interface DecorationItem {
  id: number
  type: string
  name: string
  description?: string
  preview?: string
  /** 样式 JSON：头衔为 text/image + color/bg/border/glow/icon/scale，头像框为 image/scale */
  payload?: Record<string, any> | string
  price_type?: 'integral' | 'exp' | 'free' | string
  price: number
  rarity?: string
  /** 有效期（秒），0 = 永久 */
  duration?: number
  category?: string
  status?: number
  sort?: number
  sold?: number
  /** -1 不限量 / 0 售罄 / >0 剩余 */
  stock?: number
  min_exp?: number
  is_default?: number | boolean
  create_time?: number
  /** 商城列表附加 */
  unlimited?: boolean
  sold_out?: boolean
  permanent?: boolean
  on_sale?: boolean
  buy_reason?: string
  /** 我的装扮附加 */
  owned?: boolean
  expire_time?: number
  expired?: boolean
  off_shelf?: boolean
  custom_text?: string
  source?: string
  wearing?: boolean
  [key: string]: any
}

/** 装扮商城（未开启时整个 data 为 null） */
export interface DecorationShopResult {
  data: DecorationItem[]
  count: number
  types: DecorationTypeMeta[]
}

/** 兑换装扮返回（integral 为扣费后余额） */
export interface DecorationBuyResult {
  decoration_id: number
  name: string
  type: string
  price: number
  integral: number
  expire_time: number
  duration: number
}

/** 我的装扮：(/api/decoration/mine) */
export interface MyDecorationsResult {
  types: DecorationTypeMeta[]
  wearing: Record<string, DecorationItem>
  list: Record<string, DecorationItem[]>
}

/** 通知项（notification/list，需登录） */
export interface NotificationItem {
  id: number
  uid: number
  from_uid?: number
  /** comment / like / collect / follow / system 等，见 docs/API docs/notification.md */
  type?: string
  title?: string
  content?: string
  bind_id?: number
  bind_type?: string
  is_read?: number
  create_time?: number
  result?: { from_user?: AuthorInfo; [key: string]: any }
  [key: string]: any
}
