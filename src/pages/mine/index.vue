<template>
  <view class="mine-page">
    <!-- 资料卡 -->
    <view class="card profile-card">
      <view class="profile-top" @click="onProfileTap">
        <image v-if="userStore.isLogin" class="avatar" :src="avatar" mode="aspectFill" />
        <view v-else class="avatar avatar-empty">
          <wd-icon name="user" :size="26" color="#c0c4cc" />
        </view>

        <view class="min-w-0 flex-1">
          <text class="profile-name ellipsis">{{ userStore.isLogin ? nickname : '登录 / 注册' }}</text>
          <text class="profile-sub ellipsis">{{ subText }}</text>
        </view>

        <view
          v-if="userStore.isLogin"
          class="sign-btn"
          :class="{ 'is-done': checked }"
          @click.stop="onSign"
        >
          <text class="sign-text">{{ checked ? '已签到' : '签到' }}</text>
        </view>
      </view>

      <view v-if="userStore.isLogin" class="stat-row">
        <view class="stat-cell">
          <text class="stat-label">积分</text>
          <text class="stat-value">{{ formatCount(integral) }}</text>
        </view>
        <view class="stat-cell">
          <text class="stat-label">经验</text>
          <text class="stat-value">{{ formatCount(exp) }}</text>
        </view>
        <view class="stat-cell">
          <text class="stat-label">文章</text>
          <text class="stat-value">{{ formatCount(contentCount) }}</text>
        </view>
      </view>
    </view>

    <!-- 消息条 -->
    <view v-if="userStore.isLogin" class="card msg-bar" @click="toMessage">
      <wd-icon name="notification" :size="17" color="#4b5563" />
      <view v-if="unread > 0" class="msg-dot" />
      <text class="msg-text">{{ unread > 0 ? `${unread} 条未读消息` : '暂无未读消息' }}</text>
      <wd-icon name="chevron-right" :size="14" color="#c0c4cc" />
    </view>

    <!-- 常用 -->
    <view class="card section">
      <view class="section-head">
        <text class="section-title">常用</text>
        <text class="section-link" @click="onEditCommon">编辑</text>
      </view>

      <view class="grid">
        <view v-for="item in COMMON" :key="item.key" class="grid-item" @click="openService(item)">
          <wd-icon :name="item.icon" :size="24" color="#374151" />
          <text class="grid-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 最近使用（记录的是真正打开过的服务） -->
    <view v-if="recentServices.length" class="card section">
      <view class="section-head">
        <text class="section-title">最近使用</text>
        <text class="section-desc">最近打开过的服务</text>
      </view>

      <view class="grid grid-5">
        <view v-for="item in recentServices" :key="item.key" class="grid-item" @click="openService(item)">
          <wd-icon :name="item.icon" :size="23" color="#374151" />
          <text class="grid-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 等级 / 会员 -->
    <view class="duo-row">
      <view class="card duo-card" @click="openService(SERVICE_MAP.level)">
        <view class="duo-head">
          <wd-icon name="chart" :size="15" color="#4b5563" />
          <text class="duo-title">等级</text>
        </view>
        <text class="duo-value">{{ levelName || '未登录' }}</text>
        <view class="progress">
          <view class="progress-inner" :style="{ width: `${levelPercent}%` }" />
        </view>
        <text class="duo-hint">{{ levelHint }}</text>
      </view>

      <view class="card duo-card" @click="openService(SERVICE_MAP.member)">
        <view class="duo-head">
          <wd-icon name="star-filled" :size="15" color="#4b5563" />
          <text class="duo-title">会员</text>
        </view>
        <text class="duo-value">尚未开通</text>
        <text class="duo-hint">开通后可使用会员权益</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view v-if="userStore.isLogin" class="logout-btn" @click="onLogout">
      <text class="logout-text">退出登录</text>
    </view>

    <AppTabBar current="mine" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import { getCheckinStatus, signIn, type CheckinStatus } from '@/api/checkin'
import { getSocialStats } from '@/api/follow'
import { getUnreadCount } from '@/api/notification'
import type { SocialStats } from '@/api/types'
import { useUserStore } from '@/stores/user'
import {
  clearRecentServices,
  getRecentServices,
  pushRecentService
} from '@/utils/storage'
import { formatCount } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 个人中心（服务枢纽版）
 *
 * 版式（参考移动端社区 App）：搜索 → 资料卡（签到 / 金币 / 经验 / 内容）→ 消息条
 * → 常用九宫格 → 最近使用 → 等级 / 会员双卡。
 *
 * 数据来源（全部是真实接口 / 本地登录态，不编数字）：
 * - 昵称 / 头像 / 金币(integral) / 经验(exp) / 等级(result.level)：本地登录态（登录与 check-token 写入）
 * - 签到状态与连续天数：checkin/status；点「签到」调 checkin/sign
 * - 内容数：user-follows/stats 的 动态 + 文章
 * - 未读消息：notification/unread-count
 * - 最近使用：本地记录（只有真正打开了目的地的服务才会进这个列表）
 *
 * 与参考图的差异：参考图有「今日任务 x/5」，后端没有任务模块（只有签到 → 经验/积分），
 * 所以第三格改成了「内容」；会员卡保留「尚未开通」的空态（站点暂无会员体系）。
 */
