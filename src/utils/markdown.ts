import { isRichTextEditor, sanitizeHtml } from './html'

/**
 * 轻量 Markdown → HTML
 *
 * 为什么手写而不用 marked：小程序端拿不到 DOM，markdown 库要么依赖 DOM，
 * 要么需要额外装包（本仓库目前零运行时依赖）。这里只覆盖站点作者常用的语法，
 * 输出**全部内联样式**，因为 `<rich-text>` 在小程序里不认外部 class。
 *
 * 支持：标题、段落、粗体、斜体、删除线、行内代码、代码块、链接、图片、
 *       有序 / 无序列表、引用、分割线。
 * 不支持：表格、脚注、HTML 混排、嵌套列表（会拍平成同级，不影响阅读）。
 */

/** 内联样式表：rich-text 在小程序里只用得上内联样式 */
const S = {
  h1: 'font-size:38rpx;font-weight:600;margin:28rpx 0 16rpx;line-height:1.4;',
  h2: 'font-size:34rpx;font-weight:600;margin:26rpx 0 14rpx;line-height:1.4;',
  h3: 'font-size:31rpx;font-weight:600;margin:24rpx 0 12rpx;line-height:1.4;',
  h4: 'font-size:29rpx;font-weight:600;margin:22rpx 0 12rpx;line-height:1.4;',
  p: 'font-size:29rpx;line-height:1.8;margin:0 0 18rpx;color:#1f2937;',
  a: 'color:#c7482a;text-decoration:none;',
  img: 'max-width:100%;height:auto;border-radius:8rpx;margin:10rpx 0;',
  code: 'font-family:monospace;font-size:26rpx;background:#f3f4f6;color:#c7482a;padding:2rpx 8rpx;border-radius:6rpx;',
  pre: 'font-family:monospace;font-size:26rpx;background:#f6f7f9;color:#374151;padding:20rpx;border-radius:10rpx;margin:0 0 18rpx;white-space:pre-wrap;word-break:break-all;',
  blockquote: 'border-left:6rpx solid #e5e7eb;padding:4rpx 0 4rpx 20rpx;margin:0 0 18rpx;color:#6b7280;font-size:28rpx;line-height:1.8;',
  ul: 'margin:0 0 18rpx;padding-left:36rpx;',
  ol: 'margin:0 0 18rpx;padding-left:36rpx;',
  li: 'font-size:29rpx;line-height:1.8;color:#1f2937;margin-bottom:8rpx;',
  hr: 'border:none;border-top:2rpx solid #eef0f3;margin:28rpx 0;',
  strong: 'font-weight:600;',
  em: 'font-style:italic;',
  del: 'text-decoration:line-through;color:#9ca3af;'
}

/** 标题层级 → 字号（h4 以下统一按 h4） */
const HEADING_STYLES: Record<number, string> = { 1: S.h1, 2: S.h2, 3: S.h3, 4: S.h4 }

/** HTML 转义（先转义再套标签，避免正文里的尖括号被 rich-text 当标签解析） */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 行内语法：行内代码 → 图片 → 链接 → 粗体 → 斜体 → 删除线 */
function inline(raw: string): string {
  let text = escapeHtml(raw)

  text = text.replace(/`([^`]+)`/g, (_m, code: string) => `<code style="${S.code}">${code}</code>`)
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, src: string) => `<img style="${S.img}" src="${src}" alt="${alt}" />`)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => `<a style="${S.a}" href="${href}">${label}</a>`)
  text = text.replace(/\*\*([^*]+)\*\*/g, (_m, value: string) => `<strong style="${S.strong}">${value}</strong>`)
  text = text.replace(/__([^_]+)__/g, (_m, value: string) => `<strong style="${S.strong}">${value}</strong>`)
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, (_m, prefix: string, value: string) => `${prefix}<em style="${S.em}">${value}</em>`)
  text = text.replace(/~~([^~]+)~~/g, (_m, value: string) => `<del style="${S.del}">${value}</del>`)

  return text
}

/** Markdown 正文 → rich-text 可用的 HTML */
export function markdownToHtml(source?: string | null): string {
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []

  let index = 0
  let listTag: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (!listTag) return
    out.push(`</${listTag}>`)
    listTag = null
  }

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    // 空行：结束列表
    if (!trimmed) {
      closeList()
      index += 1
      continue
    }

    // 代码块 ```（语言标记忽略）
    if (/^```/.test(trimmed)) {
      closeList()
      index += 1
      const buffer: string[] = []
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        buffer.push(lines[index])
        index += 1
      }
      index += 1 // 跳过结尾的 ```
      out.push(`<pre style="${S.pre}"><code>${escapeHtml(buffer.join('\n'))}</code></pre>`)
      continue
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList()
      out.push(`<hr style="${S.hr}" />`)
      index += 1
      continue
    }

    // 标题（h4 以下统一按 h4 渲染，字号再往上分意义不大）
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading) {
      closeList()
      const level = Math.min(heading[1].length, 4)
      out.push(`<h${level} style="${HEADING_STYLES[level]}">${inline(heading[2])}</h${level}>`)
      index += 1
      continue
    }

    // 引用：连续多行合并成一段
    if (/^>\s?/.test(trimmed)) {
      closeList()
      const buffer: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        buffer.push(lines[index].trim().replace(/^>\s?/, ''))
        index += 1
      }
      out.push(`<blockquote style="${S.blockquote}">${inline(buffer.join(' '))}</blockquote>`)
      continue
    }

    // 无序列表
    if (/^[-*+]\s+/.test(trimmed)) {
      if (listTag !== 'ul') {
        closeList()
        out.push(`<ul style="${S.ul}">`)
        listTag = 'ul'
      }
      out.push(`<li style="${S.li}">${inline(trimmed.replace(/^[-*+]\s+/, ''))}</li>`)
      index += 1
      continue
    }

    // 有序列表
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listTag !== 'ol') {
        closeList()
        out.push(`<ol style="${S.ol}">`)
        listTag = 'ol'
      }
      out.push(`<li style="${S.li}">${inline(trimmed.replace(/^\d+\.\s+/, ''))}</li>`)
      index += 1
      continue
    }

    // 普通段落：连续非空行合并
    closeList()
    const buffer: string[] = [trimmed]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|```)/.test(lines[index].trim())
    ) {
      buffer.push(lines[index].trim())
      index += 1
    }
    out.push(`<p style="${S.p}">${inline(buffer.join('<br/>'))}</p>`)
  }

  closeList()
  return out.join('')
}

/**
 * 按 editor 类型渲染正文
 * - 富文本编辑器：content 本身就是 HTML，清洗后用
 * - markdown（含未标注）：走上面的轻量转换
 */
export function renderContent(content?: string | null, editor?: string | null): string {
  const raw = String(content || '')
  if (!raw.trim()) return ''
  return isRichTextEditor(editor) ? sanitizeHtml(raw) : markdownToHtml(raw)
}
