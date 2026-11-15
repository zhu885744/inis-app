/**
 * 通用格式化 / 解析工具
 *
 * 与 inis-app 的 utils/helper.ts 保持同一口径（时间、数字、图片字段），
 * 这样两端展示的文案完全一致。
 */

/** 取用户头衔文字 */
export function pickUserTitleText(user: any): string {
  if (user == null) return ''
  const title = user.title
  return title == null ? '' : `${title}`
}

/** 实况图分隔符：单项写成「图片URL::视频URL」 */
const LIVE_SEPARATOR = '::'

/** 取实况图项的图片地址：`图片::视频` → `图片` */
export function parseLiveImage(raw: any): string {
  const value = raw == null ? '' : `${raw}`.trim()
  if (value === '') return ''
  const index = value.indexOf(LIVE_SEPARATOR)
  return index < 0 ? value : value.substring(0, index).trim()
}

/** 逗号分隔字符串 → 原始项 */
function splitImageString(value: string): string[] {
  const raw = value.trim()
  if (raw === '') return []
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as any[]
      if (Array.isArray(parsed)) return parsed.filter((item) => Boolean(item)).map((item) => `${item}`)
    } catch (e) {
      // 落到逗号分割
    }
  }
  const parts = raw.split(',')
  const result: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const item = parts[i].trim()
    if (item !== '') result.push(item)
  }
  return result
}

/** 解析图片字段（covers / images 都是逗号分隔，兼容 JSON 数组字符串） */
export function parseImageList(value: any): string[] {
  if (value == null) return []
  let list: string[] = []
  if (Array.isArray(value)) {
    const arr = value as any[]
    for (let i = 0; i < arr.length; i++) list.push(`${arr[i]}`)
  } else {
    list = splitImageString(`${value}`)
  }
  const result: string[] = []
  for (let i = 0; i < list.length; i++) {
    const url = parseLiveImage(list[i])
    if (url !== '') result.push(url)
  }
  return result
}

/** 取第一张图（列表封面用） */
export function firstImage(value: any): string {
  const list = parseImageList(value)
  return list.length > 0 ? list[0] : ''
}

/** 去掉 HTML 标签 */
export function stripHtml(text: any): string {
  if (text == null) return ''
  return `${text}`.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

/** 截断文本 */
export function truncate(text: any, length: number = 80): string {
  const value = text == null ? '' : `${text}`
  return value.length > length ? value.substring(0, length) + '…' : value
}

/** 统一时间戳：兼容秒 / 毫秒 / 日期字符串 */
export function toTimestamp(value: any): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') {
    const num = value as number
    return num < 1000000000000 ? num * 1000 : num
  }
  const text = `${value}`.trim()
  if (/^\d+$/.test(text)) return toTimestamp(parseInt(text))
  const time = Date.parse(text.replace(/-/g, '/'))
  return isNaN(time) ? 0 : time
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** 相对时间：刚刚 / x分钟前 / x小时前 / 昨天 / MM-DD */
export function formatTime(value: any): string {
  const time = toTimestamp(value)
  if (time === 0) return ''

  const now = Date.now()
  const diff = now - time
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  if (diff < 48 * 60 * 60 * 1000) return '昨天'

  const date = new Date(time)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  const md = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
  return sameYear ? md : `${date.getFullYear()}-${md}`
}

/** 数字缩写：1286 → 1,286；12345 → 1.2万 */
export function formatCount(value: any): string {
  let num = 0
  if (value != null) num = Number(value)
  if (isNaN(num)) return '0'
  if (num >= 100000000) return trimZero((num / 100000000).toFixed(1)) + '亿'
  if (num >= 10000) return trimZero((num / 10000).toFixed(1)) + '万'
  return `${Math.round(num)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function trimZero(value: string): string {
  return value.endsWith('.0') ? value.substring(0, value.length - 2) : value
}

/** 绝对时间：10月1日 20:46 */
export function formatDateTime(value: any): string {
  const time = toTimestamp(value)
  if (time === 0) return ''
  const date = new Date(time)
  const md = `${date.getMonth() + 1}月${date.getDate()}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  return date.getFullYear() === new Date().getFullYear() ? md : `${date.getFullYear()}年${md}`
}
