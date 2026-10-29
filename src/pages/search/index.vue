<template>
  <view class="min-h-screen bg-page">
    <!-- 搜索栏 -->
    <view class="search-head">
      <view class="flex items-center gap-2 px-3 pt-2 pb-3">
        <view class="flex-center h-8 w-8 flex-none" @click="back">
          <wd-icon name="arrow-left1" :size="18" color="#4b5563" />
        </view>

        <view class="flex flex-1 items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
          <wd-icon name="search" :size="16" color="#9ca3af" />
          <input
            v-model="keyword"
            class="min-w-0 flex-1 text-13px text-main"
            confirm-type="search"
            :focus="autoFocus"
            placeholder="搜索文章、动态、用户"
            @confirm="doSearch(true)"
          />
          <view v-if="keyword" class="px-1" @click="resetKeyword">
            <wd-icon name="close" :size="14" color="#9ca3af" />
          </view>
        </view>

        <text class="flex-none text-13px text-primary" @click="doSearch(true)">搜索</text>
      </view>

      <!-- 分类（仅在有搜索结果时展示） -->
      <scroll-view v-if="searched" scroll-x class="tab-scroll px-3 pb-2">
        <view v-for="item in SCOPES" :key="item.key" class="mr-5 inline-block" @click="switchScope(item.key)">
          <text class="text-14px" :class="scope === item.key ? 'text-main font-semibold' : 'text-sub'">
            {{ item.label }}
          </text>
          <view v-if="scope === item.key" class="mx-auto mt-1 h-1 w-4 rounded-full bg-primary" />
        </view>
      </scroll-view>
    </view>

    <view class="px-3 pt-3 pb-30">
      <!-- 未搜索：历史记录 + 提示 -->
      <template v-if="!searched">
        <view v-if="history.length" class="rounded-3 bg-white p-4">
          <view class="flex items-center">
            <text class="text-14px text-main font-semibold">搜索历史</text>
            <text class="ml-auto text-12px text-weak" @click="clearHistory">清空</text>
          </view>
          <view class="mt-3 flex flex-wrap gap-2">
            <view
              v-for="item in history"
              :key="item"
              class="rounded-full bg-gray-100 px-3 py-1"
              @click="useHistory(item)"
            >
              <text class="text-12px text-sub ellipsis">{{ item }}</text>
            </view>
          </view>
        </view>

        <view class="mt-3 rounded-3 bg-white p-4">
          <text class="text-13px text-sub">输入关键词后回车即可搜索。</text>
          <text class="mt-1 block text-12px text-weak">
            支持文章、动态、用户、话题、页面、友链；结果中的关键词会高亮显示。
          </text>
        </view>
      </template>

      <template v-else>
        <view v-if="loading && !hasResult" class="py-20 text-center">
          <text class="text-12px text-weak">搜索中…</text>
        </view>

        <view v-else-if="!hasResult" class="py-20 text-center">
          <text class="text-13px text-sub">没有找到「{{ lastKeyword }}」相关内容</text>
        </view>

        <!-- 综合：按类型分区，每区可跳到该类型的完整结果 -->
        <template v-else-if="scope === 'all'">
          <view v-for="group in GROUP_META" :key="group.key">
            <view v-if="groupItems(group.key).length" class="mb-3 rounded-3 bg-white p-4">
              <view class="flex items-center">
                <text class="text-14px text-main font-semibold">{{ group.label }}</text>
                <text class="ml-2 text-11px text-weak">{{ groupCount(group.key) }} 条</text>
                <text class="ml-auto text-12px text-primary" @click="switchScope(group.key)">查看全部</text>
              </view>

              <view
                v-for="(item, index) in groupItems(group.key)"
                :key="item.id"
                class="mt-3 flex items-start gap-2"
                :class="{ 'border-t border-line pt-3': index > 0 }"
                @click="openItem(group.key, item)"
              >
                <rich-text class="min-w-0 flex-1 text-13px text-main leading-normal" :nodes="primaryHtml(group.key, item)" />
                <wd-icon name="chevron-right" :size="14" color="#c0c4cc" />
              </view>
            </view>
          </view>
        </template>

        <!-- 单类型结果 -->
        <template v-else>
          <view class="rounded-3 bg-white px-4">
            <view
              v-for="(item, index) in list"
              :key="item.id"
              class="py-3"
              :class="{ 'border-t border-line': index > 0 }"
              @click="openItem(scope, item)"
            >
              <!-- 文章：封面 + 标题 + 摘要 -->
              <template v-if="scope === 'article'">
                <view class="flex items-start gap-3">
                  <image
                    v-if="coverOf(item)"
                    class="h-18 w-24 flex-none rounded-2 bg-gray-100"
                    :src="coverOf(item)"
                    mode="aspectFill"
                  />
                  <view class="min-w-0 flex-1">
                    <rich-text class="text-15px text-main font-medium leading-snug" :nodes="highlightHtml(item.title)" />
                    <rich-text
                      v-if="summaryOf(item)"
                      class="mt-1 text-12px text-sub leading-snug"
                      :nodes="summaryOf(item)"
                    />
                  </view>
                </view>
                <view class="mt-2 flex items-center gap-3">
                  <text class="text-11px text-weak">{{ formatTime(item.create_time) }}</text>
                  <text class="text-11px text-weak">{{ formatCount(item.views) }} 阅读</text>
                </view>
              </template>

              <!-- 页面：标题 + 正文片段 + key -->
              <template v-else-if="scope === 'pages'">
                <rich-text class="text-15px text-main font-medium leading-snug" :nodes="highlightHtml(item.title)" />
                <rich-text
                  v-if="item.snippet"
                  class="mt-1 text-12px text-sub leading-snug"
                  :nodes="highlightHtml(item.snippet)"
                />
                <view class="mt-2 flex items-center gap-2">
                  <text class="rounded-2 bg-gray-100 px-2 py-1 text-10px text-weak">/{{ item.key }}</text>
                  <text class="text-11px text-weak">{{ formatCount(item.views) }} 阅读</text>
                </view>
              </template>

              <!-- 话题 -->
              <template v-else-if="scope === 'tags'">
                <view class="flex items-center gap-2">
                  <image v-if="item.avatar" class="h-9 w-9 flex-none rounded-2 bg-gray-100" :src="item.avatar" mode="aspectFill" />
                  <view class="min-w-0 flex-1">
                    <rich-text class="text-14px text-main font-medium" :nodes="highlightHtml(`#${item.name || ''}`)" />
                    <rich-text
                      v-if="item.description"
                      class="mt-1 text-12px text-sub leading-snug"
                      :nodes="highlightHtml(item.description)"
                    />
                  </view>
                </view>
              </template>

              <!-- 用户 -->
              <template v-else-if="scope === 'users'">
                <view class="flex items-center gap-2">
                  <image class="h-10 w-10 flex-none rounded-full bg-gray-100" :src="item.avatar || ''" mode="aspectFill" />
                  <view class="min-w-0 flex-1">
                    <rich-text class="text-14px text-main font-medium" :nodes="highlightHtml(item.nickname)" />
                    <rich-text
                      v-if="item.description"
                      class="mt-1 text-12px text-sub leading-snug"
                      :nodes="highlightHtml(item.description)"
                    />
                    <text v-if="item.email" class="mt-1 block text-11px text-weak">{{ item.email }}</text>
                  </view>
                </view>
              </template>

              <!-- 友链 -->
              <template v-else-if="scope === 'links'">
                <view class="flex items-center gap-2">
                  <image v-if="item.avatar" class="h-9 w-9 flex-none rounded-2 bg-gray-100" :src="item.avatar" mode="aspectFill" />
                  <view class="min-w-0 flex-1">
                    <rich-text class="text-14px text-main font-medium" :nodes="highlightHtml(item.nickname)" />
                    <rich-text
                      v-if="item.description"
                      class="mt-1 text-12px text-sub leading-snug"
                      :nodes="highlightHtml(item.description)"
                    />
                    <text class="mt-1 block text-11px text-weak ellipsis">{{ item.url }}</text>
                  </view>
                </view>
              </template>

              <!-- 动态 -->
              <template v-else>
                <view class="flex items-start gap-3">
                  <image
                    v-if="coverOf(item)"
                    class="h-18 w-18 flex-none rounded-2 bg-gray-100"
                    :src="coverOf(item)"
                    mode="aspectFill"
                  />
                  <view class="min-w-0 flex-1">
                    <rich-text class="text-14px text-main leading-snug" :nodes="highlightHtml(item.content)" />
                    <view class="mt-1 flex items-center gap-2">
                      <text v-if="item.location" class="text-11px text-weak">{{ item.location }}</text>
                      <text class="text-11px text-weak">{{ formatTime(item.create_time) }}</text>
                    </view>
                  </view>
                </view>
              </template>
            </view>
          </view>

          <view v-if="list.length" class="py-3 text-center" @click="doSearch(false)">
            <text class="text-12px text-primary">{{ loading ? '加载中…' : finished ? '没有更多了' : '加载更多' }}</text>
          </view>
        </template>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import {
  searchAll,
  searchBy,
  type SearchAllResult,
  type SearchScope
} from '@/api/search'
import { clearSearchHistory, getSearchHistory, pushSearchHistory } from '@/utils/storage'
import { highlightHtml } from '@/utils/html'
import { firstImage, formatCount, formatTime } from '@/utils/helper'
import { toast } from '@/utils/toast'

