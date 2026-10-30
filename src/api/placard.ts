import { http } from './request'
import type { PageResult } from './types'

/**
 * 公告（placard）：首页公告轮播的数据源
 *
 * 类型与文案口径与 Mellow 主题一致（utils/placard.js）：
 * notice 公告 / warning 警告 / info 提示
 */
export interface PlacardItem {
  id: number
  title: string
  content?: string
  type?: string
  url?: string
  target?: string
  create_time?: string
}

export const PLACARD_TYPES = [
  { value: 'notice', label: '公告', color: 'var(--primary)', bg: 'rgba(199, 72, 42, 0.12)' },
  { value: 'warning', label: '警告', color: 'var(--warning)', bg: 'rgba(192, 138, 46, 0.16)' },
  { value: 'info', label: '提示', color: '#4a90e2', bg: 'rgba(74, 144, 226, 0.14)' }
]

export function placardTypeOf(type?: string) {
  return PLACARD_TYPES.find((item) => item.value === type) || PLACARD_TYPES[0]
}

/** 公告列表（匿名可访问） */
export function getPlacards(limit = 10) {
  return http.get<PageResult<PlacardItem>>('/placard/all', {
    page: 1,
    limit,
    order: 'create_time desc',
    field: 'id,title,content,type,url,target,create_time'
  })
}
