<template>
  <view class="comment-item" :class="{ 'is-child': isChild }">
    <image class="h-8 w-8 flex-none rounded-full bg-gray-100" :src="author.avatar" mode="aspectFill" />

    <view class="min-w-0 flex-1">
      <!-- 作者行 -->
      <view class="flex items-center">
        <text class="max-w-30 text-13px text-main font-medium ellipsis">{{ author.nickname }}</text>
        <TitleBadge :payload="titlePayload" :text="titleText" />
        <text class="ml-auto text-11px text-weak">{{ timeText }}</text>
      </view>

      <!-- 正文：后端已做过 XSS 过滤，这里按纯文本展示 -->
      <text v-if="content" class="mt-1 block text-14px text-main">{{ content }}</text>

      <!-- 图片 -->
      <view v-if="images.length" class="mt-2 flex flex-wrap gap-2">
        <image
          v-for="(url, index) in images"
          :key="url"
          class="h-20 w-20 rounded-2 bg-gray-100"
          :src="url"
          mode="aspectFill"
          @click="previewImage(index)"
        />
      </view>

      <!-- 操作栏 -->
      <view class="mt-2 flex items-center gap-5">
        <view class="flex items-center gap-1" @click="emit('like', comment)">
          <wd-icon name="thumb-up" :size="15" :color="like.liked ? '#c7482a' : '#9ca3af'" />
          <text class="text-11px" :class="like.liked ? 'text-primary' : 'text-weak'">
            {{ like.count > 0 ? formatCount(like.count) : '赞' }}
          </text>
        </view>

        <view v-if="allowComment" class="flex items-center gap-1" @click="emit('reply', comment)">
          <wd-icon name="chat" :size="15" color="#9ca3af" />
          <text class="text-11px text-weak">回复</text>
        </view>

        <view v-if="canRemove" class="flex items-center gap-1" @click="emit('remove', comment)">
          <wd-icon name="delete1" :size="15" color="#9ca3af" />
          <text class="text-11px text-weak">删除</text>
        </view>
      </view>

      <!-- 子回复：层级已由 utils/comment.ts 的 buildCommentTree 重建 -->
      <view v-if="replies.length" class="mt-3 border-l border-line pl-3">
        <CommentItem
          v-for="child in replies"
          :key="child.id"
          :comment="child"
          :bind-type="bindType"
          :allow-comment="allowComment"
          :current-uid="currentUid"
          :like-state="likeState"
          :is-child="true"
          @like="(item) => emit('like', item)"
          @reply="(item) => emit('reply', item)"
          @remove="(item) => emit('remove', item)"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TitleBadge from './TitleBadge.vue'
import type { CommentItem, TargetType } from '@/api/types'
import { commentAuthor, commentImages } from '@/utils/comment'
import { formatCount, formatTime, pickUserTitlePayload, pickUserTitleText } from '@/utils/helper'

/**
 * 单条评论（递归渲染回复）
 *
 * 后端 comment/flat 只在**根评论**上给 `replies`，且是扁平数组；
 * 这里收到的 children 已经是 rebuild 过的嵌套结构（见 utils/comment.ts）。
 */
defineOptions({ name: 'CommentItem' })

const props = withDefaults(
  defineProps<{
    comment: CommentItem
    bindType?: TargetType
    allowComment?: boolean
    /** 当前登录用户 id：用于判断能否删除 */
    currentUid?: number
    /** 点赞态查询函数（由列表统一维护，避免每个组件各发一次请求） */
    likeState: (id: number) => { liked: boolean; count: number }
    isChild?: boolean
  }>(),
  {
    bindType: 'article',
    allowComment: true,
    currentUid: 0,
    isChild: false
  }
)

const emit = defineEmits<{
  (e: 'like', comment: CommentItem): void
  (e: 'reply', comment: CommentItem): void
  (e: 'remove', comment: CommentItem): void
}>()

const author = computed(() => commentAuthor(props.comment))
const titlePayload = computed(() => pickUserTitlePayload(author.value))
const titleText = computed(() => pickUserTitleText(author.value))

/** 评论正文按纯文本展示：老数据里可能带 HTML 片段，剥掉标签免得出乱码 */
const content = computed(() =>
  String(props.comment.content || '')
    .replace(/<[^>]*>/g, '')
    .trim()
)

const images = computed(() => commentImages(props.comment))
const timeText = computed(() => formatTime(props.comment.create_time))
const replies = computed(() => props.comment.replies || [])

const like = computed(() => props.likeState(Number(props.comment.id)))

/** 只能删自己的评论（管理员能力在后台，移动端不放开） */
const canRemove = computed(() => Number(props.currentUid || 0) > 0 && Number(props.comment.uid) === Number(props.currentUid))

function previewImage(index: number): void {
  uni.previewImage({ urls: images.value, current: index })
}
</script>

<style lang="scss" scoped>
.comment-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 0;
}

.comment-item.is-child {
  padding: 16rpx 0 0;
}
</style>
