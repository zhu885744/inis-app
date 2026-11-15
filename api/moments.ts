import { http } from './request'
import type { PageResult } from './article'

/** 动态列表字段 */
export const MOMENT_LIST_FIELDS = 'id,content,images,location,top,create_time,result'

/** 动态列表 */
export function getMoments(query: {
  page?: number
  limit?: number
  where?: any
  order?: string
  field?: string
}): Promise<PageResult> {
  const data: any = {
    page: query.page ?? 1,
    limit: query.limit ?? 10,
    order: query.order ?? 'create_time desc',
    field: query.field ?? MOMENT_LIST_FIELDS
  }
  if (query.where != null) data.where = JSON.stringify(query.where)
  return http.get<PageResult>('/moments/list', data, { silent: true })
}

/** 动态详情 */
export function getMoment(id: number): Promise<any> {
  return http.get<any>('/moments/one', { id: id })
}
