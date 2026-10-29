<template>
  <view class="min-h-screen bg-page">
    <!-- 顶部标题栏 -->
    <view class="fixed-head">
      <view class="flex items-center px-4 pt-3 pb-3">
        <text class="text-18px text-main font-semibold">消息</text>
        <text v-if="userStore.isLogin && unread > 0" class="ml-2 rounded-full bg-primary px-2 py-1 text-10px text-white">
          {{ unread > 99 ? '99+' : unread }}
        </text>

        <view v-if="userStore.isLogin" class="ml-auto flex items-center gap-4">
          <text class="text-12px text-sub" @click="onReadAll">全部已读</text>
          <text class="text-12px text-sub" @click="onClearRead">清空已读</text>
        </view>
      </view>

      <!-- 分类 -->
      <scroll-view v-if="userStore.isLogin" scroll-x class="tab-scroll px-4 pb-2">
        <view v-for="item in CHANNELS" :key="item.key" class="mr-5 inline-block" @click="switchChannel(item.key)">
          <text class="text-14px" :class="channel === item.key ? 'text-main font-semibold' : 'text-sub'">
            {{ item.label }}
          </text>
          <view v-if="channel === item.key" class="mx-auto mt-1 h-1 w-4 rounded-full bg-primary" />
        </view>
      </scroll-view>
    </view>

    <view class="px-3 pt-3 pb-30">
      <!-- 未登录 -->
      <view v-if="!userStore.isLogin" class="mt-10 flex-col-center">
        <view class="flex-center mb-4 h-16 w-16 rounded-full bg-gray-100">
          <wd-icon name="chat" :size="32" color="#c0c4cc" />
        </view>
        <text class="text-14px text-sub">登录后查看你的消息</text>
        <view class="mt-5">
          <wd-button type="primary" size="small" @click="toLogin">立即登录</wd-button>
        </view>
      </view>

      <template v-else>
        <view v-if="view.loading.value && !list.length" class="py-20 text-center">
          <text class="text-12px text-weak">加载中…</text>
        </view>

        <view v-else-if="view.empty.value" class="mt-10 flex-col-center">
          <view class="flex-center mb-4 h-16 w-16 rounded-full bg-gray-100">
            <wd-icon name="notification" :size="32" color="#c0c4cc" />
          </view>
          <text class="text-14px text-sub">{{ channelLabel }}暂无消息</text>
        </view>

        <template v-else>
          <view class="overflow-hidden rounded-3 bg-white">
            <view
              v-for="(item, index) in list"
              :key="item.id"
              class="flex items-start gap-3 px-4 py-3"
              :class="{ 'border-t border-line': index > 0 }"
              @click="openItem(item)"
            >
              <view class="relative flex-none">
                <image
                  v-if="fromUser(item).avatar"
                  class="h-10 w-10 rounded-full bg-gray-100"
                  :src="fromUser(item).avatar"
                  mode="aspectFill"
                />
                <view v-else class="flex-center h-10 w-10 rounded-full" :style="{ background: typeMeta(item.type).bg }">
                  <wd-icon :name="typeMeta(item.type).icon" :size="18" :color="typeMeta(item.type).color" />
                </view>
                <view
                  v-if="!Number(item.is_read)"
                  class="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary"
                />
              </view>

              <view class="min-w-0 flex-1">
                <view class="flex items-center">
                  <text class="text-14px text-main font-medium ellipsis">{{ item.title || typeMeta(item.type).label }}</text>
                  <text class="ml-auto flex-none text-11px text-weak">{{ formatTime(item.create_time) }}</text>
                </view>
                <text class="mt-1 block text-12px text-sub leading-snug">{{ item.content || '' }}</text>
              </view>
            </view>
          </view>

          <view class="py-3 text-center" @click="pager.loadMore()">
            <text class="text-12px text-primary">{{ view.loading.value ? '加载中…' : view.finished.value ? '没有更多了' : '加载更多' }}</text>
          </view>
        </template>
      </template>
    </view>

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
 * 消息中心
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

/** 各类型图标 / 配色（与首页「金刚区」的口径一致） */
const TYPE_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  comment: { label: '评论', icon: 'chat', color: '#409eff', bg: 'rgba(64, 158, 255, 0.12)' },
  like: { label: '点赞', icon: 'thumb-up', color: '#c7482a', bg: 'rgba(199, 72, 42, 0.1)' },
  collect: { label: '收藏', icon: 'star', color: '#e6a23c', bg: 'rgba(230, 162, 60, 0.12)' },
  follow: { label: '关注', icon: 'user-add', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' },
  system: { label: '系统', icon: 'notification', color: '#e6a23c', bg: 'rgba(230, 162, 60, 0.12)' }
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

const channelLabel = computed(
  () => CHANNELS.find((item) => item.key === channel.value)?.label || ''
)

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
.fixed-head {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1px solid $inis-border;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

.tab-scroll {
  white-space: nowrap;
}
</style>
