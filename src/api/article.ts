import { http } from './request'
import type { ArticleItem, PageResult } from './types'

/**
 * 列表字段白名单：不传 content 等大字段，但**必须带上 result**，
 * 否则后端会按 field 裁剪掉作者 / 评论数（见 app/api/controller/article.go 的 ArrayMapWithField）
 */
export const ARTICLE_LIST_FIELDS = 'id,uid,title,abstract,covers,tags,top,views,create_time,publish_time,result'

export interface ListParams {
  page?: number
  limit?: number
  order?: string
  where?: Record<string, any>
  field?: string
}

/** 文章列表（匿名可访问，后端非管理员会强制 audit=1 且 status=1） */
export function getArticles(params: ListParams = {}) {
  const { page = 1, limit = 10, order = 'create_time desc', where, field = ARTICLE_LIST_FIELDS } = params
  return http.get<PageResult<ArticleItem>>('/article/all', {
    page,
    limit,
    order,
    field,
    // where 用 JSON 字符串传递：uni.request 的 query 序列化不支持嵌套对象
    ...(where ? { where: JSON.stringify(where) } : {})
  })
}

/** 文章详情 */
export function getArticle(id: number) {
  return http.get<ArticleItem>('/article/one', { id })
}
