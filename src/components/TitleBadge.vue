<template>
  <view v-if="hasContent" class="title-badge" :class="{ 'is-image': hasImage }" :style="badgeStyle">
    <!-- 图片头衔：纯图展示，不叠加文字 -->
    <image v-if="hasImage" class="title-badge__img" :src="imageUrl" mode="aspectFit" :style="imageStyle" />
    <text v-else class="title-badge__text">{{ label }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TitlePayload } from '@/utils/helper'

/**
 * 头衔渲染（移动端简化版，与 Mellow/src/components/TitleBadge.vue 同口径）
 * 两种形态互斥：有 image 就是纯图片头衔；否则按文字头衔渲染
 */
const props = withDefaults(
  defineProps<{
    payload?: TitlePayload | null
    text?: string
  }>(),
  {
    payload: null,
    text: ''
  }
)

/** 图片头衔的基准高度（rpx，1px ≈ 2rpx） */
const IMAGE_BASE_HEIGHT = 32

const label = computed(() => props.text || props.payload?.text || '')

const imageUrl = computed(() => {
  const value = props.payload?.image
  return typeof value === 'string' ? value.trim() : ''
})
const hasImage = computed(() => imageUrl.value !== '')

const hasContent = computed(() => Boolean(hasImage.value || label.value))

const badgeStyle = computed(() => {
  const payload = props.payload || {}
  const style: Record<string, string> = {}

  if (payload.color) style.color = payload.color
  else if (hasImage.value) style.color = 'inherit'

  if (payload.bg) style.background = payload.bg
  else if (hasImage.value) style.background = 'transparent'

  if (payload.border) {
    style.border = String(payload.border).includes(' ') ? payload.border : `1px solid ${payload.border}`
  }

  return style
})

const imageStyle = computed(() => {
  const raw = Number(props.payload?.scale)
  const scale = Number.isFinite(raw) && raw > 0 ? Math.min(3, Math.max(0.5, raw)) : 1
  return { height: `${IMAGE_BASE_HEIGHT * scale}rpx` }
})
</script>

<style lang="scss" scoped>
.title-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 8rpx;
  padding: 1rpx 10rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  line-height: 1.5;
  color: $inis-primary;
  background: rgba(199, 72, 42, 0.1);
}

.title-badge.is-image {
  padding: 0;
  background: transparent;
}

.title-badge__img {
  display: block;
  width: auto;
}
</style>
