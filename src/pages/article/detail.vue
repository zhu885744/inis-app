<template>
  <view class="article-page">
    <!-- 顶部导航：返回 / 分享（pages.json 里 navigationStyle: custom） -->
    <view class="nav-bar">
      <view class="nav-btn" @click="back">
        <wd-icon name="arrow-left1" :size="18" color="#1f2937" />
      </view>
      <view class="flex-1" />
      <view class="nav-btn" @click="onShare">
        <wd-icon name="share" :size="18" color="#1f2937" />
      </view>
    </view>

    <view v-if="loading" class="py-24 text-center">
      <text class="text-12px text-weak">加载中…</text>
    </view>

    <view v-else-if="!article" class="py-24 text-center">
      <text class="text-13px text-sub">文章不存在或已被删除</text>
    </view>

    <view v-else class="content-wrap">
      <!-- 封面 -->
      <image
        v-if="cover"
        class="cover"
        :src="cover"
        mode="aspectFill"
        @click="previewCover"
      />

      <!-- 分类 + 置顶徽章 -->
      <view v-if="groupName || isTop" class="chip-row">
        <view v-if="groupName" class="chip" @click="openTopic(groupName)">
          <image v-if="groupAvatar" class="chip-icon" :src="groupAvatar" mode="aspectFill" />
          <text class="chip-text">{{ groupName }}</text>
        </view>
        <view v-if="isTop" class="chip chip-accent">
          <wd-icon name="star-filled" :size="10" color="#b7791f" />
          <text class="chip-text chip-text-accent">置顶</text>
        </view>
      </view>

      <!-- 标题 -->
      <text class="title">{{ article.title || '无标题' }}</text>

      <!-- 作者行 -->
      <view class="author-row">
        <view class="author-avatar-wrap" @click="openAuthor">
          <image class="author-avatar" :src="author.avatar" mode="aspectFill" />
          <view class="author-verify">
            <wd-icon name="check" :size="8" color="#ffffff" />
          </view>
        </view>

        <view class="min-w-0 flex-1" @click="openAuthor">
          <view class="flex items-center gap-1">
            <text class="author-name ellipsis">{{ author.nickname }}</text>
            <TitleBadge :payload="titlePayload" :text="titleText" />
          </view>
          <text class="author-meta">{{ timeText }}<text v-if="edited"> · 已编辑</text></text>
        </view>

        <view
          v-if="canFollow"
          class="follow-btn"
          :class="{ 'is-following': following }"
          @click="toggleFollow"
        >
          <wd-icon v-if="!following" name="add" :size="11" color="#ffffff" />
          <text class="follow-text">{{ following ? '已关注' : '关注' }}</text>
        </view>
      </view>

      <!-- 阅读信息：时长 / 字数 / 阅读量 -->
      <view class="stat-bar">
        <view class="stat-item">
          <wd-icon name="clock" :size="13" color="#9ca3af" />
          <text class="stat-text">约 {{ minutes }} 分钟</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <wd-icon name="edit" :size="13" color="#9ca3af" />
          <text class="stat-text">{{ formatCount(words) }} 字</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <wd-icon name="view" :size="13" color="#9ca3af" />
          <text class="stat-text">{{ formatCount(article.views) }}</text>
        </view>
      </view>

      <!-- 正文：markdown 走轻量转换，富文本原样（见 utils/markdown.ts） -->
      <view class="body">
        <rich-text v-if="contentHtml" :nodes="contentHtml" />
        <text v-else class="text-13px text-weak">暂无正文</text>
      </view>

      <!-- 标签 -->
      <view v-if="tags.length" class="tag-row">
        <view v-for="tag in tags" :key="tag.id" class="tag" @click="openTopic(tag.name)">
          <text class="tag-text">#{{ tag.name }}</text>
        </view>
      </view>

      <!-- 评论区（浅灰分区，让白色评论卡片有层次） -->
      <view id="comments" class="comment-section">
        <CommentList
          ref="commentRef"
          :bind-id="id"
          bind-type="article"
          :allow-comment="allowComment"
          @loaded="(total) => (commentCount = total)"
        />
      </view>
    </view>

    <!-- 底部固定操作栏 -->
    <view v-if="article" class="action-bar">
      <view class="comment-pill" @click="openCommentEditor">
        <wd-icon name="edit" :size="13" color="#9ca3af" />
        <text class="comment-pill-text">发表评论</text>
      </view>

      <view class="action-item" @click="toggleLike">
        <wd-icon :name="liked ? 'heart-filled' : 'heart'" :size="20" :color="liked ? '#c7482a' : '#4b5563'" />
        <text class="action-text" :class="{ 'is-active': liked }">
          {{ likeCount > 0 ? formatCount(likeCount) : '点赞' }}
        </text>
      </view>

      <view class="action-item" @click="toggleCollect">
        <wd-icon :name="collected ? 'star-filled' : 'star'" :size="20" :color="collected ? '#e6a23c' : '#4b5563'" />
        <text class="action-text" :class="{ 'is-collected': collected }">
          {{ collected ? '已收藏' : '收藏' }}
        </text>
      </view>

      <view class="action-item" @click="toComments">
        <wd-icon name="chat" :size="20" color="#4b5563" />
        <text class="action-text">{{ commentCount > 0 ? formatCount(commentCount) : '评论' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import CommentList from '@/components/CommentList.vue'
import TitleBadge from '@/components/TitleBadge.vue'
import { getArticle } from '@/api/article'
import { collect, isCollected, uncollect } from '@/api/collect'
import { follow, isFollowing, unfollow } from '@/api/follow'
import { getLikeCounts, isLiked, like, unlike } from '@/api/like'
import type { ArticleItem } from '@/api/types'
import { useUserStore } from '@/stores/user'
import {
  countWords,
  firstImage,
  formatCount,
  formatDateTime,
  pickUserTitlePayload,
  pickUserTitleText,
  readingMinutes
} from '@/utils/helper'
import { renderContent } from '@/utils/markdown'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 文章详情
 *
 * 版式（参考移动端阅读类 App）：封面 → 分类/置顶徽章 → 标题 → 作者行 → 阅读信息条
 * → 正文 → 标签 → 评论区，底部固定「发表评论 / 点赞 / 收藏 / 评论数」操作栏。
 *
 * 数据来源全部来自 article/one，不需要额外请求：
 * - 分类 `result.group`（后端按 Group 字段拆 id 后回查，带 name / avatar）
 * - 标签 `result.tags`（{ id, name } 数组；`tags` 字段本身是 `1|2` 的 id 串，不能直接展示）
 * - 置顶 `top`、阅读量 `views`、作者 `result.author`
 * - 字数 / 阅读时长由正文现算（后端没有该字段）
 *
 * 点赞 / 收藏各自走 user-likes、user-collects 的 is-* 接口（都要求登录），
 * 未登录时只批量取点赞数用于展示。
 */
const userStore = useUserStore()

const id = ref(0)
const article = ref<ArticleItem | null>(null)
const loading = ref(true)
const commentCount = ref(0)
const following = ref(false)
const followBusy = ref(false)

const liked = ref(false)
const likeCount = ref(0)
const likeBusy = ref(false)
const collected = ref(false)
const collectBusy = ref(false)

const commentRef = ref<InstanceType<typeof CommentList> | null>(null)

const author = computed(() => article.value?.result?.author || { id: 0, nickname: '匿名用户', avatar: '' })
const titlePayload = computed(() => pickUserTitlePayload(author.value))
const titleText = computed(() => pickUserTitleText(author.value))

const cover = computed(() => firstImage(article.value?.covers))
const timeText = computed(() => formatDateTime(article.value?.publish_time || article.value?.create_time))
const contentHtml = computed(() => renderContent(article.value?.content, article.value?.editor))

/** 发布后又改过：正文 / 标题更新时后端会刷新 update_time */
const edited = computed(() => {
  const publish = Number(article.value?.publish_time || article.value?.create_time || 0)
  const update = Number(article.value?.update_time || 0)
  return publish > 0 && update > publish + 60
})

const words = computed(() => countWords(article.value?.content))
const minutes = computed(() => readingMinutes(words.value))

/** 分类：后端只回查一层，取第一个用于展示 */
const groupName = computed(() => String(article.value?.result?.group?.[0]?.name || ''))
const groupAvatar = computed(() => String(article.value?.result?.group?.[0]?.avatar || ''))
const isTop = computed(() => Number(article.value?.top || 0) === 1)

/** 标签：result.tags 才是解析好的 [{ id, name }] */
const tags = computed<{ id: number; name: string }[]>(() => {
  const list = article.value?.result?.tags
  if (!Array.isArray(list)) return []
  return list
    .map((item: any) => ({ id: Number(item?.id || 0), name: String(item?.name || '') }))
    .filter((item) => item.name)
})

/** 评论是否可用：只有模块 / 内容显式「禁止(2)」才隐藏（allow 为 0 时会继承全局开关，不能据此隐藏） */
const allowComment = computed(() => {
  const comment = article.value?.result?.comment
  return Number(comment?.allow) !== 2 && Number(comment?.show) !== 2
})

const myUid = computed(() => Number(userStore.user?.id || 0))
const canFollow = computed(() => Number(author.value.id) > 0 && Number(author.value.id) !== myUid.value)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await getArticle(id.value)
    article.value = result || null
    commentCount.value = Number(result?.result?.comment?.count || 0)

    await Promise.all([loadFollowState(), loadReactions()])
  } catch {
    article.value = null
  } finally {
    loading.value = false
  }
}

