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
