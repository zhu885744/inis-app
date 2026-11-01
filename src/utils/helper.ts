import type { UserInfo } from '@/api/types'

/** 头衔样式（与后台 / Mellow 的装饰系统字段保持一致） */
export interface TitlePayload {
  text?: string
  image?: string
  scale?: number
  color?: string
  bg?: string
  border?: string
  glow?: string
  icon?: string
  animated?: boolean | number
  [key: string]: any
}

/**
 * 取出用户的头衔样式
 * 与 Mellow 的 pickUserTitlePayload 同口径：样式字段全空时返回 null，
 * 表示「无样式的纯文字头衔」，交给默认色板渲染。
 */
export function pickUserTitlePayload(user?: UserInfo | null): TitlePayload | null {
  const payload = user?.json?.title_decoration?.payload
  if (!payload || typeof payload !== 'object') return null
  const styleKeys = ['image', 'color', 'bg', 'border', 'glow', 'icon', 'animated']
  return styleKeys.some((key) => Boolean(payload[key])) ? (payload as TitlePayload) : null
}

/** 用户头衔文字（图片头衔时为空） */
export function pickUserTitleText(user?: UserInfo | null): string {
  return String(user?.title || '')
}

/** 实况图分隔符：单项写成「图片URL::视频URL」（与 Mellow/utils/livePhoto.js 同口径） */
const LIVE_SEPARATOR = '::'

/** 取实况图项的图片地址：`图片::视频` → `图片`，普通图片原样返回 */
export function parseLiveImage(raw: unknown): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''
  const index = value.indexOf(LIVE_SEPARATOR)
  return index < 0 ? value : value.slice(0, index).trim()
}

/** 取实况图项的视频地址：没有视频（普通图片）时返回空串 */
export function parseLiveVideo(raw: unknown): string {
  const value = String(raw ?? '').trim()
  const index = value.indexOf(LIVE_SEPARATOR)
  return index < 0 ? '' : value.slice(index + LIVE_SEPARATOR.length).trim()
}

/**
 * 解析逗号分隔的图片字段（covers / images 都是这种存法）
 * 兼容三种形式：数组、JSON 数组字符串、逗号分隔字符串
 *
 * 动态配图支持实况图，单项是「图片::视频」（见 Mellow/utils/livePhoto.js）。
 * 这里只返回图片地址：`<image>` / 封面 / 灯箱都只要静态图，
 * 整串带视频地址会让图片加载失败。需要视频的地方用 parseLiveVideo。
 */
export function parseImageList(value?: string | string[] | null): string[] {
  if (!value) return []
  const list = Array.isArray(value) ? value : splitImageString(String(value))
  return list.map(parseLiveImage).filter(Boolean)
}

/** 逗号分隔字符串 → 原始项（实况图项仍保留 ::视频） */
function splitImageString(value: string): string[] {
  const raw = value.trim()
  if (!raw) return []
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
    } catch {
      // 落到下面的逗号分割
    }
  }
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 取第一张图（列表封面用） */
export function firstImage(value?: string | string[] | null): string {
  return parseImageList(value)[0] || ''
}

/** 去掉 HTML 标签，用于摘要展示 */
export function stripHtml(text?: string | null): string {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** 截断文本 */
export function truncate(text?: string | null, length = 80): string {
  const value = String(text || '')
  return value.length > length ? `${value.slice(0, length)}…` : value
}

/** 统一时间戳：兼容秒 / 毫秒 / 日期字符串 */
export function toTimestamp(value?: number | string | null): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value < 1e12 ? value * 1000 : value
  const text = String(value).trim()
  if (/^\d+$/.test(text)) return toTimestamp(Number(text))
  // iOS 不支持 "2024-01-01 12:00:00"，换成斜杠
  const time = Date.parse(text.replace(/-/g, '/'))
  return Number.isNaN(time) ? 0 : time
}

/** 相对时间：刚刚 / x分钟前 / x小时前 / 昨天 / MM-DD / YYYY-MM-DD */
export function formatTime(value?: number | string | null): string {
  const time = toTimestamp(value)
  if (!time) return ''

  const now = Date.now()
  const diff = now - time
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  if (diff < 48 * 60 * 60 * 1000) return '昨天'

  const date = new Date(time)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const pad = (n: number) => String(n).padStart(2, '0')
  const md = `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return sameYear ? md : `${date.getFullYear()}-${md}`
}

/** 数字缩写：1286 -> 1,286；12345 -> 1.2万（与移动端阅读类 App 的习惯一致） */
export function formatCount(value?: number | string | null): string {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0'
  if (num >= 100000000) return `${(num / 100000000).toFixed(1).replace(/\.0$/, '')}亿`
  if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}万`
  // 小程序 JS 核心对 toLocaleString 的 locale 支持不一致，手动插千分位
  return String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 绝对时间：10月1日 20:46（跨年时补年份），详情页用 */
export function formatDateTime(value?: number | string | null): string {
  const time = toTimestamp(value)
  if (!time) return ''

  const date = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  const md = `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
  return date.getFullYear() === new Date().getFullYear() ? md : `${date.getFullYear()}年${md}`
}

/**
 * 粗略字数：去掉 HTML 标签、Markdown 标记与空白后按字符数算
 * 中文按字、英文按字符，够用来做「约 N 分钟」的估算
 */
export function countWords(content?: string | null): number {
  const text = String(content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#~|=]/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, '')

  return text.length
}

/** 预计阅读时长（分钟，按 300 字/分钟，至少 1 分钟） */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(Number(words || 0) / 300))
}

/** 手机号 / 邮箱脱敏 */
export function maskSocial(social: string): string {
  const value = String(social || '')
  if (/^1[3-9]\d{9}$/.test(value)) return `${value.slice(0, 3)}****${value.slice(-4)}`
  const at = value.indexOf('@')
  if (at > 2) return `${value.slice(0, 2)}***${value.slice(at)}`
  return value
}
