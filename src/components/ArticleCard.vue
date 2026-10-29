<template>
  <view class="feed-card" @click="emit('click', article.id)">
    <!-- 作者行：头像 + 昵称 + 头衔 + 时间 -->
    <view class="flex items-center gap-2">
      <image class="h-9 w-9 flex-none rounded-full bg-gray-100" :src="authorAvatar" mode="aspectFill" />
      <view class="min-w-0 flex-1">
        <view class="flex items-center">
          <text class="max-w-30 text-14px text-main font-medium ellipsis">{{ authorName }}</text>
          <TitleBadge :payload="titlePayload" :text="titleText" />
        </view>
        <text class="block text-11px text-weak">{{ timeText }}</text>
      </view>
      <wd-icon name="chevron-down" :size="16" color="#c0c4cc" />
    </view>

    <!-- 标题 -->
    <text class="mt-2 block text-16px text-main font-semibold">{{ article.title || '无标题' }}</text>

    <!-- 摘要 + 查看更多 -->
    <view v-if="abstract" class="mt-2">
      <text class="text-14px text-sub">{{ abstract }}</text>
      <text class="text-14px text-primary"> 查看更多</text>
    </view>

    <!-- 大图 -->
    <image v-if="cover" class="mt-3 h-44 w-full rounded-3 bg-gray-100" :src="cover" mode="aspectFill" />

    <!-- 互动栏 -->
    <view class="mt-3 flex items-center">
      <view class="flex items-center gap-1">
        <wd-icon name="chat" :size="16" color="#9ca3af" />
        <text class="text-12px text-weak">{{ formatCount(commentCount) }}</text>
      </view>
      <view class="ml-5 flex items-center gap-1">
        <wd-icon name="thumb-up" :size="16" color="#9ca3af" />
        <text class="text-12px text-weak">{{ formatCount(likeCount) }}</text>
      </view>
      <view class="ml-5 flex items-center gap-1">
        <wd-icon name="share" :size="16" color="#9ca3af" />
        <text class="text-12px text-weak">{{ formatCount(article.views) }}</text>
      </view>

      <!-- 关注按钮（未登录会先跳登录；自己的内容不显示） -->
      <view
        v-if="canFollow"
        class="ml-auto rounded-full px-3 py-1"
        :class="following ? 'border border-line' : 'border border-primary'"
        @click.stop="onFollow"
      >
        <text class="text-12px" :class="following ? 'text-sub' : 'text-primary'">{{ followLabel }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import TitleBadge from './TitleBadge.vue'
import { follow, resolveFollowing, setCachedFollowing, unfollow } from '@/api/follow'
import type { ArticleItem } from '@/api/types'
import { firstImage, formatCount, formatTime, pickUserTitlePayload, pickUserTitleText, stripHtml } from '@/utils/helper'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

const props = defineProps<{
  article: ArticleItem
}>()

const emit = defineEmits<{
  (e: 'click', id: number): void
}>()

const userStore = useUserStore()

/** 封面：covers 是逗号分隔的多图字段，列表取第一张 */
const cover = computed(() => firstImage(props.article.covers))

const abstract = computed(() => stripHtml(props.article.abstract || ''))

/** 作者信息由后端内联在 result.author（见 app/api/controller/article.go 的 AfterFind） */
const author = computed(() => props.article.result?.author)

const authorName = computed(() => author.value?.nickname || '匿名用户')
const authorAvatar = computed(() => author.value?.avatar || '')

const titlePayload = computed(() => pickUserTitlePayload(author.value))
const titleText = computed(() => pickUserTitleText(author.value))

const timeText = computed(() => formatTime(props.article.publish_time || props.article.create_time))
const commentCount = computed(() => Number(props.article.result?.comment?.count || 0))
const likeCount = computed(() => Number(props.article.result?.like?.length || 0))

const following = ref(false)
const followBusy = ref(false)

const authorId = computed(() => Number(author.value?.id || 0))
/** 自己的内容不显示关注按钮 */
const canFollow = computed(() => authorId.value > 0 && authorId.value !== Number(userStore.user?.id || 0))
const followLabel = computed(() => (following.value ? '已关注' : '关注'))

/**
 * 关注 / 取关
 *
 * 关注态是**懒查**的：列表里每条都查一次 is-following 会瞬间打满小程序的并发上限（10），
 * 所以第一次点击时才问后端，之后由 api/follow.ts 的缓存兜底。
 */
async function onFollow(): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (followBusy.value || !canFollow.value) return

  followBusy.value = true
  try {
    const current = await resolveFollowing(authorId.value)
    if (current) {
      await unfollow(authorId.value)
      setCachedFollowing(authorId.value, false)
      following.value = false
      toast('已取消关注')
    } else {
      await follow(authorId.value)
      setCachedFollowing(authorId.value, true)
      following.value = true
      toast('已关注', 'success')
    }
  } catch {
    // 请求层已按业务码提示
  } finally {
    followBusy.value = false
  }
}
</script>
