<template>
  <view class="min-h-screen bg-page">
    <view class="nav-bar">
      <view class="flex-center h-8 w-8 rounded-full bg-gray-100" @click="back">
        <wd-icon name="arrow-left1" :size="17" color="#4b5563" />
      </view>
      <text class="ml-2 min-w-0 flex-1 text-15px text-main font-medium ellipsis">动态详情</text>
    </view>

    <view v-if="loading" class="py-20 text-center">
      <text class="text-12px text-weak">加载中…</text>
    </view>

    <view v-else-if="!moment" class="py-20 text-center">
      <text class="text-13px text-sub">动态不存在或已被删除</text>
    </view>

    <view v-else class="px-3 pt-2 pb-30">
      <!-- 作者 -->
      <view class="rounded-3 bg-white p-4">
        <view class="flex items-center gap-2">
          <image class="h-10 w-10 flex-none rounded-full bg-gray-100" :src="author.avatar" mode="aspectFill" @click="openAuthor" />
          <view class="min-w-0 flex-1" @click="openAuthor">
            <view class="flex items-center">
              <text class="max-w-30 text-15px text-main font-medium ellipsis">{{ author.nickname }}</text>
              <TitleBadge :payload="titlePayload" :text="titleText" />
            </view>
            <text class="block text-11px text-weak">{{ timeText }}</text>
          </view>

          <view
            v-if="canFollow"
            class="rounded-full px-3 py-1"
            :class="following ? 'border border-line' : 'border border-primary'"
            @click="toggleFollow"
          >
            <text class="text-12px" :class="following ? 'text-sub' : 'text-primary'">
              {{ following ? '已关注' : '关注' }}
            </text>
          </view>
        </view>

        <!-- 正文 -->
        <text v-if="content" class="mt-3 block text-15px text-main">{{ content }}</text>

        <!-- 图片 -->
        <view v-if="images.length" class="mt-3 flex flex-wrap gap-2">
          <image
            v-for="(url, index) in images"
            :key="url"
            class="rounded-3 bg-gray-100"
            :class="images.length === 1 ? 'h-52 w-full' : 'h-32 w-32'"
            :src="url"
            mode="aspectFill"
            @click="previewImage(index)"
          />
        </view>

        <view v-if="moment.location" class="mt-3 flex items-center gap-1">
          <wd-icon name="location" :size="14" color="#9ca3af" />
          <text class="text-11px text-weak">{{ moment.location }}</text>
        </view>

        <view class="mt-3 flex items-center">
          <text class="text-11px text-weak">{{ formatCount(moment.views) }} 浏览</text>
        </view>
      </view>

      <!-- 互动栏 -->
      <view class="mt-2 rounded-3 bg-white px-4 py-3">
        <LikeBar target-type="moments" :target-id="id" :comment-count="commentCount" @comment="toComments" />
      </view>

      <view id="comments" class="mt-2">
        <CommentList
          :bind-id="id"
          bind-type="moments"
          :allow-comment="allowComment"
          @loaded="(total) => (commentCount = total)"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import CommentList from '@/components/CommentList.vue'
import LikeBar from '@/components/LikeBar.vue'
import TitleBadge from '@/components/TitleBadge.vue'
import { getMoment } from '@/api/moments'
import { follow, isFollowing, unfollow } from '@/api/follow'
import type { MomentItem } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { formatCount, formatTime, parseImageList, pickUserTitlePayload, pickUserTitleText } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/** 动态详情（结构与文章详情一致，仅正文是纯文本 + 九宫格） */
const userStore = useUserStore()

const id = ref(0)
const moment = ref<MomentItem | null>(null)
const loading = ref(true)
const commentCount = ref(0)
const following = ref(false)
const followBusy = ref(false)

const author = computed(() => moment.value?.result?.author || { id: 0, nickname: '匿名用户', avatar: '' })
const titlePayload = computed(() => pickUserTitlePayload(author.value))
const titleText = computed(() => pickUserTitleText(author.value))
const timeText = computed(() => formatTime(moment.value?.create_time))
const content = computed(() => String(moment.value?.content || '').trim())
const images = computed(() => parseImageList(moment.value?.images))

const allowComment = computed(() => {
  const comment = moment.value?.result?.comment
  return Number(comment?.allow) !== 2 && Number(comment?.show) !== 2
})

const myUid = computed(() => Number(userStore.user?.id || 0))
const canFollow = computed(() => Number(author.value.id) > 0 && Number(author.value.id) !== myUid.value)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await getMoment(id.value)
    moment.value = result || null
    commentCount.value = Number(result?.result?.comment?.count || 0)
    await loadFollowState()
  } catch {
    moment.value = null
  } finally {
    loading.value = false
  }
}

async function loadFollowState(): Promise<void> {
  if (!canFollow.value || !userStore.isLogin) return
  try {
    const result = await isFollowing(Number(author.value.id))
    following.value = Boolean(result?.is_following)
  } catch {
    // 忽略
  }
}

async function toggleFollow(): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (followBusy.value || !canFollow.value) return

  followBusy.value = true
  const wasFollowing = following.value
  following.value = !wasFollowing

  try {
    if (wasFollowing) await unfollow(Number(author.value.id))
    else await follow(Number(author.value.id))
    toast(wasFollowing ? '已取消关注' : '已关注', 'success')
  } catch {
    following.value = wasFollowing
  } finally {
    followBusy.value = false
  }
}

function previewImage(index: number): void {
  uni.previewImage({ urls: images.value, current: index })
}

function toComments(): void {
  uni.pageScrollTo({ selector: '#comments', duration: 240 })
}

function openAuthor(): void {
  const uid = Number(author.value.id || 0)
  if (uid > 0) uni.navigateTo({ url: `/pages/user/author?id=${uid}` })
}

function back(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else uni.reLaunch({ url: '/pages/index/index' })
}

onLoad((options) => {
  id.value = Number(options?.id || 0)
  if (!id.value) {
    toast('缺少动态 id')
    return
  }
  load()
})

onShareAppMessage(() => ({
  title: 'INIS 动态',
  path: `/pages/moment/detail?id=${id.value}`
}))
</script>

<style lang="scss" scoped>
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-bottom: 1px solid $inis-border;
  padding-top: calc(16rpx + env(safe-area-inset-top));
}
</style>
