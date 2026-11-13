<template>
  <view class="home">
    <!-- 顶栏 + 分类 tab：一起吸顶，滚动时始终可见（小红书也是这样） -->
    <view class="home-header">
      <view class="xhs-topbar">
        <text class="xhs-logo">INIS</text>
        <view class="xhs-search" @click="goSearch">
          <text class="bi bi-search search-icon" />
          <text class="search-placeholder">搜索笔记、用户</text>
        </view>
        <image
          v-if="userStore.isLogin && userStore.avatar"
          class="top-avatar"
          :src="userStore.avatar"
          mode="aspectFill"
          @click="goMine"
        />
        <view v-else class="xhs-btn top-login" @click="toLogin">登录</view>
      </view>

      <view class="xhs-tabs">
        <view
          v-for="item in TABS"
          :key="item.key"
          class="xhs-tab"
          :class="{ 'is-active': activeTab === item.key }"
          @click="switchTab(item.key)"
        >
          {{ item.label }}
        </view>
      </view>
    </view>

    <!-- 公告：压成一条细提示，不打断内容流 -->
    <view v-if="currentPlacard.title" class="notice" @click="openPlacard">
      <text class="bi bi-megaphone-fill notice-icon" />
      <text class="notice-text ellipsis">{{ currentPlacard.title }}</text>
      <text class="notice-more">查看</text>
    </view>

    <!-- 未登录时的关注流引导 -->
    <view v-if="needLogin" class="login-tip">
      <text class="login-tip-text">登录后查看关注的人都在发什么</text>
      <view class="xhs-btn" @click="toLogin">去登录</view>
    </view>

    <NoteWaterfall
      v-else
      :notes="notes"
      :loading="loading"
      :finished="finished"
      :empty-text="emptyText"
      @click="openNote"
    />

    <AppTabBar current="index" />

    <!-- 公告详情弹窗 -->
    <view v-if="activePlacard" class="placard-mask" @click="activePlacard = null">
      <view class="placard-dialog" @click.stop>
        <view class="placard-head">
          <text class="placard-title">{{ activePlacard.title }}</text>
          <text class="bi bi-x-lg placard-close" @click="activePlacard = null" />
        </view>
        <scroll-view scroll-y class="placard-body">
          <rich-text v-if="activePlacard.content" :nodes="activePlacard.content" />
          <text v-else class="placard-empty">暂无正文</text>
        </scroll-view>
        <text class="placard-date">{{ formatDateTime(activePlacard.create_time) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom, onShow, onUnload } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import NoteWaterfall from '@/components/NoteWaterfall.vue'
import { getArticles } from '@/api/article'
import { getMoments } from '@/api/moments'
import { getFeed, type FeedType } from '@/api/feed'
import { getPlacards, type PlacardItem } from '@/api/placard'
import type { ArticleItem, MomentItem } from '@/api/types'
import { articleToNote, momentToNote, type NoteItem } from '@/composables/useNotes'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/helper'
import { toLogin } from '@/utils/nav'

/**
 * 首页（小红书式双列瀑布流）
 *
 * 三个流：
 *   发现 — 文章 + 动态按「置顶优先 / 时间倒序」混排（无需登录）
 *   关注 — feed/all?type=follow（需登录）
 *   文章 — 只取长文（无需登录）
 *
 * 数据全部走真实接口；分页用移动端自然的「触底加载」，
 * 每个流各自维护游标，切换 tab 会重置对应流。
 */

type TabKey = 'follow' | 'discover' | 'article'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'follow', label: '关注' },
  { key: 'discover', label: '发现' },
  { key: 'article', label: '文章' }
]

/** 每页条数：feed 接口上限 20，统一 12 条一页保证滚动流畅 */
const PAGE_SIZE = 12

const userStore = useUserStore()

const activeTab = ref<TabKey>('discover')
const notes = ref<NoteItem[]>([])
const loading = ref(false)
const finished = ref(false)

