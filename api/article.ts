import { http } from './request'

/** 分页返回：后端统一 { data, count, page } */
export interface PageResult {
  data: any[]
  count?: number
  page?: number
}

/** 列表字段：只要卡片需要的，少传少解析 */
export const ARTICLE_LIST_FIELDS = 'id,title,abstract,covers,top,publish_time,create_time,result'

/**
 * 文章列表
 * where 支持后端语法（如 { id: { $in: [1,2] } }），GET 会拼到 query，
 * 所以嵌套对象要先 JSON.stringify。
 */
export function getArticles(query: {
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
    field: query.field ?? ARTICLE_LIST_FIELDS
  }
  if (query.where != null) data.where = JSON.stringify(query.where)
  // 列表页静默：失败由页面统一提示一次，避免一屏两次 toast
  return http.get<PageResult>('/article/list', data, { silent: true })
}

/** 文章详情 */
export function getArticle(id: number): Promise<any> {
  return http.get<any>('/article/one', { id: id })
}
