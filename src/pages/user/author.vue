<template>
  <view class="min-h-screen bg-page">
    <!-- 头部 -->
    <view class="author-head">
      <view class="flex items-center">
        <view class="flex-center h-8 w-8 rounded-full bg-white/25" @click="back">
          <wd-icon name="arrow-left1" :size="17" color="#ffffff" />
        </view>
        <text class="ml-2 text-15px text-white font-medium">主页</text>
      </view>

      <view class="mt-4 flex items-center gap-3">
        <image class="h-14 w-14 flex-none rounded-full bg-white/25" :src="profile.avatar" mode="aspectFill" />
        <view class="min-w-0 flex-1">
          <view class="flex items-center">
            <text class="max-w-40 text-18px text-white font-semibold ellipsis">{{ profile.nickname }}</text>
            <TitleBadge :payload="titlePayload" :text="titleText" />
          </view>
          <text class="mt-1 block text-12px text-white/80 ellipsis">{{ profile.description || '这个人很懒，什么都没写' }}</text>
        </view>

        <view
          v-if="canFollow"
          class="flex-none rounded-full bg-white px-4 py-2"
          @click="toggleFollow"
        >
          <text class="text-12px font-medium" :class="relation.following ? 'text-sub' : 'text-primary'">
            {{ followLabel }}
          </text>
        </view>
      </view>
    </view>

    <!-- 社交数字 -->
    <view class="mx-3 -mt-6 flex rounded-3 bg-white py-4 shadow-sm">
      <view class="flex-1 flex-col-center" @click="openFollowList('following')">
        <text class="text-16px text-main font-semibold">{{ statsText.follow }}</text>
        <text class="mt-1 text-11px text-weak">关注</text>
      </view>
      <view class="flex-1 flex-col-center" @click="openFollowList('followers')">
        <text class="text-16px text-main font-semibold">{{ statsText.fans }}</text>
        <text class="mt-1 text-11px text-weak">粉丝</text>
      </view>
      <view class="flex-1 flex-col-center">
        <text class="text-16px text-main font-semibold">{{ statsText.moment }}</text>
        <text class="mt-1 text-11px text-weak">动态</text>
      </view>
      <view class="flex-1 flex-col-center">
        <text class="text-16px text-main font-semibold">{{ statsText.article }}</text>
        <text class="mt-1 text-11px text-weak">文章</text>
      </view>
      <view class="flex-1 flex-col-center">
        <text class="text-16px text-main font-semibold">{{ statsText.likes }}</text>
        <text class="mt-1 text-11px text-weak">获赞</text>
      </view>
    </view>

    <!-- 动态 / 文章 -->
    <view class="mt-3 px-3 pb-30">
      <view class="flex items-center gap-5 px-1">
        <view v-for="item in TABS" :key="item.key" @click="switchTab(item.key)">
          <text class="text-15px" :class="tab === item.key ? 'text-main font-semibold' : 'text-sub'">
            {{ item.label }}
          </text>
          <view v-if="tab === item.key" class="mt-1 h-1 w-5 rounded-full bg-primary" />
        </view>
      </view>

      <view class="mt-3">
        <template v-if="tab === 'moment'">
          <MomentCard v-for="item in momentView.items.value" :key="item.id" :moment="item" @click="openMoment(item.id)" />
          <view v-if="momentView.empty.value" class="py-16 text-center">
            <text class="text-13px text-weak">还没有发布动态</text>
          </view>
        </template>

        <template v-else>
          <ArticleCard v-for="item in articleView.items.value" :key="item.id" :article="item" @click="openArticle(item.id)" />
          <view v-if="articleView.empty.value" class="py-16 text-center">
            <text class="text-13px text-weak">还没有发布文章</text>
          </view>
        </template>

        <view class="py-3 text-center">
          <text class="text-12px text-primary">{{ currentLoading ? '加载中…' : currentFinished ? '没有更多了' : '加载更多' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import ArticleCard from '@/components/ArticleCard.vue'
import MomentCard from '@/components/MomentCard.vue'
import TitleBadge from '@/components/TitleBadge.vue'
import { getArticles } from '@/api/article'
import { getMoments } from '@/api/moments'
import { follow, getRelation, getSocialStats, getUserInfo, unfollow } from '@/api/follow'
import type { ArticleItem, AuthorInfo, MomentItem, SocialStats } from '@/api/types'
import { usePagedList, type PagedList } from '@/composables/usePagedList'
import { useUserStore } from '@/stores/user'
import { pickUserTitlePayload, pickUserTitleText } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 作者主页
 *
 * - 社交数字走 user-follows/stats（无需登录，后端缓存 5 分钟）
 * - 关注按钮按 user-follows/relation 的四态展示：关注 / 已关注 / 回关 / 互关
 * - 动态与文章都用 `where={uid}` 复用列表接口（后端对非管理员会强制只返回已审核公开内容）
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

function openMoment(id: number): void {
  uni.navigateTo({ url: `/pages/moment/detail?id=${id}` })
}

function openArticle(id: number): void {
  uni.navigateTo({ url: `/pages/article/detail?id=${id}` })
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
.author-head {
  padding: calc(40rpx + env(safe-area-inset-top)) 32rpx 80rpx;
  background: linear-gradient(135deg, $inis-primary-light, $inis-primary-dark);
}
</style>
