<template>
  <!-- 双列瀑布流：把笔记按估算高度分到左右两列，视觉上与小红书首页一致 -->
  <view class="waterfall">
    <view class="waterfall-col">
      <NoteCard v-for="note in columns.left" :key="note.key" :note="note" @click="onClick" />
    </view>
    <view class="waterfall-col">
      <NoteCard v-for="note in columns.right" :key="note.key" :note="note" @click="onClick" />
    </view>
  </view>

  <!-- 空态 / 加载态：独立于瀑布流，避免撑成两列 -->
  <view v-if="!notes.length && !loading" class="waterfall-empty">
    <text class="waterfall-empty-icon bi bi-inboxes" />
    <text class="waterfall-empty-text">{{ emptyText }}</text>
  </view>

  <view v-if="loading" class="waterfall-tip">
    <text class="waterfall-spinner" />
    <text>加载中…</text>
  </view>
  <view v-else-if="finished && notes.length" class="waterfall-tip">
    <text>— 到底啦 —</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import NoteCard from './NoteCard.vue'
import { splitColumns, type NoteItem } from '@/composables/useNotes'

const props = withDefaults(
  defineProps<{
    notes: NoteItem[]
    loading?: boolean
    /** 已加载完所有数据 */
    finished?: boolean
    emptyText?: string
  }>(),
  {
    loading: false,
    finished: false,
    emptyText: '还没有笔记，换个筛选试试'
  }
)

const emit = defineEmits<{
  (e: 'click', id: number, type: 'article' | 'moment'): void
}>()

const columns = computed(() => splitColumns(props.notes))

function onClick(id: number, type: 'article' | 'moment'): void {
  emit('click', id, type)
}
</script>

<style lang="scss" scoped>
.waterfall {
  display: flex;
  gap: 10px;
  padding: 10px 12px 0;
  align-items: flex-start;
}

.waterfall-col {
  flex: 1;
  min-width: 0;
}

.waterfall-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 70px 24px;
  color: var(--text-light);
}

.waterfall-empty-icon {
  font-size: 34px;
}

.waterfall-empty-text {
  font-size: 13px;
}

.waterfall-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 0 20px;
  font-size: 12px;
  color: var(--text-light);
}

.waterfall-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: waterfall-spin 0.7s linear infinite;
}

@keyframes waterfall-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