/** 各流自己的游标与取尽标记 */
const cursor = reactive({ article: 1, moment: 1, feed: 1 })
const done = reactive({ article: false, moment: false, feed: false })

/** 关注流需要登录 */
const needLogin = computed(() => activeTab.value === 'follow' && !userStore.isLogin)

const emptyText = computed(() => {
  if (activeTab.value === 'follow') return '关注的人还没发新内容'
  if (activeTab.value === 'article') return '还没有文章'
  return '还没有内容，下拉刷新试试'
})

/* ---------------- 公告 ---------------- */
const placards = ref<PlacardItem[]>([])
const placardIndex = ref(0)
const activePlacard = ref<PlacardItem | null>(null)
let placardTimer: ReturnType<typeof setInterval> | null = null

const currentPlacard = computed<PlacardItem>(() => placards.value[placardIndex.value] || { id: 0, title: '' })

function startPlacardTimer(): void {
  stopPlacardTimer()
  if (placards.value.length <= 1) return
  placardTimer = setInterval(() => {
    placardIndex.value = (placardIndex.value + 1) % placards.value.length
  }, 5000)
}

function stopPlacardTimer(): void {
  if (placardTimer) {
    clearInterval(placardTimer)
    placardTimer = null
  }
}

async function loadPlacards(): Promise<void> {
  try {
    const result = await getPlacards(10)
    placards.value = Array.isArray(result?.data) ? result.data : []
    placardIndex.value = 0
    startPlacardTimer()
  } catch {
    placards.value = []
  }
}

function openPlacard(): void {
  if (currentPlacard.value.id) activePlacard.value = currentPlacard.value
}

/* ---------------- 分页 ---------------- */

function resetPool(): void {
  notes.value = []
  finished.value = false
  cursor.article = 1
  cursor.moment = 1
  cursor.feed = 1
  done.article = false
  done.moment = false
  done.feed = false
}

/** 发现流：文章 + 动态各补一页，合并后按「置顶 → 时间」排序 */
async function loadDiscover(): Promise<void> {
  const tasks: Promise<void>[] = []

  if (!done.article) {
    tasks.push(
      (async () => {
        try {
          const result = await getArticles({
            page: cursor.article,
            limit: PAGE_SIZE,
            order: 'top desc, create_time desc'
          })
          const list = (Array.isArray(result?.data) ? result.data : []) as ArticleItem[]
          notes.value.push(...list.map(articleToNote))
          cursor.article += 1
          if (list.length < PAGE_SIZE) done.article = true
        } catch {
          done.article = true
        }
      })()
    )
  }

  if (!done.moment) {
    tasks.push(
      (async () => {
        try {
          const result = await getMoments({
            page: cursor.moment,
            limit: PAGE_SIZE,
            order: 'top desc, create_time desc'
          })
          const list = (Array.isArray(result?.data) ? result.data : []) as MomentItem[]
          notes.value.push(...list.map(momentToNote))
          cursor.moment += 1
          if (list.length < PAGE_SIZE) done.moment = true
        } catch {
          done.moment = true
        }
      })()
    )
  }

  await Promise.all(tasks)

  notes.value.sort((a, b) => {
    if ((b.top || 0) !== (a.top || 0)) return (b.top || 0) - (a.top || 0)
    return (b.createTime || 0) - (a.createTime || 0)
  })

  finished.value = done.article && done.moment
}

/** 文章流 */
async function loadArticles(): Promise<void> {
  if (done.article) {
    finished.value = true
    return
  }
  try {
    const result = await getArticles({
      page: cursor.article,
      limit: PAGE_SIZE,
      order: 'top desc, create_time desc'
    })
    const list = (Array.isArray(result?.data) ? result.data : []) as ArticleItem[]
    notes.value.push(...list.map(articleToNote))
    cursor.article += 1
    if (list.length < PAGE_SIZE) {
      done.article = true
      finished.value = true
    }
  } catch {
    finished.value = true
  }
}

