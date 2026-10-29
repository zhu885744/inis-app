import { http } from './request'

/**
 * 搜索（search/*，全部无需登录）
 *
 * 约定（见 app/api/controller/search.go）：
 * - `keyword` 必填，为空后端返回 400「搜索关键词不能为空！」
 * - `fields` 可选，逗号分隔，用于限定搜索字段（默认按各类型的默认字段集搜）
 * - 命中的关键词会被后端包上 `<mark>` 高亮，渲染前记得按文本处理（不要直接当 HTML 塞进 rich-text）
 * - 只返回审核通过（audit=1）的内容；用户搜索会排除冻结用户、邮箱自动脱敏
 */

/** 单类型搜索范围：`pages` 是后端定义名（不是 page），注意别写成单数 */
export type SearchScope = 'article' | 'pages' | 'tags' | 'users' | 'links' | 'moments'

/** 搜索结果项（不同类型字段不同，这里只声明各类型的展示要点） */
export interface SearchArticleItem {
  id: number
  title?: string
  covers?: string
  abstract?: string
  /** 正文里命中关键词的一段（去掉了 HTML / Markdown 标记），abstract 为空时用它兜底 */
  snippet?: string
  tags?: string
  views?: number
  create_time?: number
  audit?: number
  [key: string]: any
}

export interface SearchPageItem {
  id: number
  key?: string
  title?: string
  snippet?: string
  views?: number
  create_time?: number
  [key: string]: any
}

export interface SearchTagItem {
  id: number
  name?: string
  avatar?: string
  description?: string
  [key: string]: any
}

export interface SearchUserItem {
  id: number
  nickname?: string
  avatar?: string
  description?: string
  title?: string
  /** 已脱敏：z***@example.com */
  email?: string
  [key: string]: any
}

export interface SearchLinkItem {
  id: number
  nickname?: string
  avatar?: string
  description?: string
  url?: string
  audit?: number
  [key: string]: any
}

export interface SearchMomentItem {
  id: number
  content?: string
  images?: string
  location?: string
  create_time?: number
  [key: string]: any
}

/** 单类型搜索结果：`data` 是列表、`count` 是总数、`page` 是总页数 */
export interface SearchResult<T> {
  data: T[]
  count: number
  page: number
  keyword?: string
  type?: string
}

/** 各类型结果项的类型映射，便于 `searchBy('users', ...)` 拿到正确类型 */
export interface SearchItemMap {
  article: SearchArticleItem
  pages: SearchPageItem
  tags: SearchTagItem
  users: SearchUserItem
  links: SearchLinkItem
  moments: SearchMomentItem
}

/** 全局搜索结果：按类型分组，`total` 是各类型 count 之和 */
export interface SearchAllResult extends Record<SearchScope, SearchResult<any>> {
  total: number
  keyword?: string
  type?: string
}

/** 各类型的默认搜索字段（与后端默认一致，传 fields 可覆盖） */
export const SEARCH_FIELDS: Record<SearchScope, string> = {
  article: 'title,content,abstract,tags',
  pages: 'title,content,key',
  tags: 'name,description',
  users: 'nickname,email,description,title',
  links: 'nickname,description,url',
  moments: 'content,location'
}

export interface SearchParams {
  page?: number
  limit?: number
  /** 限定搜索字段，逗号分隔（如 'title' 只搜标题） */
  fields?: string
}

/** 单类型搜索（GET search/{scope}） */
export function searchBy<T extends SearchScope>(
  scope: T,
  keyword: string,
  params: SearchParams = {}
): Promise<SearchResult<SearchItemMap[T]>> {
  const { page = 1, limit = 10, fields } = params
  return http.get<SearchResult<SearchItemMap[T]>>(`/search/${scope}`, {
    keyword,
    page,
    limit,
    ...(fields ? { fields } : {})
  })
}

/** 文章搜索（列表页展示建议：封面 covers + title + abstract，abstract 为空退化成 snippet） */
export const searchArticles = (keyword: string, params: SearchParams = {}) =>
  searchBy('article', keyword, params)

/** 动态搜索 */
export const searchMoments = (keyword: string, params: SearchParams = {}) => searchBy('moments', keyword, params)

/** 用户搜索（头像 + 昵称 + 简介 + 头衔 + 脱敏邮箱） */
export const searchUsers = (keyword: string, params: SearchParams = {}) => searchBy('users', keyword, params)

/** 话题（标签）搜索 */
export const searchTags = (keyword: string, params: SearchParams = {}) => searchBy('tags', keyword, params)

/** 独立页面搜索（列表用 snippet 展示，页面没有摘要字段） */
export const searchPages = (keyword: string, params: SearchParams = {}) => searchBy('pages', keyword, params)

/** 友链搜索 */
export const searchLinks = (keyword: string, params: SearchParams = {}) => searchBy('links', keyword, params)

/**
 * 全局搜索（GET search/all）
 * 后端会把 `limit` 均分给 6 种类型（每种至少 1 条），且**不返回各类型的 fields 过滤**。
 */
export function searchAll(keyword: string, params: SearchParams = {}) {
  const { page = 1, limit = 10 } = params
  return http.get<SearchAllResult>('/search/all', { keyword, page, limit })
}
