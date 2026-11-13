<template>
  <view class="author-page">
    <!-- 顶栏：只有返回（小红书的主页顶部极简） -->
    <view class="author-topbar">
      <view class="topbar-btn" @click="back">
        <text class="bi bi-chevron-left" />
      </view>
      <text class="topbar-title">主页</text>
      <view class="topbar-btn is-placeholder" />
    </view>

    <!-- 资料卡 -->
    <view class="profile">
      <view class="profile-row">
        <image v-if="profile.avatar" class="profile-avatar" :src="profile.avatar" mode="aspectFill" />
        <view v-else class="profile-avatar profile-avatar-empty">
          <text class="bi bi-person-fill" />
        </view>

        <view class="profile-main">
          <view class="profile-name">
            <text class="profile-nickname ellipsis">{{ profile.nickname }}</text>
            <TitleBadge :payload="titlePayload" :text="titleText" />
          </view>
          <text class="profile-id">INIS 号：{{ profile.id }}</text>
        </view>

        <view
          v-if="canFollow"
          class="xhs-btn profile-btn"
          :class="{ 'is-plain': relation.following }"
          @click="toggleFollow"
        >
          {{ followLabel }}
        </view>
      </view>

      <text class="profile-bio">{{ profile.description || '这个人很懒，什么都没写' }}</text>

      <view class="profile-stats">
        <view class="profile-stat" @click="openFollowList('following')">
          <text class="stat-num">{{ formatCount(statsText.follow) }}</text>
          <text class="stat-label">关注</text>
        </view>
        <view class="profile-stat" @click="openFollowList('followers')">
          <text class="stat-num">{{ formatCount(statsText.fans) }}</text>
          <text class="stat-label">粉丝</text>
        </view>
        <view class="profile-stat">
          <text class="stat-num">{{ formatCount(statsText.likes) }}</text>
          <text class="stat-label">获赞</text>
        </view>
      </view>
    </view>

    <!-- 动态 / 文章 -->
    <view class="author-tabs">
      <view
        v-for="item in TABS"
        :key="item.key"
        class="author-tab"
        :class="{ 'is-active': tab === item.key }"
        @click="switchTab(item.key)"
      >
        <text>{{ item.label }}</text>
        <text class="author-tab-count">{{ item.key === 'moment' ? statsText.moment : statsText.article }}</text>
        <view class="author-tab-line" />
      </view>
    </view>

    <NoteWaterfall
      :notes="notes"
      :loading="currentLoading"
      :finished="currentFinished"
      :empty-text="emptyText"
      @click="onNoteClick"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import NoteWaterfall from '@/components/NoteWaterfall.vue'
import TitleBadge from '@/components/TitleBadge.vue'
import { getArticles } from '@/api/article'
import { getMoments } from '@/api/moments'
import { follow, getRelation, getSocialStats, getUserInfo, unfollow } from '@/api/follow'
import type { ArticleItem, AuthorInfo, MomentItem, SocialStats } from '@/api/types'
import { articleToNote, momentToNote } from '@/composables/useNotes'
import { usePagedList, type PagedList } from '@/composables/usePagedList'
import { useUserStore } from '@/stores/user'
import { formatCount, pickUserTitlePayload, pickUserTitleText } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 作者主页（小红书式版式，与「我的」页同一套结构）
 *
 * - 社交数字走 user-follows/stats（无需登录，后端缓存 5 分钟）
 * - 关注按钮按 user-follows/relation 的四态展示：关注 / 已关注 / 回关 / 互关
 * - 动态与文章都用 `where={uid}` 复用列表接口，渲染成统一的双列笔记流
 */
type TabKey = 'moment' | 'article'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'moment', label: '动态' },
  { key: 'article', label: '文章' }
]

const userStore = useUserStore()

const uid = ref(0)
const tab = ref<TabKey>('moment')
const following = ref(false)
const follower = ref(false)
const mutual = ref(false)
const followBusy = ref(false)
const stats = ref<SocialStats | null>(null)
const user = ref<AuthorInfo | null>(null)

const momentList = usePagedList<MomentItem>(
  (page, limit) => getMoments({ page, limit, where: { uid: uid.value } }),
  10
)
const articleList = usePagedList<ArticleItem>(
  (page, limit) => getArticles({ page, limit, where: { uid: uid.value } }),
  10
)

function toView<T>(list: PagedList<T>) {
  return {
    items: computed(() => list.items.value),
    empty: computed(() => list.isEmpty.value),
    loading: computed(() => list.loading.value),
    finished: computed(() => list.finished.value)
  }
}

const momentView = toView(momentList)
const articleView = toView(articleList)

const currentLoading = computed(() =>
  tab.value === 'moment' ? momentView.loading.value : articleView.loading.value
)
const currentFinished = computed(() =>
  tab.value === 'moment' ? momentView.finished.value : articleView.finished.value
)

const emptyText = computed(() => (tab.value === 'moment' ? '还没有发布动态' : '还没有发布文章'))

/** 列表项 → 笔记：动态与文章在小红书式界面里是同一种卡片 */
const notes = computed(() => {
  if (tab.value === 'moment') return (momentView.items.value as MomentItem[]).map(momentToNote)
  return (articleView.items.value as ArticleItem[]).map(articleToNote)
})

