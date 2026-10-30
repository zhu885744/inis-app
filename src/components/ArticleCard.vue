<template>
  <!-- 文章卡片：视觉对齐 Mellow 主题 components/ArticleFeedItem.vue -->
  <view class="feed-article" @click="emit('click', article.id)">
    <view class="feed-head">
      <image class="feed-avatar" :src="authorAvatar" mode="aspectFill" />
      <view class="feed-info">
        <view class="feed-name">
          <text class="feed-name-link ellipsis">{{ authorName }}</text>
          <text v-if="authorLevel" class="level-tag">Lv.{{ authorLevel }}</text>
          <TitleBadge :payload="titlePayload" :text="titleText" />
          <text v-if="article.top" class="feed-top">置顶</text>
        </view>
        <view class="feed-time">
          <text>{{ timeText }}</text>
        </view>
      </view>
    </view>

    <text class="feed-title">{{ article.title || '无标题' }}</text>

    <text v-if="abstract" class="feed-body ellipsis-2">{{ abstract }}</text>

    <view class="feed-actions">
      <view class="action-tags">
        <text class="kind-tag"><text class="bi bi-file-text" /> 长文</text>
      </view>
      <view class="action-btns">
        <text class="feed-action">
          <text class="bi bi-chat-dots" />
          <text>{{ formatCount(commentCount) }}</text>
        </text>
        <text class="feed-action">
          <text class="bi bi-heart" />
          <text>{{ formatCount(likeCount) }}</text>
        </text>
        <text class="feed-action is-static">
          <text class="bi bi-eye" />
          <text>{{ formatCount(article.views) }}</text>
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TitleBadge from './TitleBadge.vue'
import type { ArticleItem } from '@/api/types'
import { formatCount, formatTime, pickUserTitlePayload, pickUserTitleText, stripHtml } from '@/utils/helper'

const props = defineProps<{
  article: ArticleItem
}>()

const emit = defineEmits<{
  (e: 'click', id: number): void
}>()

/** 作者信息由后端内联在 result.author（见 app/api/controller/article.go 的 AfterFind） */
const author = computed(() => props.article.result?.author)

const authorName = computed(() => author.value?.nickname || '匿名')
const authorAvatar = computed(() => author.value?.avatar || '')

/** 等级：后端 result.level.current.value（AuthorInfo 类型未声明，这里按实际返回取） */
const authorLevel = computed(() => {
  const level = (author.value as any)?.result?.level?.current?.value
  return Number(level || 0) || ''
})

const titlePayload = computed(() => pickUserTitlePayload(author.value))
const titleText = computed(() => pickUserTitleText(author.value))

const abstract = computed(() => stripHtml(props.article.abstract || ''))
const timeText = computed(() => formatTime(props.article.publish_time || props.article.create_time))

const commentCount = computed(() => Number(props.article.result?.comment?.count || 0))
const likeCount = computed(() => Number(props.article.result?.like?.length || 0))
</script>

<style lang="scss" scoped>
.feed-article {
  padding: 18px;
  margin-bottom: 14px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.feed-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.feed-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-muted);
}

.feed-info {
  flex: 1;
  min-width: 0;
}

.feed-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.feed-name-link {
  max-width: 40%;
}

.level-tag {
  flex-shrink: 0;
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--primary-deep);
}

.feed-top {
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 400;
  border-radius: 3px;
  background: var(--accent-soft);
  color: var(--accent);
}

.feed-time {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
}

.feed-title {
  display: block;
  margin: 12px 0 8px;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text);
}

.feed-body {
  display: block;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-soft);
  word-break: break-word;
}

.feed-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  column-gap: 12px;
  row-gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  font-size: 13px;
  color: var(--text-muted);
}

.action-tags,
.action-btns {
  display: flex;
  align-items: center;
  min-width: 0;
}

.action-tags {
  gap: 6px;
}

.action-btns {
  gap: 16px;
  margin-left: auto;
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

.kind-tag .bi {
  font-size: 12px;
}

.feed-action {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: inherit;
}

.feed-action .bi {
  font-size: 15px;
}

.feed-action.is-static {
  color: var(--text-muted);
}
</style>