/**
 * 搜索页
 *
 * - 综合（search/all）：后端把 limit 均分给 6 种类型，各类型只返回少量结果，
 *   所以每个分区都提供「查看全部」切到单类型搜索
 * - 单类型（search/{scope}）：正常分页，触底 / 点「加载更多」继续
 * - 关键词高亮：后端返回 `<mark>`，小程序 rich-text 不认这个标签，
 *   统一用 utils/html.ts 的 highlightHtml 转成带内联样式的 span
 */
type ScopeKey = 'all' | SearchScope

const SCOPES: { key: ScopeKey; label: string }[] = [
  { key: 'all', label: '综合' },
  { key: 'article', label: '文章' },
  { key: 'moments', label: '动态' },
  { key: 'users', label: '用户' },
  { key: 'tags', label: '话题' },
  { key: 'pages', label: '页面' },
  { key: 'links', label: '友链' }
]

const GROUP_META: { key: SearchScope; label: string }[] = [
  { key: 'article', label: '文章' },
  { key: 'moments', label: '动态' },
  { key: 'users', label: '用户' },
  { key: 'tags', label: '话题' },
  { key: 'pages', label: '页面' },
  { key: 'links', label: '友链' }
]

const PAGE_SIZE = 10

const keyword = ref('')
const lastKeyword = ref('')
const scope = ref<ScopeKey>('all')
const loading = ref(false)
const finished = ref(false)
const searched = ref(false)
const autoFocus = ref(false)

