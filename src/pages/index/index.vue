<template>
  <view class="home-page">
    <!-- 移动端顶栏：与 Mellow 主题 layouts/MainLayout.vue 的 mobile-topbar 同款 -->
    <view class="mobile-topbar">
      <view class="mobile-brand">
        <text class="mobile-brand-text">INIS</text>
      </view>
      <view class="mobile-actions">
        <view class="mobile-icon-btn" @click="goSearch">
          <text class="bi bi-search" />
        </view>
        <image
          v-if="userStore.isLogin && userStore.avatar"
          class="mobile-avatar"
          :src="userStore.avatar"
          mode="aspectFill"
          @click="goMine"
        />
        <view v-else class="btn btn-sm btn-primary" @click="toLogin">登录</view>
      </view>
    </view>

    <view class="home">
      <!-- 公告轮播 -->
      <view v-if="placards.length" class="placard-card">
        <view class="placard-head">
          <text class="bi bi-megaphone" />
          <text class="placard-title">公告</text>
        </view>
        <view class="placard-carousel">
          <view class="placard-link" @click="openPlacard(currentPlacard)">
            <view class="placard-dot" :style="{ background: placardTypeOf(currentPlacard.type).color }" />
            <text class="placard-name">{{ currentPlacard.title }}</text>
            <text v-if="currentContent" class="placard-content ellipsis">{{ currentContent }}</text>
          </view>
          <view v-if="placards.length > 1" class="placard-dots">
            <view
              v-for="(item, i) in placards"
              :key="item.id"
              class="placard-dot-btn"
              :class="{ 'is-active': i === placardIndex }"
              @click.stop="goTo(i)"
            />
          </view>
        </view>
      </view>

      <!-- 发布动态入口条（未登录时整条即登录入口） -->
      <view v-if="userStore.isLogin" class="compose" @click="openCompose">
        <image class="compose-avatar" :src="userStore.avatar" mode="aspectFill" />
        <text class="compose-placeholder ellipsis">分享此刻的想法…</text>
        <view class="btn btn-primary btn-sm">发布动态</view>
      </view>
      <view v-else class="compose compose-guest" @click="toLogin">
        <text class="bi bi-person-circle compose-guest-icon" />
        <text class="compose-guest-text">登录后即可发布动态、参与讨论</text>
        <view class="btn btn-primary btn-sm">去登录</view>
      </view>

      <!-- 发现：文章与动态混排 -->
      <view class="section-header">
        <view class="section-title">
          <view class="title-bar" />
          <text>发现</text>
        </view>
        <view class="feed-filter">
          <view
            v-for="item in FILTERS"
            :key="item.key"
            class="feed-filter-item"
            :class="{ 'is-active': filter === item.key }"
            @click="switchFilter(item.key)"
          >
            <text>{{ item.label }}</text>
          </view>
        </view>
      </view>

      <text class="feed-summary">{{ summaryText }}</text>

      <view class="feed">
        <block v-for="item in displayItems" :key="item.key">
          <ArticleCard v-if="item.type === 'article'" :article="item.data" @click="openArticle(item.data.id)" />
          <MomentCard v-else :moment="item.data" @click="openMoment(item.data.id)" />
        </block>

        <view v-if="!loading && !displayItems.length" class="empty">
          <text class="empty-icon">🔍</text>
          <text>{{ emptyText }}</text>
        </view>

        <view v-if="loading" class="feed-loading">
          <text class="spinner" />
          <text>加载中…</text>
        </view>

        <view v-else-if="allLoaded && displayItems.length" class="feed-loading">
          <text>没有更多了</text>
        </view>
      </view>
    </view>

    <!-- 公告详情弹窗 -->
    <view v-if="activePlacard" class="placard-mask" @click="closePlacard">
      <view class="placard-dialog" @click.stop>
        <view class="placard-dialog-head">
          <text class="placard-dialog-tag" :style="placardTagStyle(activePlacard.type)">
            {{ placardTypeOf(activePlacard.type).label }}
          </text>
          <text class="placard-dialog-title">{{ activePlacard.title }}</text>
          <text class="bi bi-x-lg placard-dialog-close" @click="closePlacard" />
        </view>
        <scroll-view scroll-y class="placard-dialog-body">
          <rich-text v-if="activePlacard.content" :nodes="activePlacard.content" />
          <text v-else class="text-muted">暂无正文</text>
        </scroll-view>
        <view class="placard-dialog-foot">
          <text class="placard-dialog-date">{{ formatDateTime(activePlacard.create_time) }}</text>
        </view>
      </view>
    </view>

    <AppTabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, reactive, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import MomentCard from '@/components/MomentCard.vue'
import { getArticles } from '@/api/article'
import { getMoments } from '@/api/moments'
import { getPlacards, placardTypeOf, type PlacardItem } from '@/api/placard'
import type { ArticleItem, MomentItem } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { formatDateTime, stripHtml, truncate } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 首页（对齐 Mellow 主题 views/home/Index.vue）
 *
 * 结构与网页端一致：顶栏 → 公告轮播 → 发布动态入口 → 「发现」（全部 / 文章 / 动态）
 * → 文章与动态按时间混排的卡片流。
 *
 * 数据都来自真实接口：placard/all、article/all、moments/all；没有分页器，
 * 改用移动端更自然的「触底加载更多」（onReachBottom）。
 */

