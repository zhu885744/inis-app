<template>
  <view class="flex items-center">
    <view class="flex items-center gap-1" @click="toggleLike">
      <wd-icon name="thumb-up" :size="17" :color="liked ? '#c7482a' : '#6b7280'" />
      <text class="text-12px" :class="liked ? 'text-primary' : 'text-sub'">
        {{ count > 0 ? formatCount(count) : '点赞' }}
      </text>
    </view>

    <view class="ml-6 flex items-center gap-1" @click="emit('comment')">
      <wd-icon name="chat" :size="17" color="#6b7280" />
      <text class="text-12px text-sub">{{ commentCount > 0 ? formatCount(commentCount) : '评论' }}</text>
    </view>

    <view class="ml-6 flex items-center gap-1" @click="onShare">
      <wd-icon name="share" :size="17" color="#6b7280" />
      <text class="text-12px text-sub">分享</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getLikeCounts, isLiked, like, unlike } from '@/api/like'
import type { TargetType } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { formatCount } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 点赞 / 评论 / 分享 操作栏（文章、动态详情页共用）
 *
 * - 未登录：不做 is-liked（该接口要求登录），只批量取点赞数用于展示
 * - 已登录：一次请求同时拿到是否已赞 + 总数
 */
const props = withDefaults(
  defineProps<{
    targetType: TargetType
    targetId: number
    commentCount?: number
    /** 分享标题 */
    shareTitle?: string
  }>(),
  {
    commentCount: 0,
    shareTitle: 'INIS'
  }
)

const emit = defineEmits<{
  (e: 'comment'): void
}>()

const userStore = useUserStore()

const liked = ref(false)
const count = ref(0)
const busy = ref(false)

async function loadState(): Promise<void> {
  if (!props.targetId) return

  try {
    if (userStore.isLogin) {
      const state = await isLiked(props.targetType, props.targetId)
      liked.value = Boolean(state?.is_liked)
      count.value = Number(state?.count || 0)
      return
    }

    const result = await getLikeCounts(props.targetType, [props.targetId])
    count.value = Number(result?.counts?.[String(props.targetId)] || 0)
  } catch {
    // 拿不到状态不影响阅读
  }
}

async function toggleLike(): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (busy.value || !props.targetId) return

  busy.value = true
  const wasLiked = liked.value

  // 乐观更新
  liked.value = !wasLiked
  count.value = Math.max(0, count.value + (wasLiked ? -1 : 1))

  try {
    if (wasLiked) await unlike(props.targetType, props.targetId)
    else await like(props.targetType, props.targetId)
  } catch {
    liked.value = wasLiked
    count.value = Math.max(0, count.value + (wasLiked ? 1 : -1))
  } finally {
    busy.value = false
  }
}

function onShare(): void {
  // #ifdef MP-WEIXIN
  toast('请用右上角菜单转发')
  // #endif
  // #ifndef MP-WEIXIN
  toast('分享功能开发中')
  // #endif
}

onMounted(loadState)

defineExpose({ refresh: loadState })
</script>