interface ServiceItem {
  key: string
  label: string
  icon: string
  /** 已实现的目的地（内容中心要拼当前用户 id，在 openService 里生成） */
  path?: string
}

const userStore = useUserStore()

const stats = ref<SocialStats | null>(null)
const checkin = ref<CheckinStatus | null>(null)
const unread = ref(0)
const recentKeys = ref<string[]>(getRecentServices())
const signing = ref(false)

const SERVICES: ServiceItem[] = [
  { key: 'publish', label: '发布动态', icon: 'edit' },
  { key: 'content', label: '内容中心', icon: 'list' },
  { key: 'task', label: '任务中心', icon: 'check' },
  { key: 'member', label: '会员中心', icon: 'star-filled' },
  { key: 'verify', label: '认证中心', icon: 'lock-on' },
  { key: 'promote', label: '推广中心', icon: 'refresh' },
  { key: 'wallet', label: '我的钱包', icon: 'wallet' },
  { key: 'shop', label: '商城', icon: 'shop' },
  { key: 'level', label: '等级中心', icon: 'chart' }
]

/** 常用：参考图的第一屏 8 个入口 */
const COMMON = SERVICES.filter((item) => item.key !== 'level')

const SERVICE_MAP = Object.fromEntries(SERVICES.map((item) => [item.key, item])) as Record<string, ServiceItem>

const uid = computed(() => Number(userStore.user?.id || 0))
const avatar = computed(() => String(userStore.user?.avatar || ''))
const nickname = computed(() => String(userStore.user?.nickname || userStore.user?.account || '未登录'))

const integral = computed(() => Number(userStore.user?.integral || 0))
const exp = computed(() => Number(userStore.user?.exp || 0))
const contentCount = computed(() => Number(stats.value?.moment || 0) + Number(stats.value?.article || 0))

const checked = computed(() => Boolean(checkin.value?.checked))
const streak = computed(() => Number(checkin.value?.streak || 0))

/** 等级：后端 result.level.current / next */
const levelCurrent = computed<any>(() => userStore.user?.result?.level?.current || null)
const levelNext = computed<any>(() => userStore.user?.result?.level?.next || null)

const levelName = computed(() => {
  if (!userStore.isLogin) return ''
  const current = levelCurrent.value
  if (!current) return '未定级'
  return String(current.name || current.text || (current.value ? `Lv.${current.value}` : '') || '未定级')
})

/** 升级进度：当前经验在「本级门槛 ~ 下一级门槛」之间的百分比 */
const levelPercent = computed(() => {
  const current = levelCurrent.value
  const next = levelNext.value
  if (!current || !next) return userStore.isLogin ? 100 : 0

  const from = Number(current.exp || 0)
  const to = Number(next.exp || 0)
  if (to <= from) return 100

  const percent = ((exp.value - from) / (to - from)) * 100
  return Math.min(100, Math.max(0, Math.round(percent)))
})

const levelHint = computed(() => {
  if (!userStore.isLogin) return '登录后查看等级'
  const next = levelNext.value
  if (!next) return '已达最高等级'
  const remain = Number(next.exp || 0) - exp.value
  return remain > 0 ? `还差 ${formatCount(remain)} 经验升级` : '可以升级了'
})

/** 副标题：等级 + 连续签到（未登录是引导文案） */
const subText = computed(() => {
  if (!userStore.isLogin) return '登录后同步内容、资产与会员权益'

  const parts: string[] = []
  if (levelName.value) parts.push(levelName.value)
  if (streak.value > 0) parts.push(`${checked.value ? '已' : ''}连续签到 ${streak.value} 天`)
  if (!parts.length) parts.push(String(userStore.user?.description || '还没有填写个性签名'))
  return parts.join(' · ')
})

/** 最近使用：把本地记录的 key 映射成服务项（找不到的 key 直接丢弃） */
const recentServices = computed(() =>
  recentKeys.value.map((key) => SERVICE_MAP[key]).filter((item): item is ServiceItem => Boolean(item))
)

/** 服务的目的地：只有这些是已实现的 */
function resolveServicePath(key: string): string {
  if (key === 'content') return uid.value > 0 ? `/pages/user/author?id=${uid.value}` : ''
  return ''
}

function ensureLogin(): boolean {
  if (userStore.isLogin) return true
  toLogin()
  return false
}

function openService(item: ServiceItem | undefined): void {
  if (!item) return
  if (!ensureLogin()) return

  const path = item.path || resolveServicePath(item.key)
  if (!path) {
    // 目的地还没做：如实提示，不伪造数据
    toast(`${item.label}开发中`)
    return
  }

  // 只记录真正打开过的服务，最近使用才有意义
  recentKeys.value = pushRecentService(item.key)
  uni.navigateTo({ url: path })
}

function onProfileTap(): void {
  if (!ensureLogin()) return
  uni.navigateTo({ url: `/pages/user/author?id=${uid.value}` })
}