type FilterKey = 'all' | 'article' | 'moment'
type FeedType = 'article' | 'moment'

interface FeedItem {
  key: string
  type: FeedType
  time: number
  top: number
  data: ArticleItem | MomentItem
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'moment', label: '动态' }
]

/** 每次向单个来源补页的条数 */
const PAGE_SIZE = 10

const userStore = useUserStore()

const filter = ref<FilterKey>('all')
const items = ref<FeedItem[]>([])
const loading = ref(false)
const counts = reactive({ article: 0, moment: 0 })
/** 两个来源各自的下一页页码 */
const cursors = reactive({ article: 1, moment: 1 })
/** 某个来源是否已经取尽 */
const exhausted = reactive({ article: false, moment: false })

/* ---------------- 公告 ---------------- */
const placards = ref<PlacardItem[]>([])
const placardIndex = ref(0)
let placardTimer: ReturnType<typeof setInterval> | null = null
const activePlacard = ref<PlacardItem | null>(null)

const currentPlacard = computed<PlacardItem>(() => placards.value[placardIndex.value] || { id: 0, title: '' })
const currentContent = computed(() => truncate(stripHtml(currentPlacard.value.content), 40))

function placardTagStyle(type?: string) {
  const meta = placardTypeOf(type)
  return { color: meta.color, background: meta.bg }
}

function goTo(index: number): void {
  placardIndex.value = index
  restartPlacardTimer()
}

function openPlacard(item: PlacardItem): void {
  if (!item?.id) return
  activePlacard.value = item
}

function closePlacard(): void {
  activePlacard.value = null
}

function startPlacardTimer(): void {
  stopPlacardTimer()
  if (placards.value.length <= 1) return
  placardTimer = setInterval(() => {
    placardIndex.value = (placardIndex.value + 1) % placards.value.length
  }, 5000)
}

function restartPlacardTimer(): void {
  startPlacardTimer()
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

/* ---------------- 混合信息流 ---------------- */

/** 时间戳：兼容秒 / 毫秒 / 日期字符串 */
function toTime(value?: string | number | null): number {
  if (!value) return 0
  const num = Number(value)
  if (Number.isFinite(num) && num > 0) return num < 1e12 ? num * 1000 : num
  const time = Date.parse(String(value).replace(/-/g, '/'))
  return Number.isNaN(time) ? 0 : time
}

/** 排序：置顶优先，其次按发布时间倒序 */
function sortPool(list: FeedItem[]): FeedItem[] {
  return [...list].sort((a, b) => {
    if (a.top !== b.top) return b.top - a.top
    return b.time - a.time
  })
}

const displayItems = computed(() => {
  if (filter.value === 'all') return items.value
  return items.value.filter((item) => item.type === filter.value)
})

const allLoaded = computed(() => exhausted.article && exhausted.moment)

const summaryText = computed(() => {
  const total = filter.value === 'article'
    ? counts.article
    : filter.value === 'moment'
      ? counts.moment
      : counts.article + counts.moment
  if (!total) return '暂无内容'
  const parts: string[] = []
  if (filter.value !== 'moment') parts.push(`${counts.article} 篇文章`)
  if (filter.value !== 'article') parts.push(`${counts.moment} 条动态`)
  return `共 ${parts.join(' · ')}`
})

const emptyText = computed(() => {
  if (filter.value === 'article') return '还没有文章，稍后再来看看'
  if (filter.value === 'moment') return '还没有动态，来发第一条吧'
  return '还没有内容，稍后再来看看'
})

/** 需要补页的来源（按当前筛选决定，全部时两个都补） */
function sources(): FeedType[] {
  if (filter.value === 'article') return ['article']
  if (filter.value === 'moment') return ['moment']
  return ['article', 'moment']
}

async function fetchArticlePage(page: number): Promise<void> {
  if (exhausted.article) return
  try {
    const result = await getArticles({ page, limit: PAGE_SIZE, order: 'top desc, create_time desc' })
    const list = Array.isArray(result?.data) ? (result.data as ArticleItem[]) : []
    counts.article = Number(result?.count || counts.article || 0)
    list.forEach((article) => {
      items.value.push({
        key: `article-${article.id}`,
        type: 'article',
        time: toTime(article.publish_time || article.create_time),
        top: Number(article.top || 0),
        data: article
      })
    })
    cursors.article = page + 1
    if (list.length < PAGE_SIZE) exhausted.article = true
  } catch {
    exhausted.article = true
  }
}

async function fetchMomentPage(page: number): Promise<void> {
  if (exhausted.moment) return
  try {
    const result = await getMoments({ page, limit: PAGE_SIZE, order: 'top desc, create_time desc' })
    const list = Array.isArray(result?.data) ? (result.data as MomentItem[]) : []
    counts.moment = Number(result?.count || counts.moment || 0)
    list.forEach((moment) => {
      items.value.push({
        key: `moment-${moment.id}`,
        type: 'moment',
        time: toTime(moment.create_time),
        top: Number(moment.top || 0),
        data: moment
      })
    })
    cursors.moment = page + 1
    if (list.length < PAGE_SIZE) exhausted.moment = true
  } catch {
    exhausted.moment = true
  }
}

/** 向后补页：两个来源并行，合并后统一排序 */
async function loadMore(): Promise<void> {
  if (loading.value || allLoaded.value) return
  loading.value = true
  try {
    const tasks: Promise<void>[] = []
    sources().forEach((type) => {
      if (type === 'article') tasks.push(fetchArticlePage(cursors.article))
      else tasks.push(fetchMomentPage(cursors.moment))
    })
    await Promise.all(tasks)
    items.value = sortPool(items.value)
  } finally {
    loading.value = false
  }
}

/** 切筛选：池子里当前类型不足一页时才补 */
function switchFilter(key: FilterKey): void {
  if (filter.value === key) return
  filter.value = key
  const currentCount = displayItems.value.length
  if (currentCount < PAGE_SIZE) loadMore()
}

/* ---------------- 跳转 ---------------- */
function openArticle(id: number): void {
  uni.navigateTo({ url: `/pages/article/detail?id=${id}` })
}

function openMoment(id: number): void {
  uni.navigateTo({ url: `/pages/moment/detail?id=${id}` })
}

function goSearch(): void {
  uni.navigateTo({ url: '/pages/search/index' })
}

function goMine(): void {
  uni.reLaunch({ url: '/pages/mine/index' })
}

function openCompose(): void {
  toast('发布功能开发中')
}

/* ---------------- 生命周期 ---------------- */
onLoad(() => {
  loadPlacards()
  loadMore()
})

onShow(() => {
  // 从其它页面返回时重启轮播（定时器在后台仍会跑，但避免残留多个）
  if (placards.value.length > 1) startPlacardTimer()
})

onPullDownRefresh(async () => {
  items.value = []
  cursors.article = 1
  cursors.moment = 1
  exhausted.article = false
  exhausted.moment = false
  counts.article = 0
  counts.moment = 0
  await Promise.all([loadPlacards(), loadMore()])
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  loadMore()
})

onUnmounted(stopPlacardTimer)
</script>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: var(--bg);
  background-image: var(--gradient-page);
  padding-bottom: calc(76px + env(safe-area-inset-bottom));
}

