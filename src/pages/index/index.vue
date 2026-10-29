<template>
  <view class="min-h-screen bg-page">
    <!-- 顶部固定区：搜索栏 + 分类 Tab -->
    <view class="fixed-head">
      <view class="flex items-center gap-3 px-4 pt-2 pb-2">
        <image class="h-9 w-9 flex-none rounded-full bg-gray-100" :src="userStore.avatar" mode="aspectFill" @click="goMine" />
        <view class="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-3 py-2" @click="goSearch">
          <wd-icon name="search" :size="16" color="#9ca3af" />
          <text class="text-13px text-weak">搜索文章、动态、用户</text>
        </view>
        <view class="relative" @click="goMessage">
          <wd-icon name="notification" :size="22" color="#4b5563" />
          <!-- 未读消息角标：进入页面时拉一次（后端无推送，见 docs/API docs/notification.md） -->
          <view v-if="unread > 0" class="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary" />
        </view>
      </view>

      <scroll-view scroll-x class="tab-scroll px-4 pb-2">
        <view v-for="item in TABS" :key="item.key" class="mr-5 inline-block" @click="switchTab(item.key)">
          <text class="text-15px" :class="tab === item.key ? 'text-main font-semibold' : 'text-sub'">
            {{ item.label }}
          </text>
          <view v-if="tab === item.key" class="mx-auto mt-1 h-1 w-5 rounded-full bg-primary" />
        </view>
      </scroll-view>
    </view>

    <!-- 内容区 -->
    <view class="px-3 pt-3 pb-30">
      <!-- 今日头条卡 -->
      <view class="mb-3 flex rounded-3 bg-white p-3">
        <view class="bg-primary-gradient flex flex-none flex-col items-center justify-center rounded-3 px-3 py-2 text-white">
          <text class="text-11px">今日</text>
          <text class="text-34px font-bold leading-none">{{ today.day }}</text>
          <text class="text-10px">{{ today.month }} {{ today.weekday }}</text>
        </view>
        <view class="ml-3 flex flex-1 flex-col justify-between">
          <view
            v-for="item in headlines"
            :key="item.id"
            class="flex items-center rounded-2 border border-line px-2 py-1"
            @click="openArticle(item.id)"
          >
            <text class="text-12px text-main ellipsis">{{ item.title || '无标题' }}</text>
          </view>
          <view v-if="!headlines.length" class="flex-1 flex items-center text-12px text-weak">暂无内容</view>
        </view>
      </view>

      <!-- 金刚区 -->
      <view class="mb-3 flex rounded-3 bg-white px-2 py-4">
        <view v-for="item in ENTRIES" :key="item.label" class="flex-1 flex-col-center" @click="openEntry(item)">
          <view class="flex-center h-11 w-11 rounded-full" :style="{ background: item.bg }">
            <wd-icon :name="item.icon" :size="22" :color="item.color" />
          </view>
          <text class="mt-2 text-11px text-sub">{{ item.label }}</text>
        </view>
      </view>

      <!-- Feed 流 -->
      <template v-if="tab === 'moment'">
        <MomentCard
          v-for="item in momentView.items.value"
          :key="item.id"
          :moment="item"
          @click="openMoment(item.id)"
        />
        <view v-if="momentView.empty.value" class="py-20 text-center text-13px text-weak">
          <text>还没有动态</text>
        </view>
        <view class="py-4 text-center text-12px text-weak">
          <text>{{ momentStatus }}</text>
        </view>
      </template>

      <template v-else>
        <ArticleCard
          v-for="item in articleView.items.value"
          :key="item.id"
          :article="item"
          @click="openArticle(item.id)"
        />
        <view v-if="articleView.empty.value" class="py-20 text-center text-13px text-weak">
          <text>还没有内容，稍后再来看看</text>
        </view>
        <view class="py-4 text-center text-12px text-weak">
          <text>{{ articleStatus }}</text>
        </view>
      </template>
    </view>

    <AppTabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import MomentCard from '@/components/MomentCard.vue'
import { getArticles } from '@/api/article'
import { getMoments } from '@/api/moments'
import { getUnreadCount } from '@/api/notification'
import type { ArticleItem, MomentItem } from '@/api/types'
import { usePagedList, type PagedList } from '@/composables/usePagedList'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

type TabKey = 'recommend' | 'hot' | 'latest' | 'moment'

/** 分类 Tab：文章区用不同排序，最后一个切到动态流 */
const TABS: { key: TabKey; label: string }[] = [
  { key: 'recommend', label: '推荐' },
  { key: 'hot', label: '热榜' },
  { key: 'latest', label: '最新' },
  { key: 'moment', label: '动态' }
]