function onEditCommon(): void {
  toast('常用功能编辑开发中')
}

function toSearch(): void {
  uni.navigateTo({ url: '/pages/search/index' })
}

function toMessage(): void {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/message/index' })
}

async function loadStats(): Promise<void> {
  if (!userStore.isLogin) {
    stats.value = null
    return
  }
  try {
    // 不传 uid：后端取当前登录用户
    stats.value = await getSocialStats()
  } catch {
    stats.value = null
  }
}

async function loadCheckin(): Promise<void> {
  if (!userStore.isLogin) {
    checkin.value = null
    return
  }
  try {
    checkin.value = await getCheckinStatus()
  } catch {
    checkin.value = null
  }
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
    unread.value = 0
  }
}

async function onSign(): Promise<void> {
  if (!ensureLogin() || signing.value) return
  if (checked.value) {
    toast('今天已经签到过了')
    return
  }

  signing.value = true
  try {
    await signIn()
    toast('签到成功', 'success')
    // 签到会加经验 / 积分：重新拉一次登录态，让金币 / 经验 / 等级一起刷新
    await Promise.all([loadCheckin(), loadStats(), userStore.checkLoginState()])
  } catch {
    // 请求层已提示（如「今日已签到」）
  } finally {
    signing.value = false
  }
}

function onLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    success: async (res) => {
      if (!res.confirm) return
      await userStore.logout()
      stats.value = null
      checkin.value = null
      unread.value = 0
      recentKeys.value = []
      clearRecentServices()
      toast('已退出登录', 'success')
    }
  })
}

onShow(() => {
  loadStats()
  loadCheckin()
  loadUnread()
})
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  padding: 16rpx 24rpx calc(140rpx + env(safe-area-inset-bottom));
  background: #f5f6f8;
  padding-top: calc(16rpx + env(safe-area-inset-top));
}

.card {
  margin-top: 22rpx;
  padding: 28rpx 26rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  border-radius: 24rpx;
}

/* 搜索 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 76rpx;
  padding: 0 26rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  border-radius: 38rpx;
}

.search-text {
  font-size: 25rpx;
  color: #9ca3af;
}

/* 资料卡 */
.profile-card {
  padding-bottom: 8rpx;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar {
  display: block;
  flex: none;
  width: 104rpx;
  height: 104rpx;
  background: #f3f4f6;
  border-radius: 50%;
}

.avatar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-name {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: $inis-text;
}

.profile-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 21rpx;
  color: #9ca3af;
}

.sign-btn {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  height: 60rpx;
  padding: 0 26rpx;
  background: #2f7cf6;
  border-radius: 30rpx;
}

.sign-btn.is-done {
  background: #eef1f5;
}

.sign-text {
  font-size: 23rpx;
  font-weight: 500;
  color: #ffffff;
}

.sign-btn.is-done .sign-text {
  color: #9ca3af;
}

.stat-row {
  display: flex;
  align-items: center;
  margin-top: 26rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid #f0f1f4;
}

.stat-cell {
  flex: 1;
}

.stat-cell + .stat-cell {
  padding-left: 26rpx;
  border-left: 1rpx solid #f0f1f4;
}

.stat-label {
  display: block;
  font-size: 20rpx;
  color: #9ca3af;
}

.stat-value {
  display: block;
  margin-top: 6rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: $inis-text;
}

/* 消息条 */
.msg-bar {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 24rpx 26rpx;
}

.msg-dot {
  width: 12rpx;
  height: 12rpx;
  background: #ef4444;
  border-radius: 50%;
}

.msg-text {
  flex: 1;
  font-size: 25rpx;
  color: #374151;
}

/* 分组 */
.section-head {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $inis-text;
}

.section-link {
  margin-left: auto;
  font-size: 23rpx;
  color: #2f7cf6;
}

.section-desc {
  margin-left: 12rpx;
  font-size: 20rpx;
  color: #b0b4bb;
}

.grid {
  display: flex;
  flex-wrap: wrap;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 25%;
  padding: 20rpx 0;
}

.grid-5 .grid-item {
  width: 20%;
}

.grid-label {
  margin-top: 14rpx;
  font-size: 21rpx;
  color: #374151;
}

/* 等级 / 会员 */
.duo-row {
  display: flex;
  align-items: stretch;
  gap: 20rpx;
}

.duo-row .card {
  flex: 1;
  min-width: 0;
  margin-top: 22rpx;
  padding: 24rpx;
}

.duo-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.duo-title {
  font-size: 21rpx;
  color: #6b7280;
}

.duo-value {
  display: block;
  margin-top: 12rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: $inis-text;
}

.progress {
  height: 10rpx;
  margin-top: 16rpx;
  background: #eef1f5;
  border-radius: 5rpx;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #2f7cf6, #5b9bf8);
  border-radius: 5rpx;
}

.duo-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #9ca3af;
}

/* 退出登录 */
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  margin-top: 22rpx;
  background: #ffffff;
  border: 1rpx solid #eef0f3;
  border-radius: 24rpx;
}

.logout-text {
  font-size: 26rpx;
  color: #ef4444;
}
</style>