async function loadFollowState(): Promise<void> {
  if (!canFollow.value || !userStore.isLogin) return
  try {
    const result = await isFollowing(Number(author.value.id))
    following.value = Boolean(result?.is_following)
  } catch {
    // 忽略：拿不到就按未关注展示
  }
}

/** 点赞 / 收藏状态（已登录一次请求各拿「状态 + 总数」，未登录只拿点赞数） */
async function loadReactions(): Promise<void> {
  if (!id.value) return

  try {
    if (userStore.isLogin) {
      const [likeState, collectState] = await Promise.all([
        isLiked('article', id.value),
        isCollected('article', id.value)
      ])
      liked.value = Boolean(likeState?.is_liked)
      likeCount.value = Number(likeState?.count || 0)
      collected.value = Boolean(collectState?.is_collected)
      return
    }

    const result = await getLikeCounts('article', [id.value])
    likeCount.value = Number(result?.counts?.[String(id.value)] || 0)
  } catch {
    // 状态拿不到不影响阅读
  }
}

async function toggleLike(): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (likeBusy.value || !id.value) return

  likeBusy.value = true
  const wasLiked = liked.value
  liked.value = !wasLiked
  likeCount.value = Math.max(0, likeCount.value + (wasLiked ? -1 : 1))

  try {
    if (wasLiked) await unlike('article', id.value)
    else await like('article', id.value)
  } catch {
    liked.value = wasLiked
    likeCount.value = Math.max(0, likeCount.value + (wasLiked ? 1 : -1))
  } finally {
    likeBusy.value = false
  }
}

