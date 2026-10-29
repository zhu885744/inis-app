<template>
  <view class="feed-card" @click="emit('click', moment.id)">
    <!-- 作者行 -->
    <view class="flex items-center gap-2">
      <image class="h-9 w-9 flex-none rounded-full bg-gray-100" :src="authorAvatar" mode="aspectFill" />
      <view class="min-w-0 flex-1">
        <view class="flex items-center">
          <text class="max-w-30 text-14px text-main font-medium ellipsis">{{ authorName }}</text>
          <TitleBadge :payload="titlePayload" :text="titleText" />
        </view>
        <text class="block text-11px text-weak">{{ timeText }}</text>
      </view>
      <text v-if="moment.top" class="rounded-2 bg-primary/10 px-2 py-1 text-10px text-primary">置顶</text>
    </view>

    <!-- 正文 -->
    <text v-if="content" class="mt-2 block text-15px text-main">{{ content }}</text>

    <!-- 图片九宫格（最多 9 张） -->
    <view v-if="images.length" class="mt-3 flex flex-wrap gap-2">
      <image
        v-for="(image, index) in images.slice(0, visibleCount)"
        :key="index"
        class="rounded-3 bg-gray-100"
        :class="visibleCount === 1 ? 'h-52 w-full' : 'h-32 w-32'"
        :src="image"
        mode="aspectFill"
      />
    </view>

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
      <view v-if="moment.location" class="ml-5 flex items-center gap-1">
        <wd-icon name="location" :size="16" color="#9ca3af" />
        <text class="max-w-30 text-12px text-weak ellipsis">{{ moment.location }}</text>
      </view>
      <text class="ml-auto text-12px text-weak">{{ formatCount(moment.views) }} 浏览</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TitleBadge from './TitleBadge.vue'
import type { MomentItem } from '@/api/types'
import { formatCount, formatTime, parseImageList, pickUserTitlePayload, pickUserTitleText } from '@/utils/helper'

const props = defineProps<{
  moment: MomentItem
}>()

const emit = defineEmits<{
  (e: 'click', id: number): void
}>()

const author = computed(() => props.moment.result?.author)
const authorName = computed(() => author.value?.nickname || '匿名用户')
const authorAvatar = computed(() => author.value?.avatar || '')

const titlePayload = computed(() => pickUserTitlePayload(author.value))
const titleText = computed(() => pickUserTitleText(author.value))

const content = computed(() => String(props.moment.content || '').trim())
const images = computed(() => parseImageList(props.moment.images))
const timeText = computed(() => formatTime(props.moment.create_time))

const commentCount = computed(() => Number(props.moment.result?.comment?.count || 0))
const likeCount = computed(() => Number(props.moment.result?.like?.length || 0))

/** 单图铺满、多图走九宫格 */
const visibleCount = computed(() => (images.value.length === 1 ? 1 : 9))
</script>
