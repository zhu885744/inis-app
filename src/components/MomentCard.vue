<template>
  <!-- 动态卡片：视觉对齐 Mellow 主题 components/MomentItem.vue -->
  <view class="moment-card" @click="emit('click', moment.id)">
    <view class="moment-head">
      <image class="avatar" :src="authorAvatar" mode="aspectFill" />
      <view class="info">
        <view class="name">
          <text class="name-link ellipsis">{{ authorName }}</text>
          <text v-if="authorLevel" class="level-tag">Lv.{{ authorLevel }}</text>
          <TitleBadge :payload="titlePayload" :text="titleText" />
          <text v-if="moment.top" class="top-tag">置顶</text>
        </view>
        <view class="time">
          <text>{{ timeText }}</text>
        </view>
      </view>
    </view>

    <text v-if="content" class="moment-content ellipsis-3">{{ content }}</text>

    <view v-if="images.length" class="moment-images" :class="images.length === 1 ? 'single' : 'multi'">
      <image
        v-for="(image, index) in shownImages"
        :key="index"
        class="moment-img"
        :src="image"
        mode="aspectFill"
      />
    </view>

    <view v-if="moment.location" class="moment-loc">
      <text class="bi bi-geo-alt" /> <text>{{ moment.location }}</text>
    </view>

    <view class="moment-actions">
      <text class="kind-tag"><text class="bi bi-chat-square-text" /> 动态</text>
      <view class="action-btns">
        <text class="action-item">
          <text class="bi bi-heart" />
          <text>{{ formatCount(likeCount) }}</text>
        </text>
        <text class="action-item">
          <text class="bi bi-chat-dots" />
          <text>{{ formatCount(commentCount) }}</text>
        </text>
        <text class="action-item is-static">
          <text class="bi bi-eye" />
          <text>{{ formatCount(moment.views) }}</text>
        </text>
      </view>
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
const authorName = computed(() => author.value?.nickname || '匿名')
const authorAvatar = computed(() => author.value?.avatar || '')
const authorLevel = computed(() => {
  const level = (author.value as any)?.result?.level?.current?.value
  return Number(level || 0) || ''
})

const titlePayload = computed(() => pickUserTitlePayload(author.value))
const titleText = computed(() => pickUserTitleText(author.value))

const content = computed(() => String(props.moment.content || '').trim())
const images = computed(() => parseImageList(props.moment.images))
/** 列表里最多展示 9 张图 */
const shownImages = computed(() => images.value.slice(0, 9))

const timeText = computed(() => formatTime(props.moment.create_time))
const commentCount = computed(() => Number(props.moment.result?.comment?.count || 0))
const likeCount = computed(() => Number(props.moment.result?.like?.length || 0))
</script>

<style lang="scss" scoped>
.moment-card {
  padding: 18px;
  margin-bottom: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
}

.moment-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-muted);
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.name-link {
  max-width: 45%;
}

.level-tag {
  flex-shrink: 0;
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--primary-deep);
}

.top-tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 3px;
}

.time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.moment-content {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
  word-break: break-word;
}

.moment-images {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}

.moment-images.multi {
  grid-template-columns: repeat(3, 1fr);
  max-width: 320px;
}

.moment-images.single {
  grid-template-columns: 1fr;
  max-width: 320px;
}

.moment-img {
  width: 100%;
  height: 100px;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.moment-images.single .moment-img {
  height: 200px;
}

.moment-loc {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.moment-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-soft);
  font-size: 13px;
  color: var(--text-muted);
}

.kind-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
  background: var(--bg-muted);
  border-radius: 999px;
  white-space: nowrap;
}

.action-btns {
  display: flex;
  align-items: center;
  gap: 16px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: inherit;
}

.action-item .bi {
  font-size: 15px;
}

.action-item.is-static {
  color: var(--text-muted);
}
</style>
