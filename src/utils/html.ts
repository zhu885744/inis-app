/**
 * 富文本判定与轻量清洗
 *
 * 口径与 Mellow/src/utils/html.js 保持一致（`editor` 字段来自 app/model/article.go）：
 * 站点自带的写作入口统一存 `markdown`，但接口也允许第三方工具写入富文本 HTML。
 */

/** 富文本编辑器标识：值为这些时 content 直接当 HTML 渲染 */
const RICH_EDITORS = ['wangeditor', 'quill', 'tinymce', 'rich', 'richtext', 'rich-text', 'html']

export function isRichTextEditor(editor?: string | null): boolean {
  const value = String(editor || '')
    .trim()
    .toLowerCase()
  if (!value || value === 'vditor' || value === 'markdown' || value === 'md') return false
  return RICH_EDITORS.includes(value)
}

/**
 * 轻量清洗：只做「危险标签 / 事件属性 / javascript: 协议」的剥离
 *
 * 后端入库时已经过 DetectXSS + SanitizeHTML（app/api/controller/article.go），
 * 这里再挡一层是因为 `rich-text` 在部分端会执行内联事件属性。
 */
export function sanitizeHtml(html?: string | null): string {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')?\s*(javascript|vbscript|data:text\/html)[^"'>\s]*/gi, '$1="#"')
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 搜索关键词高亮 → rich-text 可用的 HTML
 *
 * 后端把命中的关键词包成 `<mark>`（见 app/api/controller/search.go），
 * 但小程序的 rich-text **不支持 mark 标签**（会被丢弃），所以这里：
 * 1. 剥掉 mark 以外的所有标签；
 * 2. 转义；
 * 3. 把 mark 换成带内联样式的 span（span 在 rich-text 白名单里，各端都能上色）。
 */
export function highlightHtml(value?: string | null): string {
  const raw = String(value ?? '').replace(/<(?!\/?mark\b)[^>]*>/gi, '')
  return escapeHtml(raw)
    .replace(/&lt;mark&gt;/gi, '<span style="color:#c7482a;font-weight:600">')
    .replace(/&lt;\/mark&gt;/gi, '</span>')
}

/** 去掉高亮标签的纯文本版本（用于头像旁等不适合 rich-text 的位置） */
export function highlightText(value?: string | null): string {
  return String(value ?? '').replace(/<\/?mark>/gi, '')
}
