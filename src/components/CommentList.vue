<template>
  <view class="comment-list">
    <!-- 标题 + 总数 -->
    <view class="mb-2 flex items-center gap-2">
      <view class="h-4 w-1 rounded-full bg-primary" />
      <text class="text-15px text-main font-semibold">评论</text>
      <text v-if="displayTotal > 0" class="text-11px text-weak">{{ displayTotal }} 条</text>
    </view>

    <!-- 发表主评论 -->
    <template v-if="allowComment">
      <CommentEditor
        v-if="userStore.isLogin"
        class="rounded-3 p-3"
        :bind-id="bindId"
        :bind-type="bindType"
        :pid="0"
        placeholder="说点什么…"
        @success="onRootSuccess"
      />
      <view v-else class="rounded-3 bg-white p-4">
        <text class="text-13px text-sub">登录后可参与评论</text>
        <view class="mt-3 flex items-center gap-2">
          <wd-button type="primary" size="small" @click="toLogin">登录</wd-button>
          <wd-button size="small" plain @click="toRegister">注册</wd-button>
        </view>
      </view>
    </template>
    <view v-else class="rounded-3 bg-white p-4">
      <text class="text-13px text-sub">该内容的评论功能已关闭</text>
    </view>

    <!-- 待审核占位：审核开启时刚提交的评论不会出现在列表里 -->
    <view v-if="pendingList.length" class="mt-2 rounded-3 bg-white px-3 py-2">
      <view v-for="item in pendingList" :key="item.key" class="flex items-center py-1">
        <view class="flex-center mr-2 rounded-2 bg-gray-100 px-2 py-1">
          <wd-icon name="warning" :size="11" color="#e6a23c" />
          <text class="ml-1 text-10px text-weak">待审核</text>
        </view>
        <text class="min-w-0 flex-1 text-12px text-sub ellipsis">{{ item.content || '（图片评论）' }}</text>
        <view class="ml-2 px-1" @click="removePending(item.key)">
          <wd-icon name="close" :size="12" color="#c0c4cc" />
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view class="mt-2 rounded-3 bg-white px-3 py-1">
      <view v-if="loading && !list.length" class="py-10 text-center">
        <text class="text-12px text-weak">加载中…</text>
      </view>

      <view v-else-if="!tree.length" class="py-10 text-center">
        <text class="text-12px text-weak">还没有评论，来抢沙发～</text>
      </view>

      <CommentItem
        v-for="item in tree"
        :key="item.id"
        :comment="item"
        :bind-type="bindType"
        :allow-comment="allowComment"
        :current-uid="myUid"
        :like-state="likeState"
        @like="onLike"
        @reply="onReply"
        @remove="onRemove"
      />

      <!-- 加载更多 -->
      <view v-if="!finished && list.length" class="py-3 text-center" @click="loadMore">
        <text class="text-12px text-primary">{{ loading ? '加载中…' : '加载更多评论' }}</text>
      </view>
      <view v-else-if="finished && list.length" class="py-3 text-center">
        <text class="text-11px text-weak">没有更多评论了</text>
      </view>
    </view>

    <!-- 底部弹层：回复某条评论 / 由页面底部操作栏唤起的「发表评论」 -->
    <view v-if="replyTarget || rootSheet" class="reply-mask" @click="closeSheets" />

    <view v-if="replyTarget" class="reply-sheet">
      <CommentEditor
        :bind-id="bindId"
        :bind-type="bindType"
        :pid="Number(replyTarget.id)"
        :placeholder="`回复 @${commentAuthor(replyTarget).nickname}`"
        submit-text="回复"
        sheet
        compact
        @success="onReplySuccess"
        @cancel="replyTarget = null"
      />
    </view>

    <view v-if="rootSheet" class="reply-sheet">
      <CommentEditor
        :bind-id="bindId"
        :bind-type="bindType"
        :pid="0"
        placeholder="说点什么…"
        sheet
        compact
        @success="onRootSuccess"
        @cancel="rootSheet = false"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CommentItem from './CommentItem.vue'
import CommentEditor from './CommentEditor.vue'
import { createComment, getComments, removeComment } from '@/api/comment'
import { getLikeCounts, getMyLikedIds, like, unlike } from '@/api/like'
import type { CommentItem as CommentItemType, TargetType } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { buildCommentTree, collectCommentIds, commentAuthor, countComments } from '@/utils/comment'
import { toast } from '@/utils/toast'
import { toLogin, toRegister } from '@/utils/nav'

/**
 * 评论区（文章 / 动态详情页共用）
 *
 * 后端契约（app/api/controller/comment.go 的 flat）：
 * - 只分页根评论（`pid=0`），`count` / `page` 也只算根评论
 * - 每条根评论带 `replies`：其下**所有层级**后代的扁平列表 → 用 buildCommentTree 重建层级
 *
 * 点赞态：评论数可能很多，逐条调 user-likes/is-liked 不现实，
 * 所以一次性用 counts 批量取数量、用「我的点赞记录」初始化已赞集合，
 * 点击时本地乐观更新，失败回滚。
 */
const props = withDefaults(
  defineProps<{
    bindId: number
    bindType?: TargetType
    allowComment?: boolean
    pageSize?: number
  }>(),
  {
    bindType: 'article',
    allowComment: true,
    pageSize: 10
  }
)

const emit = defineEmits<{
  (e: 'loaded', total: number): void
}>()

const userStore = useUserStore()

const list = ref<CommentItemType[]>([])
const page = ref(0)
const rootCount = ref(0)
const loading = ref(false)
const finished = ref(false)
const counts = ref<Record<number, number>>({})
const likedIds = ref<Set<number>>(new Set())
const replyTarget = ref<CommentItemType | null>(null)
/** 底部弹层版的主评论输入框（由详情页底部「发表评论」唤起） */
const rootSheet = ref(false)
const likedSynced = ref(false)