async function toggleCollect(): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (collectBusy.value || !id.value) return

  collectBusy.value = true
  const wasCollected = collected.value
  collected.value = !wasCollected

  try {
    if (wasCollected) {
      await uncollect('article', id.value)
      toast('已取消收藏')
    } else {
      await collect('article', id.value)
      toast('已收藏，可在「我的」中查看', 'success')
    }
  } catch {
    collected.value = wasCollected
  } finally {
    collectBusy.value = false
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

  try {
    if (wasFollowing) await unfollow(Number(author.value.id))
    else await follow(Number(author.value.id))
    toast(wasFollowing ? '已取消关注' : '已关注', 'success')
  } catch {
    following.value = wasFollowing
  } finally {
    followBusy.value = false
  }
}

/** 底部「发表评论」：交给评论区弹出输入弹层，不用滚动到页面中间 */
function openCommentEditor(): void {
  commentRef.value?.openEditor()
}

function toComments(): void {
  uni.pageScrollTo({ selector: '#comments', duration: 240 })
}

function previewCover(): void {
  if (cover.value) uni.previewImage({ urls: [cover.value] })
}

function openAuthor(): void {
  const uid = Number(author.value.id || 0)
  if (uid > 0) uni.navigateTo({ url: `/pages/user/author?id=${uid}` })
}

function openTopic(keyword: string): void {
  if (!keyword) return
  uni.navigateTo({ url: `/pages/search/index?q=${encodeURIComponent(keyword)}&scope=article` })
}

/**
 * 分享链接
 * - H5：优先用 VITE_API_BASE 的域名（与网页端同域），开发环境退回当前 origin
 * - 其他端：只能用 VITE_API_BASE，没配置就提示不可用（小程序里本来也不该复制外部链接）
 */
function shareUrlOf(): string {
  const base = String(import.meta.env.VITE_API_BASE || '')
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, '')

  // #ifdef H5
  return `${base || window.location.origin}/article/${id.value}`
  // #endif
  // #ifndef H5
  return `${base}/article/${id.value}`
  // #endif
}