/** 关注流（feed/all） */
async function loadFollow(): Promise<void> {
  if (done.feed) {
    finished.value = true
    return
  }
  try {
    const result = await getFeed('follow' as FeedType, cursor.feed, PAGE_SIZE)
    const list = (Array.isArray(result?.data) ? result.data : []) as MomentItem[]
    notes.value.push(...list.map(momentToNote))
    cursor.feed += 1
    // 后端对 page 静默钳到 30：到底后返回空数组
    if (list.length < PAGE_SIZE) {
      done.feed = true
      finished.value = true
    }
  } catch {
    finished.value = true
  }
}

async function loadMore(): Promise<void> {
  if (loading.value || finished.value || needLogin.value) return
  loading.value = true
  try {
    if (activeTab.value === 'discover') await loadDiscover()
    else if (activeTab.value === 'article') await loadArticles()
    else await loadFollow()
  } finally {
    loading.value = false
  }
}

/* ---------------- 交互 ---------------- */
function switchTab(key: TabKey): void {
  if (activeTab.value === key) return
  activeTab.value = key
  resetPool()
  if (key === 'follow' && !userStore.isLogin) return
  loadMore()
}

function openNote(id: number, type: 'article' | 'moment'): void {
  const url = type === 'article' ? `/pages/article/detail?id=${id}` : `/pages/moment/detail?id=${id}`
  uni.navigateTo({ url })
}

function goSearch(): void {
  uni.navigateTo({ url: '/pages/search/index' })
}

function goMine(): void {
  uni.reLaunch({ url: '/pages/mine/index' })
}

/** 发布成功后的刷新信号（见 pages/publish/index.vue） */
function onFeedRefresh(): void {
  resetPool()
  activeTab.value = 'discover'
  loadMore()
}

/* ---------------- 生命周期 ---------------- */
onLoad(() => {
  loadPlacards()
  loadMore()
  uni.$on('feed:refresh', onFeedRefresh)
})

onShow(() => {
  if (placards.value.length > 1) startPlacardTimer()
})

onUnload(() => {
  stopPlacardTimer()
  uni.$off('feed:refresh', onFeedRefresh)
})

onPullDownRefresh(async () => {
  resetPool()
  await Promise.all([loadPlacards(), loadMore()])
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  loadMore()
})
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(58px + env(safe-area-inset-bottom));
}

/* 吸顶容器：顶栏 + tab 一体 */
.home-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg-card);
}

.home-header .xhs-topbar {
  padding-bottom: 2px;
}

.search-icon {
  font-size: 14px;
  color: var(--text-muted);
}

.search-placeholder {
  font-size: 13px;
  color: var(--text-muted);
}

.top-avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--bg-muted);
}

.top-login {
  flex-shrink: 0;
  height: 28px;
  padding: 0 14px;
  font-size: 12px;
}

/* 公告条 */
.notice {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 12px 2px;
  padding: 7px 12px;
  border-radius: 8px;
  background: var(--xhs-red-soft);
  color: var(--primary);
}

.notice-icon {
  flex-shrink: 0;
  font-size: 13px;
}

.notice-text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--primary-deep);
}

.notice-more {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--primary);
}

/* 关注流未登录引导 */
.login-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 90px 24px;
}

.login-tip-text {
  font-size: 13px;
  color: var(--text-muted);
}

/* 公告弹窗 */
.placard-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.4);
}

.placard-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 68vh;
  padding: 18px;
  background: var(--bg-card);
  border-radius: 14px;
}

.placard-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}

.placard-title {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text);
}

.placard-close {
  flex-shrink: 0;
  padding: 2px;
  font-size: 15px;
  color: var(--text-muted);
}

.placard-body {
  flex: 1;
  max-height: 46vh;
  padding: 14px 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-soft);
}

.placard-empty {
  font-size: 13px;
  color: var(--text-muted);
}

.placard-date {
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
  font-size: 11px;
  color: var(--text-light);
}

.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
