import { firstImage, parseImageList, stripHtml, truncate } from '@/utils/helper'

/**
 * 笔记（Note）—— 小红书式双列流的数据单位
 *
 * 文章与动态在列表里是同一种东西：一张封面 + 一句标题 + 作者 + 点赞。
 * 这里把两种后端实体统一成 NoteItem，页面只认它。
 */
export interface NoteItem {
  key: string
  id: number
  /** article | moment */
  type: string
  title: string
  cover: string
  images: string[]
  authorName: string
  authorAvatar: string
  likes: number
  createTime: number
}

/** 后端会把 `#话题#` 规范化成 Markdown 链接，列表里要压成纯文本 */
function toPlainText(value: any): string {
  return stripHtml(value)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 文章 → 笔记 */
export function articleToNote(article: any): NoteItem {
  const images = parseImageList(article.covers)
  const cover = images.length > 0 ? images[0] : firstImage(article.covers)
  const abstract = toPlainText(article.abstract)
  let title = toPlainText(article.title)
  if (title === '') title = truncate(abstract, 30)
  if (title === '') title = '无标题'

  return {
    key: `article-${article.id}`,
    id: Number(article.id ?? 0),
    type: 'article',
    title: title,
    cover: cover,
    images: images,
    authorName: authorNameOf(article),
    authorAvatar: authorAvatarOf(article),
    likes: likeCountOf(article),
    createTime: Number(article.publish_time ?? article.create_time ?? 0)
  }
}

/** 动态 → 笔记 */
export function momentToNote(moment: any): NoteItem {
  const images = parseImageList(moment.images)
  const text = toPlainText(moment.content)
  let title = truncate(text, 60)
  if (title === '') title = images.length > 0 ? '分享图片' : '无正文'

  return {
    key: `moment-${moment.id}`,
    id: Number(moment.id ?? 0),
    type: 'moment',
    title: title,
    cover: images.length > 0 ? images[0] : '',
    images: images,
    authorName: authorNameOf(moment),
    authorAvatar: authorAvatarOf(moment),
    likes: likeCountOf(moment),
    createTime: Number(moment.create_time ?? 0)
  }
}

function authorNameOf(item: any): string {
  if (item == null || item.result == null || item.result.author == null) return '匿名'
  const name = item.result.author.nickname
  return name == null ? '匿名' : `${name}`
}

function authorAvatarOf(item: any): string {
  if (item == null || item.result == null || item.result.author == null) return ''
  const avatar = item.result.author.avatar
  return avatar == null ? '' : `${avatar}`
}

function likeCountOf(item: any): number {
  if (item == null || item.result == null) return 0
  const like = item.result.like
  if (like == null) return 0
  // 列表接口里 like 是数组（只给条数用），详情接口里可能是 { count }
  if (Array.isArray(like)) return (like as any[]).length
  if (typeof like === 'number') return like
  if (like.count != null) return Number(like.count)
  return 0
}

/**
 * 双列分列：按累计高度估算，逐张投入较矮的一列。
 * 不测量真实 DOM（小程序 / uvue 测量要等渲染完成），估算已经够错落。
 */
export function splitColumns(list: NoteItem[]): { left: NoteItem[]; right: NoteItem[] } {
  const left: NoteItem[] = []
  const right: NoteItem[] = []
  let leftHeight = 0
  let rightHeight = 0

  for (let i = 0; i < list.length; i++) {
    const note = list[i]
    const height = (note.cover === '' ? 1.05 : 1.2) + 0.36
    if (leftHeight <= rightHeight) {
      left.push(note)
      leftHeight += height
    } else {
      right.push(note)
      rightHeight += height
    }
  }

  return { left: left, right: right }
}
