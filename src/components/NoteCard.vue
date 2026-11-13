<template>
  <!-- 笔记卡片：小红书双列流里的最小单元（封面 + 标题两行 + 作者 / 点赞） -->
  <view class="note-card" @click="emit('click', note.id, note.type)">
    <view class="note-cover" :style="{ paddingBottom: `${note.ratio * 100}%` }">
      <image v-if="note.cover" class="note-cover-img" :src="note.cover" mode="aspectFill" lazy-load />
      <!-- 无配图的纯文字笔记：用浅灰块铺底，正文露出前三行，避免卡片塌成一条 -->
      <view v-else class="note-cover-text">
        <text class="note-cover-title ellipsis-3">{{ note.title || '文字笔记' }}</text>
      </view>

      <!-- 多图角标：右上角显示图片数（与小红书一致） -->
      <view v-if="note.images.length > 1" class="note-cover-count">
        <text class="bi bi-images" />
        <text>{{ note.images.length }}</text>
      </view>
      <text v-if="note.top" class="note-cover-top">置顶</text>
    </view>

    <view class="note-body">
      <text v-if="note.cover" class="note-title ellipsis-2">{{ note.title }}</text>
      <view class="note-foot">
        <view class="note-author">
          <image v-if="note.authorAvatar" class="note-avatar" :src="note.authorAvatar" mode="aspectFill" />
          <view v-else class="note-avatar note-avatar-empty">
            <text class="bi bi-person-fill" />
          </view>
          <text class="note-name ellipsis">{{ note.authorName }}</text>
        </view>
        <view class="note-like" :class="{ 'has-like': note.likes > 0 }">
          <text class="bi bi-heart-fill" />
          <text v-if="note.likes > 0">{{ formatCount(note.likes) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { NoteItem } from '@/composables/useNotes'
import { formatCount } from '@/utils/helper'

defineProps<{
  note: NoteItem
}>()

const emit = defineEmits<{
  (e: 'click', id: number, type: 'article' | 'moment'): void
}>()
</script>

<style lang="scss" scoped>
.note-card {
  margin-bottom: 10px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* 封面：用 padding-bottom 撑比例，小程序端比 aspect-ratio 稳 */
.note-cover {
  position: relative;
  width: 100%;
  height: 0;
  overflow: hidden;
  background: var(--bg-muted);
  border-radius: var(--radius-lg);
}

.note-cover-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 纯文字卡片：浅灰底 + 居中正文 */
.note-cover-text {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  padding: 14px;
  background: linear-gradient(160deg, #fafafa, #f0f0f0);
}

.note-cover-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text);
  word-break: break-word;
}

.note-cover-count {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.42);
  color: #fff;
  font-size: 11px;
  line-height: 1.7;
}

.note-cover-count .bi {
  font-size: 11px;
}

.note-cover-top {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(255, 36, 66, 0.92);
  color: #fff;
  font-size: 10px;
  line-height: 1.7;
}

.note-body {
  padding: 8px 2px 6px;
}

.note-title {
  display: -webkit-box;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--text);
  word-break: break-word;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 7px;
}

.note-author {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex: 1;
}

.note-avatar {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-muted);
}

.note-avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--text-light);
}

.note-name {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.note-like {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-light);
}

.note-like.has-like {
  color: var(--text-muted);
}

.note-like .bi {
  font-size: 12px;
}

.ellipsis-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ellipsis-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