const TAB_ORDER: Record<Exclude<TabKey, 'moment'>, string> = {
  recommend: 'top desc, create_time desc',
  hot: 'views desc',
  latest: 'create_time desc'
}

/** 金刚区入口：暫为占位入口，后续接对应频道 */
const ENTRIES = [
  { label: '测试', icon: 'star-filled', color: '#c7482a', bg: 'rgba(199, 72, 42, 0.1)' },
  { label: '测试', icon: 'star-filled', color: '#e6a23c', bg: 'rgba(230, 162, 60, 0.12)' },
  { label: '测试', icon: 'star-filled', color: '#f56c6c', bg: 'rgba(245, 108, 108, 0.12)' },
  { label: '测试', icon: 'star-filled', color: '#409eff', bg: 'rgba(64, 158, 255, 0.12)' },
  { label: '测试', icon: 'star-filled', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' }
]

const userStore = useUserStore()

const tab = ref<TabKey>('recommend')
const articleOrder = ref(TAB_ORDER.recommend)

const articleList = usePagedList<ArticleItem>(
  (page, limit) => getArticles({ page, limit, order: articleOrder.value }),
  10
)
const momentList = usePagedList<MomentItem>((page, limit) => getMoments({ page, limit }), 10)

/** 今日头条：单独取浏览量最高的 3 篇放进横幅卡片 */
const headlines = ref<ArticleItem[]>([])

/** 未读消息数：用于右上角铃铛的红点（后端无推送，进入页面时拉一次） */
const unread = ref(0)

async function loadUnread(): Promise<void> {
  if (!userStore.isLogin) {
    unread.value = 0
    return
  }
  try {
    const result = await getUnreadCount()
    unread.value = Number(result?.count || 0)
  } catch {
    unread.value = 0
  }
}

const today = computed(() => {
  const now = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return {
    day: String(now.getDate()).padStart(2, '0'),
    month: `${now.getFullYear()}年${now.getMonth() + 1}月`,
    weekday: weekdays[now.getDay()]
  }
})

function toView<T>(list: PagedList<T>) {
  return {
    items: computed(() => list.items.value),
    finished: computed(() => list.finished.value),
    loading: computed(() => list.loading.value),
    empty: computed(() => list.isEmpty.value)
  }
}

const articleView = toView(articleList)
const momentView = toView(momentList)

function statusText(view: { loading: { value: boolean }; finished: { value: boolean }; items: { value: unknown[] } }): string {
  if (view.loading.value) return '加载中...'
  if (view.finished.value && view.items.value.length > 0) return '没有更多了'
  return ''
}

const articleStatus = computed(() => statusText(articleView))
const momentStatus = computed(() => statusText(momentView))

function currentList(): PagedList<ArticleItem> | PagedList<MomentItem> {
  return tab.value === 'moment' ? momentList : articleList
}

function switchTab(key: TabKey): void {
  if (tab.value === key) return
  tab.value = key

  if (key === 'moment') {
    if (momentList.items.value.length === 0) momentList.refresh()
    return
  }

  // 文章区的排序变了才重新拉；没变则沿用已有数据
  const order = TAB_ORDER[key]
  if (articleOrder.value !== order) {
    articleOrder.value = order
    articleList.refresh()
  }
}

async function loadHeadlines(): Promise<void> {
  try {
    const result = await getArticles({ page: 1, limit: 3, order: 'views desc' })
    headlines.value = (result?.data || []).slice(0, 3)
  } catch {
    headlines.value = []
  }
}

function openArticle(id: number): void {
  uni.navigateTo({ url: `/pages/article/detail?id=${id}` })
}

function openMoment(id: number): void {
  uni.navigateTo({ url: `/pages/moment/detail?id=${id}` })
}

function openEntry(item: { label: string }): void {
  toast(`${item.label}频道开发中`)
}

function goSearch(): void {
  uni.navigateTo({ url: '/pages/search/index' })
}

function goMessage(): void {
  uni.reLaunch({ url: '/pages/message/index' })
}

function goMine(): void {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  uni.reLaunch({ url: '/pages/mine/index' })
}

onShow(() => {
  // 每次回到首页都刷新未读角标（从消息页读完消息返回时也要变）
  loadUnread()
})

onLoad(() => {
  articleList.refresh()
  loadHeadlines()
})

onPullDownRefresh(async () => {
  await Promise.all([currentList().refresh(), loadHeadlines()])
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  currentList().loadMore()
})
</script>

<style lang="scss" scoped>
/* 顶部吸顶区：页面用自定义导航（pages.json 里 navigationStyle: custom） */
.fixed-head {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1px solid $inis-border;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

/* 分类 Tab 横向滚动：不显示滚动条 */
.tab-scroll {
  white-space: nowrap;
}
</style>
