import type { ArticleItem, MomentItem } from '@/api/types'
import { getArticles } from '@/api/article'
import { getMoments } from '@/api/moments'
import { firstImage, parseImageList, stripHtml, truncate } from '@/utils/helper'

/**
 * 笔记（Note）—— 小红书式双列流的数据单位
 *
 * 文章与动态在小红书式界面里是同一种东西：一张封面 + 一句标题 + 作者 + 点赞。
 * 这里把两种后端实体统一成 NoteItem，页面只认它，卡片组件也只认它。
 */
export interface NoteItem {
  /** 列表 key：跨文章 / 动态唯一 */
  key: string
  id: number
  type: 'article' | 'moment'
  /** 卡片标题：文章取 title，动态取正文首句 */
  title: string
  /** 封面图（无图时为空串，卡片退化为文字块） */
  cover: string
  /** 全部图片：多图角标与详情轮播用 */
  images: string[]
  authorName: string
  authorAvatar: string
  likes: number
  /** 封面高 / 宽，决定瀑布流错落效果 */
  ratio: number
  /** 置顶 */
  top?: number
  createTime?: number
  raw: ArticleItem | MomentItem
}

/** 封面比例池：小红书的笔记也是这几种比例混排，视觉才不呆板 */
const RATIOS = [1.25, 1, 1.25, 0.78, 1.25, 1.1]

/**
 * 正文 → 卡片标题
 *
 * 后端会把 `#话题#` 规范化成 `#[话题名](/topic/12)`（见 model/topics.go），
 * @ 提及也是 Markdown 链接。直接塞进卡片会露出 `](#/topic/12)` 这类噪音，
 * 所以这里把链接语法压成纯文本，再截断。
 */
function toPlainText(value?: string | null): string {
  return stripHtml(value)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickRatio(id: number, hasCover: boolean): number {
  if (!hasCover) return 1.05
  return RATIOS[Math.abs(Number(id) || 0) % RATIOS.length]
}

/** 文章 → 笔记 */
export function articleToNote(article: ArticleItem): NoteItem {
  const images = parseImageList(article.covers)
  const cover = images[0] || firstImage(article.covers)
  const title = toPlainText(article.title) || truncate(toPlainText(article.abstract), 30) || '无标题'

  return {
    key: `article-${article.id}`,
    id: Number(article.id),
    type: 'article',
    title,
    cover,
    images,
    authorName: article.result?.author?.nickname || '匿名',
    authorAvatar: article.result?.author?.avatar || '',
    likes: Number(article.result?.like?.length || 0),
    ratio: pickRatio(article.id, Boolean(cover)),
    top: Number(article.top || 0),
    createTime: Number(article.publish_time || article.create_time || 0),
    raw: article
  }
}

/** 动态 → 笔记 */
export function momentToNote(moment: MomentItem): NoteItem {
  const images = parseImageList(moment.images)
  const cover = images[0] || ''
  const title = truncate(toPlainText(moment.content), 60) || (images.length ? '分享图片' : '无正文')

  return {
    key: `moment-${moment.id}`,
    id: Number(moment.id),
    type: 'moment',
    title,
    cover,
    images,
    authorName: moment.result?.author?.nickname || '匿名',
    authorAvatar: moment.result?.author?.avatar || '',
    likes: Number(moment.result?.like?.length || 0),
    ratio: pickRatio(moment.id, Boolean(cover)),
    top: Number(moment.top || 0),
    createTime: Number(moment.create_time || 0),
    raw: moment
  }
}

/**
 * 双列分列：按「封面比例 + 卡片文字区固定高度」估算每列累计高度，逐张投入较矮的一列。
 *
 * 不测量真实 DOM 是有意为之：小程序端测量要等渲染完成、且滚动加载时会反复重排，
 * 估算出来的错落感已经足够，性能够稳。
 */
export function splitColumns(list: NoteItem[], bodyRatio = 0.36): { left: NoteItem[]; right: NoteItem[] } {
  const left: NoteItem[] = []
  const right: NoteItem[] = []
  let leftHeight = 0
  let rightHeight = 0

  for (const note of list) {
    const height = note.ratio + bodyRatio
    if (leftHeight <= rightHeight) {
      left.push(note)
      leftHeight += height
    } else {
      right.push(note)
      rightHeight += height
    }
  }

  return { left, right }
}

/* ---------------- 按 id 回查笔记 ---------------- */

/** 收藏 / 点赞记录里只有目标 id，需要再查一次内容 */
export interface NoteRef {
  type: 'article' | 'moment'
  id: number
}

/** 单批 $in 查询的 id 上限：站点分页配置一般把 limit 钳在 20，超过会被截断 */
const IN_BATCH = 20

function chunk<T>(list: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < list.length; i += size) result.push(list.slice(i, i + size))
  return result
}

/**
 * 把「目标类型 + id」列表还原成笔记列表（收藏 / 点赞 tab 用）
 *
 * 后端 where 支持 `{"id": {"$in": [...]}}`（见 app/facade/mysql.go 的 handleWhereField），
 * 所以分页拉取不会退化成 N 次 one 请求。返回顺序按传入的 refs 保持（收藏 / 点赞是时间倒序）。
 */
export async function fetchNotesByIds(refs: NoteRef[]): Promise<NoteItem[]> {
  const articleIds = refs.filter((ref) => ref.type === 'article').map((ref) => ref.id)
  const momentIds = refs.filter((ref) => ref.type === 'moment').map((ref) => ref.id)

  const [articleList, momentList] = await Promise.all([
    (async () => {
      const pool: ArticleItem[] = []
      for (const batch of chunk(articleIds, IN_BATCH)) {
        try {
          const result = await getArticles({
            page: 1,
            limit: batch.length,
            where: { id: { $in: batch } },
            order: 'create_time desc'
          })
          if (Array.isArray(result?.data)) pool.push(...(result.data as ArticleItem[]))
        } catch {
          // 单批失败不影响其余批次
        }
      }
      return pool
    })(),
    (async () => {
      const pool: MomentItem[] = []
      for (const batch of chunk(momentIds, IN_BATCH)) {
        try {
          const result = await getMoments({
            page: 1,
            limit: batch.length,
            where: { id: { $in: batch } },
            order: 'create_time desc'
          })
          if (Array.isArray(result?.data)) pool.push(...(result.data as MomentItem[]))
        } catch {
          // 单批失败不影响其余批次
        }
      }
      return pool
    })()
  ])

  const articleMap = new Map(articleList.map((item) => [Number(item.id), item]))
  const momentMap = new Map(momentList.map((item) => [Number(item.id), item]))

  const notes: NoteItem[] = []
  for (const ref of refs) {
    if (ref.type === 'article') {
      const article = articleMap.get(ref.id)
      if (article) notes.push(articleToNote(article))
    } else {
      const moment = momentMap.get(ref.id)
      if (moment) notes.push(momentToNote(moment))
    }
  }
  return notes
}

/** 把后端返回的 target_type 归一成笔记类型；page / comment 之类不支持的返回 null */
export function normalizeTargetType(targetType?: string): 'article' | 'moment' | null {
  const value = String(targetType || '').toLowerCase()
  if (value === 'article') return 'article'
  if (value === 'moment' || value === 'moments') return 'moment'
  return null
}
