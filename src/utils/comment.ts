import type { AuthorInfo, CommentItem } from '@/api/types'

/** 取评论作者（后端把作者内联在 result.author，见 app/model/comment.go 的 authorSync） */
export function commentAuthor(item?: CommentItem | null): AuthorInfo {
  const author = item?.result?.author
  return {
    id: Number(author?.id || item?.uid || 0),
    nickname: author?.nickname || '匿名用户',
    avatar: author?.avatar || '',
    description: author?.description,
    title: author?.title,
    json: author?.json
  }
}

/** 按时间升序（评论列表里回复应按时间正序展示） */
function byCreateTimeAsc(a: CommentItem, b: CommentItem): number {
  return Number(a.create_time || 0) - Number(b.create_time || 0)
}

/**
 * 把 `comment/flat` 返回的**扁平 replies** 重建成真实层级
 *
 * 为什么需要它：后端对每条根评论递归收集了**所有层级**的后代 id，
 * 一次性扁平地挂在 `root.replies` 里（见 app/api/controller/comment.go 的 replies()），
 * 且只有根评论有这个字段。直接按一层渲染会把三层以上的回复错挂到根评论下。
 *
 * 重建规则：
 * - 父级在同批数据里 → 挂到父级下
 * - 父级不在（已被删除 / 被审核过滤 / 是更上层）→ 退回挂到根评论下，避免整条回复丢失
 */
export function buildCommentTree(roots: CommentItem[]): CommentItem[] {
  return roots.map((root) => {
    // 整体拷贝：本函数可能被放在 computed 里，不能改到响应式源数据
    const node: CommentItem = { ...root, replies: [] }
    const flat = Array.isArray(root.replies) ? root.replies : []
    if (!flat.length) return node

    const nodes = new Map<number, CommentItem>()
    for (const item of flat) {
      nodes.set(Number(item.id), { ...item, replies: [] })
    }

    // pid -> 子节点列表
    const children = new Map<number, CommentItem[]>()
    const pushChild = (pid: number, node: CommentItem) => {
      const bucket = children.get(pid)
      if (bucket) bucket.push(node)
      else children.set(pid, [node])
    }

    const rootId = Number(root.id)
    for (const node of nodes.values()) {
      const parentId = Number(node.pid)
      const parent = parentId === rootId ? null : nodes.get(parentId)
      pushChild(parent ? Number(parent.id) : rootId, node)
    }

    // 递归挂载并按时间正序排序
    const attach = (node: CommentItem) => {
      const list = (children.get(Number(node.id)) || []).sort(byCreateTimeAsc)
      node.replies = list
      list.forEach(attach)
    }

    node.replies = (children.get(rootId) || []).sort(byCreateTimeAsc)
    node.replies.forEach(attach)

    return node
  })
}

/** 该评论及其所有后代的 id（删除评论时要连带提示影响条数） */
export function collectCommentIds(item: CommentItem): number[] {
  const ids = [Number(item.id)]
  for (const child of item.replies || []) {
    ids.push(...collectCommentIds(child))
  }
  return ids
}

/** 评论总数（含所有层级的回复）—— 列表接口的 count 只统计根评论，不能直接用作「共 N 条评论」 */
export function countComments(list: CommentItem[]): number {
  let total = 0
  const walk = (items: CommentItem[]) => {
    for (const item of items) {
      total += 1
      if (item.replies?.length) walk(item.replies)
    }
  }
  walk(list)
  return total
}

/** 取评论里的图片（images 是逗号分隔字符串） */
export function commentImages(item?: CommentItem | null): string[] {
  const raw = String(item?.images || '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
}
