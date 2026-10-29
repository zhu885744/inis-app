import { http } from './request'
import { toIds } from './ids'
import type { CommentItem, PageResult, TargetType } from './types'

/**
 * 评论列表字段白名单
 *
 * - 必须带 `result`：作者 / 来源（article / page / moments）由后端 AfterFind 内联在里面
 * - 必须带 `pid`：`replies` 是扁平数组，前端要靠 pid 重建层级
 * - 权限组 / 封禁等管理侧字段后端已脱敏，不需要额外裁剪
 */
export const COMMENT_LIST_FIELDS =
  'id,pid,uid,content,images,bind_id,bind_type,audit,reason,create_time,update_time,result'

export interface CommentListParams {
  page?: number
  limit?: number
  order?: string
  field?: string
}

/**
 * 评论列表（GET comment/flat，无需登录）
 *
 * 入参（见 app/api/controller/comment.go 的 flat）：
 * - `bind_id` 必填，为空后端直接 400
 * - `bind_type` 默认 article，可选 page / moments
 * - `limit` 会被后端按站点配置封顶（meta.limit），这里只作为期望值
 *
 * 返回：`{ data, count, page }`；`count` / `page` **只统计根评论**，
 * 每条根评论带 `replies`（其下全部后代的扁平列表）。
 */
export function getComments(bindId: number, bindType: TargetType = 'article', params: CommentListParams = {}) {
  const { page = 1, limit = 10, order = 'create_time desc', field = COMMENT_LIST_FIELDS } = params
  return http.get<PageResult<CommentItem>>('/comment/flat', {
    bind_id: bindId,
    bind_type: bindType,
    page,
    limit,
    order,
    field
  })
}

export interface CreateCommentParams {
  bind_id: number
  bind_type?: TargetType
  /** 父级评论 id，0 / 不传即主评论 */
  pid?: number
  content?: string
  /** 图片地址，逗号分隔（与后台上传结果一致） */
  images?: string
  /** text / markdown，移动端统一用 text */
  editor?: string
}

/**
 * 发表评论 / 回复（POST comment/create，需登录）
 *
 * 返回 `{ id, audit, pending }`：
 * - 站点开启内容审核时 `audit=0`、`pending=true`，评论**不会立刻出现在列表里**
 *   （非管理员只查得到 audit=1），前端应提示「审核通过后显示」并插入本地占位
 * - 评论开关（全局 / 模块 / 内容自身 json.comment）由后端判定，关闭时返回 400
 * - 站点开了频率限制 / 敏感词 / 必须含中文时，后端也会 400 / 429，错误文案直接透传
 */
export function createComment(data: CreateCommentParams) {
  return http.post<{ id: number; audit: number; pending: boolean }>(
    '/comment/create',
    { editor: 'text', ...data },
    { auth: true }
  )
}

/** 删除评论（DELETE comment/remove，软删除；仅本人或管理员） */
export function removeComment(ids: number | number[]) {
  return http.delete<{ ids: number[] }>('/comment/remove', { ids: toIds(ids) }, { auth: true })
}