const page = ref(0)
const list = ref<any[]>([])
const groups = ref<SearchAllResult | null>(null)

const history = ref<string[]>(getSearchHistory())

/** 当前 scope 下是否有结果 */
const hasResult = computed(() => {
  if (scope.value === 'all') return GROUP_META.some((group) => groupItems(group.key).length > 0)
  return list.value.length > 0
})

function groupItems(key: SearchScope): any[] {
  const group = groups.value?.[key]
  return Array.isArray(group?.data) ? group.data : []
}

function groupCount(key: SearchScope): number {
  return Number(groups.value?.[key]?.count || 0)
}

/** 文章 / 动态的封面取第一张图 */
function coverOf(item: any): string {
  return firstImage(item?.covers || item?.images)
}

/** 文章摘要：abstract 为空时退化成 snippet（后端从正文截取的高亮片段） */
function summaryOf(item: any): string {
  const raw = item?.abstract || item?.snippet || ''
  return raw ? highlightHtml(raw) : ''
}

/** 综合视图里每类只展示一行主信息 */
function primaryHtml(key: SearchScope, item: any): string {
  switch (key) {
    case 'article':
      return highlightHtml(item.title)
    case 'pages':
      return highlightHtml(item.title || item.key)
    case 'tags':
      return highlightHtml(`#${item.name || ''}`)
    case 'users':
      return highlightHtml(item.nickname)
    case 'links':
      return highlightHtml(item.nickname)
    default:
      return highlightHtml(item.content)
  }
}