/* ---------------- 顶栏 ---------------- */
.mobile-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 52px;
  padding: 0 14px;
  padding-top: env(safe-area-inset-top);
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-soft);
}

.mobile-brand-text {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: var(--text);
}

.mobile-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mobile-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--text-soft);
  font-size: 16px;
}

.mobile-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--bg-muted);
}

.home {
  padding: 14px 14px 0;
}

/* ---------------- 公告 ---------------- */
.placard-card {
  padding: 14px 16px;
  margin-bottom: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.placard-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.placard-head .bi {
  color: var(--primary);
}

.placard-carousel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 22px;
}

.placard-link {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.6;
}

.placard-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--primary);
}

.placard-name {
  flex-shrink: 0;
  font-weight: 500;
}

.placard-content {
  flex: 1;
  min-width: 0;
  color: var(--text-muted);
}

.placard-dots {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 4px;
}

.placard-dot-btn {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  opacity: 0.4;
}

.placard-dot-btn.is-active {
  opacity: 1;
  background: var(--primary);
}

/* ---------------- 发布入口条 ---------------- */
.compose {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: 14px;
}

.compose-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-muted);
}

.compose-placeholder {
  flex: 1;
  min-width: 0;
}

.compose-guest-icon {
  font-size: 24px;
  color: var(--text-light);
}

.compose-guest-text {
  flex: 1;
  min-width: 0;
}

/* ---------------- 版块标题 ---------------- */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
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

/* 类型筛选：胶囊分段控件 */
.feed-filter {
  display: flex;
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

.feed-summary {
  display: block;
  margin: -6px 0 14px;
  font-size: 12px;
  color: var(--text-muted);
}

.feed {
  display: flex;
  flex-direction: column;
}

.feed-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-muted);
}

.empty {
  padding: 48px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.empty-icon {
  display: block;
  margin-bottom: 8px;
  font-size: 36px;
  opacity: 0.5;
}

.text-muted {
  color: var(--text-muted);
}

/* ---------------- 公告详情弹窗 ---------------- */
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
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
}

.placard-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 70vh;
  overflow: hidden;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
}

.placard-dialog-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}

.placard-dialog-tag {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 1px 8px;
  font-size: 11px;
  line-height: 1.6;
  border-radius: 999px;
  white-space: nowrap;
}

.placard-dialog-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.placard-dialog-close {
  flex-shrink: 0;
  padding: 2px 4px;
  color: var(--text-muted);
  font-size: 15px;
}

.placard-dialog-body {
  flex: 1;
  max-height: 46vh;
  padding: 16px 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-soft);
  word-break: break-word;
}

.placard-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}

.placard-dialog-date {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
