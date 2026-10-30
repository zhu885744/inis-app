<template>
  <view class="msg-page">
    <!-- 顶部：标题 + 批量操作 -->
    <view class="msg-head">
      <view class="section-title">
        <view class="title-bar" />
        <text>消息通知</text>
        <text v-if="userStore.isLogin && unread > 0" class="unread-pill">{{ unread > 99 ? '99+' : unread }}</text>
      </view>
      <view v-if="userStore.isLogin" class="head-actions">
        <text class="head-action" @click="onReadAll">全部已读</text>
        <text class="head-action" @click="onClearRead">清空已读</text>
      </view>
    </view>

    <!-- 分类：胶囊分段控件（与首页「发现」筛选同款） -->
    <scroll-view v-if="userStore.isLogin" scroll-x class="channel-scroll">
      <view class="feed-filter">
        <view
          v-for="item in CHANNELS"
          :key="item.key"
          class="feed-filter-item"
          :class="{ 'is-active': channel === item.key }"
          @click="switchChannel(item.key)"
        >
          <text>{{ item.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 未登录 -->
    <view v-if="!userStore.isLogin" class="card card-pad guest">
      <text class="bi bi-bell guest-icon" />
      <text class="guest-text">登录后查看你的消息</text>
      <view class="btn btn-sm btn-primary" @click="toLogin">立即登录</view>
    </view>

    <template v-else>
      <view v-if="view.loading.value && !list.length" class="is-loading">
        <text class="spinner" />
        <text> 加载中…</text>
      </view>

      <view v-else-if="view.empty.value" class="card card-pad empty">
        <text class="empty-icon">🔔</text>
        <text>{{ channelLabel }}暂无消息</text>
      </view>

      <template v-else>
        <view class="msg-list">
          <view
            v-for="item in list"
            :key="item.id"
            class="msg-item"
            :class="{ 'is-unread': !Number(item.is_read) }"
            @click="openItem(item)"
          >
            <view class="msg-avatar-wrap">
              <image
                v-if="fromUser(item).avatar"
                class="msg-avatar"
                :src="fromUser(item).avatar"
                mode="aspectFill"
              />
              <view v-else class="msg-icon" :style="{ background: typeMeta(item.type).bg }">
                <text class="bi" :class="typeMeta(item.type).icon" :style="{ color: typeMeta(item.type).color }" />
              </view>
              <view v-if="!Number(item.is_read)" class="msg-dot" />
            </view>

            <view class="msg-body">
              <view class="msg-row">
                <text class="msg-title ellipsis">{{ item.title || typeMeta(item.type).label }}</text>
                <text class="msg-time">{{ formatTime(item.create_time) }}</text>
              </view>
              <text class="msg-content">{{ item.content || '' }}</text>
            </view>
          </view>
        </view>

        <view class="load-more" @click="pager.loadMore()">
          <text>{{ view.loading.value ? '加载中…' : view.finished.value ? '没有更多了' : '加载更多' }}</text>
        </view>
      </template>
    </template>

    <AppTabBar current="message" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import {
  clearNotifications,
  getUnreadCount,
  listNotifications,
  readAllNotifications,
  readNotification,
  type NotificationChannel
} from '@/api/notification'
import type { NotificationItem } from '@/api/types'
import { usePagedList } from '@/composables/usePagedList'
import { useUserStore } from '@/stores/user'
import { formatTime } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 消息中心（对齐 Mellow 主题 views/user/Notifications.vue 的信息层级）
 *
 * 后端没有长连接推送（见 docs/API docs/notification.md），所以：
 * - 进入页面（onShow）拉一次未读数
 * - 列表分页由 notification/list 提供，按 type 过滤
 * - 点击一条 → 标记已读，并按类型跳到对应内容
 */
const userStore = useUserStore()

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'comment', label: '评论' },
  { key: 'like', label: '点赞' },
  { key: 'follow', label: '关注' },
  { key: 'system', label: '系统' }
]

/** 各类型图标 / 配色（与 Mellow 主题的语义色一致） */
const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  comment: { label: '评论', icon: 'bi-chat-dots', color: '#4a90e2', bg: 'rgba(74, 144, 226, 0.12)' },
  like: { label: '点赞', icon: 'bi-heart-fill', color: '#c7482a', bg: 'rgba(199, 72, 42, 0.1)' },
  collect: { label: '收藏', icon: 'bi-star', color: '#c08a2e', bg: 'rgba(192, 138, 46, 0.12)' },
  follow: { label: '关注', icon: 'bi-person-plus', color: '#2e7a5c', bg: 'rgba(46, 122, 92, 0.12)' },
  system: { label: '系统', icon: 'bi-bell', color: '#c08a2e', bg: 'rgba(192, 138, 46, 0.12)' }
}

const channel = ref<NotificationChannel>('all')
const unread = ref(0)

const pager = usePagedList<NotificationItem>(
  (page, limit) =>
    listNotifications({
      page,
      limit,
      ...(channel.value === 'all' ? {} : { type: channel.value })
    }),
  15
)

const list = pager.items