const profile = computed(() => {
  const info: AuthorInfo | null = user.value
  return {
    id: Number(info?.id || uid.value),
    nickname: info?.nickname || '匿名用户',
    avatar: info?.avatar || '',
    description: info?.description || ''
  }
})

const titlePayload = computed(() => pickUserTitlePayload(user.value))
const titleText = computed(() => pickUserTitleText(user.value))

const myUid = computed(() => Number(userStore.user?.id || 0))
const canFollow = computed(() => profile.value.id > 0 && profile.value.id !== myUid.value)

const relation = computed(() => ({ following: following.value, follower: follower.value, mutual: mutual.value }))

/** 四态文案：未关注 → 关注；已关注 → 已关注；对方关注我 → 回关；互相关注 → 互关 */
const followLabel = computed(() => {
  if (!following.value) return follower.value ? '回关' : '关注'
  return mutual.value ? '互关' : '已关注'
})

const statsText = computed(() => ({
  follow: Number(stats.value?.follow || 0),
  fans: Number(stats.value?.fans || 0),
  moment: Number(stats.value?.moment || 0),
  article: Number(stats.value?.article || 0),
  likes: Number(stats.value?.likes || 0)
}))

async function loadProfile(): Promise<void> {
  try {
    const info = await getUserInfo(uid.value)
    user.value = info || null
  } catch {
    user.value = null
  }
}

async function loadStats(): Promise<void> {
  try {
    stats.value = await getSocialStats(uid.value)
  } catch {
    stats.value = null
  }
}

async function loadRelation(): Promise<void> {
  if (!canFollow.value || !userStore.isLogin) return
  try {
    const result = await getRelation(profile.value.id)
    following.value = Boolean(result?.is_following)
    follower.value = Boolean(result?.is_follower)
    mutual.value = Boolean(result?.mutual)
  } catch {
    // 忽略：拿不到就按未关注展示
  }
}

async function toggleFollow(): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (followBusy.value || !canFollow.value) return

  followBusy.value = true
  const wasFollowing = following.value
  following.value = !wasFollowing
  if (!following.value) mutual.value = false

  try {
    if (wasFollowing) {
      await unfollow(profile.value.id)
      toast('已取消关注', 'success')
    } else {
      await follow(profile.value.id)
      // 关注后粉丝 / 关注数字会变，刷新一次（后端 stats 缓存 5 分钟，可能有极短延迟）
      mutual.value = follower.value
      toast('已关注', 'success')
    }
    loadStats()
  } catch {
    following.value = wasFollowing
  } finally {
    followBusy.value = false
  }
}

function switchTab(key: TabKey): void {
  if (tab.value === key) return
  tab.value = key
  if (key === 'moment' && !momentList.items.value.length) momentList.refresh()
  if (key === 'article' && !articleList.items.value.length) articleList.refresh()
}

function openFollowList(type: 'following' | 'followers'): void {
  uni.navigateTo({ url: `/pages/user/follow?uid=${profile.value.id}&type=${type}` })
}

function onNoteClick(id: number, type: 'article' | 'moment'): void {
  const url = type === 'article' ? `/pages/article/detail?id=${id}` : `/pages/moment/detail?id=${id}`
  uni.navigateTo({ url })
}

function back(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else uni.reLaunch({ url: '/pages/index/index' })
}

onLoad((options) => {
  uid.value = Number(options?.id || 0)
  if (!uid.value) {
    toast('缺少用户 id')
    return
  }
  loadProfile()
  loadStats()
  loadRelation()
  momentList.refresh()
})

onPullDownRefresh(async () => {
  const tasks: Promise<unknown>[] = [loadProfile(), loadStats(), loadRelation()]
  tasks.push(tab.value === 'moment' ? momentList.refresh() : articleList.refresh())
  await Promise.all(tasks)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (tab.value === 'moment') momentList.loadMore()
  else articleList.loadMore()
})
</script>

<style lang="scss" scoped>
.author-page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 20px;
}

/* 顶栏 */
.author-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  padding-top: calc(8px + env(safe-area-inset-top));
  background: var(--bg);
}

.topbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 17px;
  color: var(--text);
}

.topbar-btn.is-placeholder {
  visibility: hidden;
}

.topbar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

/* 资料卡：与「我的」页同一套排版 */
.profile {
  padding: 4px 16px 12px;
}

.profile-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--bg-muted);
  border: 2px solid #fff;
}

.profile-avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: var(--text-light);
}

.profile-main {
  flex: 1;
  min-width: 0;
}

.profile-name {
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-nickname {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.profile-id {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.profile-btn {
  flex-shrink: 0;
  height: 28px;
  padding: 0 14px;
  font-size: 12px;
}

.profile-bio {
  display: block;
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-soft);
}

.profile-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 12px;
}

.profile-stat {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-num {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
}

/* tab */
.author-tabs {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 34px;
  padding: 10px 0 0;
  background: var(--bg);
}

.author-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-bottom: 5px;
  font-size: 14px;
  color: var(--text-muted);
  border-bottom: 3px solid transparent;
}

.author-tab.is-active {
  font-weight: 700;
  color: var(--text);
  border-bottom-color: var(--primary);
}

.author-tab-count {
  font-size: 11px;
  color: var(--text-light);
}

.author-tab-line {
  display: none;
}

.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