/** 本地「待审核」占位（只在前端存在，不写库） */
const pendingList = ref<{ key: number; content: string }[]>([])

const myUid = computed(() => Number(userStore.user?.id || 0))
const tree = computed(() => buildCommentTree(list.value))

/** 列表接口的 count 只含根评论，展示时取较大值兜底（与 Mellow 同口径） */
const displayTotal = computed(() => Math.max(rootCount.value, countComments(tree.value)))

function likeState(id: number) {
  return { liked: likedIds.value.has(id), count: counts.value[id] || 0 }
}

/** 批量同步点赞数：一次最多查 100 个 id，避免超长 query */
async function syncLikeCounts(items: CommentItemType[]): Promise<void> {
  const ids = items.map((item) => Number(item.id)).filter((id) => id > 0)
  if (!ids.length) return

  try {
    const result = await getLikeCounts('comment', ids.slice(0, 100))
    const next = { ...counts.value }
    Object.entries(result?.counts || {}).forEach(([key, value]) => {
      next[Number(key)] = Number(value || 0)
    })
    counts.value = next
  } catch {
    // 数量拉取失败不影响评论展示
  }
}

/** 已赞集合只需初始化一次（登录后才可用） */
async function syncLikedIds(): Promise<void> {
  if (likedSynced.value || !userStore.isLogin) return
  try {
    likedIds.value = await getMyLikedIds('comment')
  } catch {
    // 忽略：拿不到就当作都未点赞
  } finally {
    likedSynced.value = true
  }
}

async function load(reset = false): Promise<void> {
  if (loading.value) return
  if (!reset && finished.value) return

  loading.value = true
  const target = reset ? 1 : page.value + 1

  try {
    const result = await getComments(props.bindId, props.bindType, { page: target, limit: props.pageSize })
    const rows = Array.isArray(result?.data) ? result.data : []

    list.value = reset ? rows : list.value.concat(rows)
    rootCount.value = Number(result?.count || 0)
    page.value = target

    const totalPages = Number(result?.page || 0)
    finished.value = rows.length < props.pageSize || (totalPages > 0 && target >= totalPages)

    await Promise.all([syncLikeCounts(list.value), syncLikedIds()])
    emit('loaded', displayTotal.value)
  } catch {
    if (reset) {
      list.value = []
      rootCount.value = 0
    }
    // 失败不写 finished，方便下拉 / 点击重试
  } finally {
    loading.value = false
  }
}

const loadMore = () => load(false)

function onRootSuccess(result: { id: number; audit: number; pending: boolean }): void {
  rootSheet.value = false
  if (result?.pending) {
    pendingList.value.unshift({ key: Date.now(), content: '评论已提交，等待审核' })
    toast('评论已提交，审核通过后展示')
    return
  }
  toast('评论成功', 'success')
  load(true)
}

function onReplySuccess(result: { id: number; audit: number; pending: boolean }): void {
  replyTarget.value = null
  if (result?.pending) {
    pendingList.value.unshift({ key: Date.now(), content: '回复已提交，等待审核' })
    toast('回复已提交，审核通过后展示')
    return
  }
  toast('回复成功', 'success')
  load(true)
}

function onReply(comment: CommentItemType): void {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  replyTarget.value = comment
}

async function onLike(comment: CommentItemType): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }

  const id = Number(comment.id)
  const wasLiked = likedIds.value.has(id)

  // 乐观更新
  const nextLiked = new Set(likedIds.value)
  if (wasLiked) nextLiked.delete(id)
  else nextLiked.add(id)
  likedIds.value = nextLiked
  counts.value = { ...counts.value, [id]: Math.max(0, (counts.value[id] || 0) + (wasLiked ? -1 : 1)) }

  try {
    if (wasLiked) await unlike('comment', id)
    else await like('comment', id)
  } catch {
    // 回滚（请求层已提示，如「已经点赞过了」）
    const rollback = new Set(likedIds.value)
    if (wasLiked) rollback.add(id)
    else rollback.delete(id)
    likedIds.value = rollback
    counts.value = { ...counts.value, [id]: Math.max(0, (counts.value[id] || 0) + (wasLiked ? 1 : -1)) }
  }
}

function onRemove(comment: CommentItemType): void {
  const ids = collectCommentIds(comment)
  const extra = ids.length - 1

  uni.showModal({
    title: '删除评论',
    content: extra > 0 ? `该评论下有 ${extra} 条回复，会一并删除，确定吗？` : '确定要删除这条评论吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await removeComment(ids)
        toast('已删除', 'success')
        load(true)
      } catch {
        // 请求层已提示
      }
    }
  })
}

function removePending(key: number): void {
  pendingList.value = pendingList.value.filter((item) => item.key !== key)
}

function closeSheets(): void {
  replyTarget.value = null
  rootSheet.value = false
}

/** 供详情页底部「发表评论」调用：打开主评论输入弹层 */
function openEditor(): void {
  if (!props.allowComment) {
    toast('该内容已关闭评论')
    return
  }
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  replyTarget.value = null
  rootSheet.value = true
}

// 切换内容（同一个页面组件被复用）时重置
watch(
  () => [props.bindId, props.bindType],
  () => {
    list.value = []
    page.value = 0
    finished.value = false
    counts.value = {}
    likedIds.value = new Set()
    likedSynced.value = false
    load(true)
  },
  { immediate: true }
)

defineExpose({ refresh: () => load(true), openEditor })
</script>

<style lang="scss" scoped>
.reply-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.35);
}

.reply-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 101;
  background: #ffffff;
}
</style>