const view = {
  loading: computed(() => pager.loading.value),
  empty: computed(() => pager.isEmpty.value),
  finished: computed(() => pager.finished.value)
}

const channelLabel = computed(() => CHANNELS.find((item) => item.key === channel.value)?.label || '')

function typeMeta(type?: string) {
  return TYPE_META[String(type || 'system')] || TYPE_META.system
}

function fromUser(item: NotificationItem) {
  return item.result?.from_user || { id: 0, nickname: '', avatar: '' }
}

async function loadUnread(): Promise<void> {
  if (!userStore.isLogin) {
    unread.value = 0
    return
  }
  try {
    const result = await getUnreadCount()
    unread.value = Number(result?.count || 0)
  } catch {
    // 忽略：角标拿不到不影响列表
  }
}

function switchChannel(key: NotificationChannel): void {
  if (channel.value === key) return
  channel.value = key
  pager.refresh()
}

async function openItem(item: NotificationItem): Promise<void> {
  // 标记已读（失败也不挡跳转）
  if (!Number(item.is_read)) {
    try {
      await readNotification(Number(item.id))
      item.is_read = 1
      unread.value = Math.max(0, unread.value - 1)
    } catch {
      // ignore
    }
  }

  const type = String(item.type || '')
  const bindType = String(item.bind_type || '')
  const bindId = Number(item.bind_id || 0)

  if (type === 'comment' && bindId > 0) {
    if (bindType === 'moments') uni.navigateTo({ url: `/pages/moment/detail?id=${bindId}` })
    else uni.navigateTo({ url: `/pages/article/detail?id=${bindId}` })
    return
  }

  if (type === 'follow') {
    const uid = Number(item.from_uid || fromUser(item).id || 0)
    if (uid > 0) uni.navigateTo({ url: `/pages/user/author?id=${uid}` })
    return
  }

  // 点赞 / 收藏通知的 bind_id 是**评论 id**（见通知类型表），App 内没有评论详情页，
  // 因此只把内容提示出来，避免跳到错误页面
  toast(String(item.content || item.title || '已读'))
}

function onReadAll(): void {
  uni.showModal({
    title: '全部标记已读',
    content: '确定把所有未读消息标记为已读吗？',
    confirmColor: '#c7482a',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await readAllNotifications()
        unread.value = 0
        pager.refresh()
        toast('已全部标记已读', 'success')
      } catch {
        // 请求层已提示
      }
    }
  })
}

function onClearRead(): void {
  uni.showModal({
    title: '清空已读',
    content: '将删除所有已读消息（未读消息保留），确定吗？',
    confirmColor: '#c7482a',
    success: async (res) => {
      if (!res.confirm) return
      try {
        const cleared = await clearNotifications({ is_read: 1 })
        pager.refresh()
        toast(cleared > 0 ? `已清空 ${cleared} 条` : '没有可清空的已读消息', 'success')
      } catch {
        // 请求层已提示
      }
    }
  })
}

onShow(() => {
  if (!userStore.isLogin) return
  pager.refresh()
  loadUnread()
})

onPullDownRefresh(async () => {
  if (userStore.isLogin) await Promise.all([pager.refresh(), loadUnread()])
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (userStore.isLogin) pager.loadMore()
})
</script>

<style lang="scss" scoped>
.msg-page {
  min-height: 100vh;
  padding: 14px 14px calc(76px + env(safe-area-inset-bottom));
  padding-top: calc(14px + env(safe-area-inset-top));
  background: var(--bg);
  background-image: var(--gradient-page);
}

.msg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--text);
}

.title-bar {
  width: 4px;
  height: 20px;
  margin-right: 10px;
  border-radius: 2px;
  background: var(--primary);
}

.unread-pill {
  margin-left: 8px;
  padding: 0 6px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: #fff;
  background: var(--danger);
  border-radius: 999px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.head-action {
  font-size: 12px;
  color: var(--text-muted);
}

.channel-scroll {
  white-space: nowrap;
  margin-bottom: 12px;
}

/* 分段控件（与首页「发现」筛选完全同款） */
.feed-filter {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: var(--bg-muted);
}

.feed-filter-item {
  padding: 3px 12px;
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.7;
}

.feed-filter-item.is-active {
  color: #fff;
  background: var(--primary);
}

.msg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.msg-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
}

.msg-item.is-unread {
  border-color: var(--accent-ring);
  background: var(--bg-card);
}

.msg-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.msg-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-muted);
}

.msg-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 17px;
}

.msg-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
  border: 1.5px solid var(--bg-card);
}

.msg-body {
  flex: 1;
  min-width: 0;
}

.msg-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.msg-time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-light);
}

.msg-content {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
  word-break: break-word;
}

.is-loading,
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px 0;
  font-size: 13px;
  color: var(--text-muted);
}

.card-pad {
  padding: 16px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.empty-icon {
  font-size: 30px;
  opacity: 0.6;
}

.guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  text-align: center;
}

.guest-icon {
  font-size: 30px;
  color: var(--text-light);
}

.guest-text {
  font-size: 14px;
  color: var(--text-soft);
}
</style>
