import { http } from './request'
import type { MomentItem, PageResult } from './types'
import type { ListParams } from './article'

/** 动态列表字段：同样要带 result 才能拿到作者信息 */
export const MOMENT_LIST_FIELDS = 'id,uid,content,images,location,top,views,create_time,result'

/** 动态列表（匿名可访问，后端非管理员会强制 audit=1） */
export function getMoments(params: ListParams = {}) {
  const { page = 1, limit = 10, order = 'top desc, create_time desc', where, field = MOMENT_LIST_FIELDS } = params
  return http.get<PageResult<MomentItem>>('/moments/all', {
    page,
    limit,
    order,
    field,
    ...(where ? { where: JSON.stringify(where) } : {})
  })
}

/** 动态详情 */
export function getMoment(id: number) {
  return http.get<MomentItem>('/moments/one', { id })
}

/**
 * 发布动态的入参
 *
 * 后端 allowFields 只认这几个字段（见 app/api/controller/moments.go）：
 * content / images / location / json / text / publish_time / status / scope / scope_integral。
 * `tags` 由后端从正文里的 #话题# 自动解析，**不要提交**。
 */
export interface MomentPayload {
  content: string
  /** 图片地址，逗号分隔（后端存的就是这种形式） */
  images?: string
  location?: string
  /** 0 草稿 / 1 发布 */
  status?: number
  /** 1 公开 / 2 登录可见 / 3 积分可见 */
  scope?: number
  /** scope=3 时生效 */
  scope_integral?: number
}

export interface MomentSaveResult {
  id: number
  /** 0 待审核 / 1 通过 / 2 未通过 */
  audit?: number
  /** 0 草稿 / 1 已发布 */
  status?: number
}

/** 创建动态（POST moments/create，需登录） */
export function createMoment(payload: MomentPayload) {
  return http.post<MomentSaveResult>('/moments/create', payload, { auth: true, loading: '发布中' })
}

/** 更新动态（PUT moments/update，需登录） */
export function updateMoment(id: number, payload: Partial<MomentPayload>) {
  return http.put<MomentSaveResult>('/moments/update', { id, ...payload }, { auth: true, loading: '保存中' })
}

/** 软删除动态（DELETE moments/remove，需登录；进回收站） */
export function removeMoment(id: number) {
  return http.delete('/moments/remove', { id }, { auth: true })
}