function onShare(): void {
  // #ifdef MP-WEIXIN
  toast('请用右上角菜单转发')
  // #endif
  // #ifndef MP-WEIXIN
  const url = shareUrlOf()
  if (!url || url.startsWith('/article')) {
    toast('分享链接暂不可用，请先配置 VITE_API_BASE')
    return
  }
  uni.setClipboardData({
    data: url,
    success: () => toast('链接已复制', 'success')
  })
  // #endif
}

function back(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else uni.reLaunch({ url: '/pages/index/index' })
}

onLoad((options) => {
  id.value = Number(options?.id || 0)
  if (!id.value) {
    toast('缺少文章 id')
    return
  }
  load()
})

// 微信小程序转发（自定义分享内容）
onShareAppMessage(() => ({
  title: article.value?.title || 'INIS',
  path: `/pages/article/detail?id=${id.value}`
}))
</script>

<style lang="scss" scoped>
.article-page {
  min-height: 100vh;
  background: var(--bg-card);
}

/* 顶部导航 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background: var(--bg-card);
  padding-top: calc(12rpx + env(safe-area-inset-top));
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
}

/* 内容容器：底部留出固定操作栏的高度 */
.content-wrap {
  padding: 8rpx 32rpx calc(140rpx + env(safe-area-inset-bottom));
}

.cover {
  width: 100%;
  height: 400rpx;
  background: #f3f4f6;
  border-radius: 20rpx;
}

/* 分类 / 置顶 */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
  margin-top: 24rpx;
}

.chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 44rpx;
  padding: 0 18rpx;
  background: #f2f3f5;
  border-radius: 22rpx;
}

.chip-accent {
  background: rgba(230, 162, 60, 0.14);
}

.chip-icon {
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
}

.chip-text {
  font-size: 21rpx;
  color: #6b7280;
}

.chip-text-accent {
  color: #b7791f;
  font-weight: 500;
}

/* 标题 */
.title {
  display: block;
  margin-top: 20rpx;
  font-size: 40rpx;
  font-weight: 600;
  line-height: 1.42;
  color: $inis-text;
}

/* 作者行 */
.author-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 28rpx;
}

.author-avatar-wrap {
  position: relative;
  flex: none;
}

.author-avatar {
  width: 80rpx;
  height: 80rpx;
  background: #f3f4f6;
  border-radius: 50%;
}

.author-verify {
  position: absolute;
  right: -2rpx;
  bottom: -2rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24rpx;
  height: 24rpx;
  background: #4b8bf5;
  border: 3rpx solid var(--bg-card);
  border-radius: 50%;
}

.author-name {
  max-width: 300rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: $inis-text;
}

.author-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: #9ca3af;
}

.follow-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex: none;
  height: 56rpx;
  padding: 0 24rpx;
  background: $inis-primary;
  border-radius: 28rpx;
}

.follow-btn.is-following {
  background: #f2f3f5;
}

.follow-text {
  font-size: 23rpx;
  font-weight: 500;
  color: #ffffff;
}

.follow-btn.is-following .follow-text {
  color: #6b7280;
}

/* 阅读信息条 */
.stat-bar {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 18rpx 24rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.stat-text {
  font-size: 21rpx;
  color: #6b7280;
}

.stat-divider {
  width: 2rpx;
  height: 20rpx;
  margin: 0 20rpx;
  background: #e0e2e7;
}

/* 正文 */
.body {
  margin-top: 32rpx;
}

/* 标签 */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 32rpx;
}

.tag {
  height: 48rpx;
  padding: 0 20rpx;
  background: rgba(199, 72, 42, 0.08);
  border-radius: 24rpx;
}

.tag-text {
  font-size: 22rpx;
  line-height: 48rpx;
  color: $inis-primary;
}

/* 评论区：浅灰底，让评论卡片浮起来 */
.comment-section {
  margin: 32rpx -32rpx 0;
  padding: 8rpx 24rpx 12rpx;
  background: #f6f7f9;
}

/* 底部固定操作栏 */
.action-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1rpx solid $inis-border;
}

.comment-pill {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
  height: 64rpx;
  padding: 0 24rpx;
  background: var(--bg);
  border-radius: 32rpx;
}

.comment-pill-text {
  font-size: 23rpx;
  color: #9ca3af;
}

.action-item {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6rpx;
}

.action-text {
  font-size: 22rpx;
  color: #4b5563;
}

.action-text.is-active {
  color: $inis-primary;
}

.action-text.is-collected {
  color: #e6a23c;
}
</style>