async function doSearch(reset = true): Promise<void> {
  const query = keyword.value.trim()
  if (!query) {
    toast('请输入搜索关键词')
    return
  }
  if (loading.value) return
  if (!reset && finished.value) return

  loading.value = true

  if (scope.value === 'all') {
    try {
      const result = await searchAll(query, { page: 1, limit: 12 })
      groups.value = result || null
      list.value = []
      searched.value = true
      finished.value = true
      lastKeyword.value = query
      history.value = pushSearchHistory(query)
    } catch {
      groups.value = null
    } finally {
      loading.value = false
    }
    return
  }

  const target = reset ? 1 : page.value + 1

  try {
    const result = await searchBy(scope.value, query, { page: target, limit: PAGE_SIZE })
    const rows = Array.isArray(result?.data) ? result.data : []

    list.value = reset ? rows : list.value.concat(rows)
    page.value = target
    searched.value = true
    lastKeyword.value = query

    const totalPages = Number(result?.page || 0)
    finished.value = rows.length < PAGE_SIZE || (totalPages > 0 && target >= totalPages)
    history.value = pushSearchHistory(query)
  } catch {
    if (reset) list.value = []
  } finally {
    loading.value = false
  }
}

function switchScope(key: ScopeKey): void {
  if (scope.value === key) return
  scope.value = key
  // 清空上一类结果再搜，避免串类型展示
  list.value = []
  groups.value = null
  page.value = 0
  finished.value = false
  doSearch(true)
}

function useHistory(value: string): void {
  keyword.value = value
  doSearch(true)
}

function resetKeyword(): void {
  keyword.value = ''
  searched.value = false
  list.value = []
  groups.value = null
}

function clearHistory(): void {
  clearSearchHistory()
  history.value = []
}

function openItem(key: SearchScope, item: any): void {
  switch (key) {
    case 'article':
      uni.navigateTo({ url: `/pages/article/detail?id=${item.id}` })
      break
    case 'moments':
      uni.navigateTo({ url: `/pages/moment/detail?id=${item.id}` })
      break
    case 'users':
      uni.navigateTo({ url: `/pages/user/author?id=${item.id}` })
      break
    case 'tags':
      // 移动端没有话题页，退化成「按话题名搜文章」
      keyword.value = String(item.name || '')
      scope.value = 'article'
      list.value = []
      page.value = 0
      finished.value = false
      doSearch(true)
      break
    case 'links':
      copyLink(String(item.url || ''))
      break
    default:
      // 独立页面在 App 内没有渲染容器（页面正文是给网页端用的）
      toast('独立页面请在网页端查看')
  }
}

function copyLink(url: string): void {
  if (!url) return
  uni.setClipboardData({
    data: url,
    success: () => toast('链接已复制', 'success')
  })
}

function back(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else uni.reLaunch({ url: '/pages/index/index' })
}

onLoad((options) => {
  const q = String(options?.q || '').trim()
  const target = String(options?.scope || 'all') as ScopeKey

  if (SCOPES.some((item) => item.key === target)) scope.value = target
  if (q) {
    keyword.value = q
    doSearch(true)
  } else {
    autoFocus.value = true
  }
})

onReachBottom(() => {
  if (scope.value !== 'all' && searched.value) doSearch(false)
})
</script>

<style lang="scss" scoped>
.search-head {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1px solid $inis-border;
  padding-top: env(safe-area-inset-top);
}

.tab-scroll {
  white-space: nowrap;
}
</style>
