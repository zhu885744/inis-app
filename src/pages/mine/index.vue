<template>
  <view class="mine-page">
    <view class="my">
      <!-- 资料卡：昵称可进个人主页；右侧签到 -->
      <view class="my-profile">
        <view class="my-profile-top">
          <image class="my-avatar" :src="avatar" mode="aspectFill" @click="goAuthor" />
          <view class="my-profile-text" @click="goAuthor">
            <view class="my-nickname">
              <text class="my-nickname-text">{{ nickname }}</text>
              <text v-if="uid" class="bi bi-chevron-right" />
            </view>
            <text class="my-sub">{{ subTitle }}</text>
          </view>
          <view
            v-if="checkinEnabled && userStore.isLogin"
            class="btn btn-sm"
            :class="checked ? 'btn-ghost is-disabled' : 'btn-primary'"
            @click="onSignIn"
          >
            <text>{{ checked ? '已签到' : signing ? '签到中…' : '签到' }}</text>
          </view>
        </view>

        <!-- 三格概览：积分 / 经验 / 今日任务 -->
        <view class="my-stats">
          <view class="my-stat" @click="goMall">
            <text class="my-stat-label">积分</text>
            <text class="my-stat-value">{{ integral }}</text>
          </view>
          <view class="my-stat" @click="goAuthor">
            <text class="my-stat-label">经验</text>
            <text class="my-stat-value">{{ exp }}</text>
          </view>
          <view class="my-stat" @click="goMall">
            <text class="my-stat-label">今日任务</text>
            <text class="my-stat-value">{{ tasks.done_count }}/{{ tasks.total_count }}</text>
          </view>
        </view>
      </view>

      <!-- 未读消息 -->
      <view class="my-notice" @click="goMessage">
        <view class="my-notice-icon">
          <text class="bi bi-bell-fill" />
          <view v-if="notifCount > 0" class="my-notice-dot" />
        </view>
        <text class="my-notice-text">
          {{ notifCount > 0 ? `${notifCount} 条未读消息` : '暂无未读消息' }}
        </text>
        <text class="bi bi-chevron-right my-arrow" />
      </view>

      <!-- 常用入口（可编辑：隐藏 / 恢复，记在本地） -->
      <view class="my-card">
        <view class="my-card-head">
          <text class="my-card-title">常用</text>
          <text class="my-link" @click="editing = !editing">{{ editing ? '完成' : '编辑' }}</text>
        </view>

        <view class="my-grid">
          <view
            v-for="item in visibleShortcuts"
            :key="item.key"
            class="my-grid-item"
            :class="{ 'is-editing': editing }"
            @click="onShortcutTap(item)"
          >
            <view class="my-grid-icon"><text class="bi" :class="item.icon" /></view>
            <text class="my-grid-label">{{ item.name }}</text>
            <view v-if="editing" class="my-grid-badge"><text class="bi bi-dash" /></view>
          </view>
        </view>

        <template v-if="editing && hiddenShortcuts.length">
          <text class="my-tip">已隐藏（点一下加回来）</text>
          <view class="my-grid">
            <view
              v-for="item in hiddenShortcuts"
              :key="item.key"
              class="my-grid-item is-hidden"
              @click="toggleShortcut(item)"
            >
              <view class="my-grid-icon"><text class="bi" :class="item.icon" /></view>
              <text class="my-grid-label">{{ item.name }}</text>
              <view class="my-grid-badge is-add"><text class="bi bi-plus" /></view>
            </view>
          </view>
        </template>
      </view>

      <!-- 最近使用（点过的入口按时间倒序，最多 5 个） -->
      <view v-if="recent.length" class="my-card">
        <view class="my-card-head">
          <view class="my-card-title">
            <text>最近使用</text>
            <text class="my-card-sub">最近打开过的功能</text>
          </view>
        </view>
        <view class="my-grid">
          <view v-for="item in recent" :key="`recent-${item.key}`" class="my-grid-item" @click="onShortcutTap(item)">
            <view class="my-grid-icon"><text class="bi" :class="item.icon" /></view>
            <text class="my-grid-label">{{ item.name }}</text>
          </view>
        </view>
      </view>

      <!-- 等级 / 账号安全 -->
      <view class="my-cards">
        <view class="my-card my-mini" @click="goAuthor">
          <view class="my-mini-head">
            <text class="bi bi-stars" />
            <text>等级</text>
          </view>
          <text class="my-mini-value">{{ levelText }}</text>
          <view class="my-bar"><view class="my-bar-inner" :style="{ width: `${expPercent}%` }" /></view>
          <text class="my-mini-hint">{{ levelHint }}</text>
        </view>

        <view class="my-card my-mini" @click="goSecurity">
          <view class="my-mini-head">
            <text class="bi bi-shield-lock" />
            <text>账号安全</text>
          </view>
          <text class="my-mini-value">{{ securityValue }}</text>
          <text class="my-mini-hint">{{ securityHint }}</text>
        </view>
      </view>

      <!-- 今日任务（取前 3 条） -->
      <view v-if="taskList.length" class="my-card">
        <view class="my-card-head">
          <view class="my-card-title">
            <text>今日任务</text>
            <text class="my-card-sub">已完成 {{ tasks.done_count }}/{{ tasks.total_count }}</text>
          </view>
        </view>
        <view class="my-tasks">
          <view v-for="task in taskList.slice(0, 3)" :key="task.type" class="my-task" :class="{ 'is-done': task.done }">
            <text class="bi" :class="task.done ? 'bi-check-circle-fill' : 'bi-circle'" />
            <text class="my-task-name">{{ task.name }}</text>
            <text class="my-task-value">{{ task.done ? '已完成' : Number(task.remain) > 0 ? `+${task.remain}` : '可继续' }}</text>
          </view>
        </view>
      </view>

      <!-- 协议 / 账号 -->
      <view class="my-links">
        <view class="my-link-item" @click="openAgreement('user')">
          <text class="bi bi-file-earmark-text" />
          <text class="my-link-item-text">用户协议</text>
          <text class="bi bi-chevron-right my-arrow" />
        </view>
        <view class="my-link-item" @click="openAgreement('privacy')">
          <text class="bi bi-shield-check" />
          <text class="my-link-item-text">隐私协议</text>
          <text class="bi bi-chevron-right my-arrow" />
        </view>
        <view v-if="userStore.isLogin" class="my-link-item is-danger" @click="onLogout">
          <text class="bi bi-box-arrow-right" />
          <text class="my-link-item-text">退出登录</text>
          <text class="bi bi-chevron-right my-arrow" />
        </view>
      </view>
    </view>

    <AppTabBar current="mine" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import { getCheckinStatus, signIn, type CheckinStatus } from '@/api/checkin'
import { getUnreadCount } from '@/api/notification'
import { getIntegral, getIntegralTasks, type IntegralTaskItem } from '@/api/integral'
import { useUserStore } from '@/stores/user'
import { formatCount } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 「我的」聚合页（对齐 Mellow 主题 views/user/Index.vue）
 *
 * 定位与网页端一致：以导航入口 + 信息展示为主，不做复杂表单。
 * 版式：资料卡（签到 / 积分 / 经验 / 今日任务）→ 未读消息 → 常用宫格（可编辑）
 * → 最近使用 → 等级 / 账号安全 → 今日任务 → 协议入口。
 *
 * 「常用」的显示项与「最近使用」都存本地，属于纯前端偏好，不落库。
 */

interface ShortcutItem {
  key: string
  name: string
  icon: string
  /** 目标页面（发布动态之类没有页面的入口用 action） */
  to?: string
  action?: 'compose' | 'checkin'
  /** 免登录即可访问（搜索 / 商城） */
  public?: boolean
}

const SHORTCUTS_STORE = 'inis_my_shortcuts'
const RECENT_STORE = 'inis_my_recent'
const RECENT_MAX = 5
const DEFAULT_VISIBLE = 8

/** 全部可放进「常用」的入口（只放 App 内真实存在的页面） */
const CATALOGUE: ShortcutItem[] = [
  { key: 'moment-new', name: '发布动态', icon: 'bi-chat-square-text', action: 'compose' },
  { key: 'author', name: '我的主页', icon: 'bi-person-badge', to: '/pages/user/author' },
  { key: 'follow', name: '我的关注', icon: 'bi-people', to: '/pages/user/follow' },
  { key: 'search', name: '搜索', icon: 'bi-search', to: '/pages/search/index', public: true },
  { key: 'goods', name: '积分商城', icon: 'bi-shop', to: '/pages/mall/index', public: true },
  { key: 'decoration-shop', name: '装扮商城', icon: 'bi-palette', to: '/pages/mall/index?tab=decoration', public: true },
  { key: 'notifications', name: '消息通知', icon: 'bi-bell', to: '/pages/message/index' },
  { key: 'checkin', name: '每日签到', icon: 'bi-calendar-check', action: 'checkin' }
]

const userStore = useUserStore()

const uid = computed(() => Number(userStore.user?.id || 0))
const nickname = computed(() => userStore.nickname)
const avatar = computed(() => userStore.avatar)

/* ---------------- 数据 ---------------- */
const summary = ref<Record<string, any>>({})
const tasks = reactive<{ list: IntegralTaskItem[]; done_count: number; total_count: number }>({
  list: [],
  done_count: 0,
  total_count: 0
})
const checkin = ref<CheckinStatus | null>(null)
const notifCount = ref(0)
const signing = ref(false)

const integral = computed(() => formatCount(Number(summary.value.integral ?? userStore.user?.integral ?? 0)))
const exp = computed(() => Number(userStore.user?.exp || 0))
const taskList = computed(() => tasks.list || [])

const checkinEnabled = computed(() => checkin.value?.enabled !== false)
const checked = computed(() => Boolean(checkin.value?.checked))

/** 等级：后端 result.level.current / next */
const levelCurrent = computed<any>(() => userStore.user?.result?.level?.current || null)
const levelNext = computed<any>(() => userStore.user?.result?.level?.next || null)
const levelValue = computed(() => Number(levelCurrent.value?.value || 0))
const levelText = computed(() => (levelValue.value ? `Lv.${levelValue.value}` : '—'))

const expPercent = computed(() => {
  const cur = Number(levelCurrent.value?.exp || 0)
  const next = Number(levelNext.value?.exp || 0)
  if (!next || next <= cur) return 100
  const percent = ((exp.value - cur) / (next - cur)) * 100
  return Math.max(0, Math.min(100, Math.round(percent)))
})

const levelHint = computed(() => {
  const next = Number(levelNext.value?.exp || 0)
  if (!next) return '已是最高等级'
  const gap = Math.max(0, next - exp.value)
  return gap > 0 ? `还差 ${gap} 经验升级` : '可以升级了'
})

const subTitle = computed(() => {
  if (!userStore.isLogin) return '登录后同步内容、积分与消息'
  const parts: string[] = []
  if (levelValue.value) parts.push(`Lv.${levelValue.value}`)
  const streak = Number(checkin.value?.streak || 0)
  if (streak > 0) parts.push(`已连续签到 ${streak} 天`)
  return parts.join(' · ') || '欢迎回来'
})

const securityValue = computed(() => (userStore.user?.email ? '已绑定' : '未绑定'))
const securityHint = computed(() => {
  const bound: string[] = []
  if (userStore.user?.email) bound.push('邮箱')
  if (userStore.user?.phone) bound.push('手机号')
  return bound.length ? `已绑定 ${bound.join(' / ')}` : '建议绑定邮箱与手机号'
})

/* ---------------- 常用 / 最近使用（本地偏好） ---------------- */
const visibleKeys = ref<string[]>([])
const recentKeys = ref<string[]>([])
const editing = ref(false)

function readStorage(key: string): any {
  try {
    return uni.getStorageSync(key) || null
  } catch {
    return null
  }
}

function writeStorage(key: string, value: any): void {
  try {
    uni.setStorageSync(key, value)
  } catch {
    // 存储失败不影响本次会话
  }
}

function loadShortcutKeys(): void {
  const raw = readStorage(SHORTCUTS_STORE)
  const list = Array.isArray(raw) ? raw : []
  const valid = list.filter((key: string) => CATALOGUE.some((item) => item.key === key))
  visibleKeys.value = valid.length ? valid : CATALOGUE.slice(0, DEFAULT_VISIBLE).map((item) => item.key)
}

function saveShortcutKeys(): void {
  writeStorage(SHORTCUTS_STORE, visibleKeys.value)
}

const visibleShortcuts = computed(() =>
  visibleKeys.value.map((key) => CATALOGUE.find((item) => item.key === key)).filter(Boolean) as ShortcutItem[]
)
const hiddenShortcuts = computed(() => CATALOGUE.filter((item) => !visibleKeys.value.includes(item.key)))

function toggleShortcut(item: ShortcutItem): void {
  if (visibleKeys.value.includes(item.key)) {
    visibleKeys.value = visibleKeys.value.filter((key) => key !== item.key)
  } else {
    visibleKeys.value = [...visibleKeys.value, item.key]
  }
  saveShortcutKeys()
}

function loadRecent(): void {
  const raw = readStorage(RECENT_STORE)
  const list = Array.isArray(raw) ? raw : []
  recentKeys.value = list.filter((key: string) => CATALOGUE.some((item) => item.key === key)).slice(0, RECENT_MAX)
}

const recent = computed(() =>
  recentKeys.value.map((key) => CATALOGUE.find((item) => item.key === key)).filter(Boolean) as ShortcutItem[]
)

function pushRecent(item: ShortcutItem): void {
  const next = [item.key, ...recentKeys.value.filter((key) => key !== item.key)].slice(0, RECENT_MAX)
  recentKeys.value = next
  writeStorage(RECENT_STORE, next)
}

/* ---------------- 交互 ---------------- */
function withUid(path: string): string {
  if (!path.includes('?')) return uid.value > 0 ? `${path}?id=${uid.value}` : path
  return uid.value > 0 ? `${path}&id=${uid.value}` : path
}

function onShortcutTap(item: ShortcutItem): void {
  if (editing.value) {
    toggleShortcut(item)
    return
  }
  if (!item.public && !ensureLogin()) return

  if (item.action === 'compose') {
    toast('发布功能开发中')
    return
  }
  if (item.action === 'checkin') {
    onSignIn()
    return
  }
  if (!item.to) return

  pushRecent(item)
  uni.navigateTo({ url: withUid(item.to) })
}

function ensureLogin(): boolean {
  if (userStore.isLogin) return true
  toLogin()
  return false
}

function goAuthor(): void {
  if (!ensureLogin()) return
  uni.navigateTo({ url: `/pages/user/author?id=${uid.value}` })
}

function goMall(): void {
  uni.reLaunch({ url: '/pages/mall/index' })
}

function goMessage(): void {
  if (!ensureLogin()) return
  uni.reLaunch({ url: '/pages/message/index' })
}

function goSecurity(): void {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/reset-password/index' })
}

function openAgreement(type: 'user' | 'privacy'): void {
  uni.navigateTo({ url: `/pages/agreement/index?type=${type}` })
}

/* ---------------- 加载 ---------------- */
async function loadSummary(): Promise<void> {
  if (!userStore.isLogin) {
    summary.value = {}
    return
  }
  try {
    const result = await getIntegral()
    summary.value = result || {}
  } catch {
    summary.value = {}
  }
}

async function loadTasks(): Promise<void> {
  if (!userStore.isLogin) {
    tasks.list = []
    tasks.done_count = 0
    tasks.total_count = 0
    return
  }
  try {
    const result: any = await getIntegralTasks()
    tasks.list = Array.isArray(result?.list) ? result.list : []
    tasks.done_count = Number(result?.done_count || 0)
    tasks.total_count = Number(result?.total_count || 0)
  } catch {
    tasks.list = []
    tasks.done_count = 0
    tasks.total_count = 0
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
    notifCount.value = 0
    return
  }
  try {
    const result = await getUnreadCount()
    notifCount.value = Number(result?.count || 0)
  } catch {
    notifCount.value = 0
  }
}

async function onSignIn(): Promise<void> {
  if (!ensureLogin() || signing.value) return
  if (checked.value) {
    toast('今天已经签到过了')
    return
  }

  signing.value = true
  try {
    await signIn()
    toast('签到成功', 'success')
    await Promise.all([loadCheckin(), loadSummary(), loadTasks(), userStore.checkLoginState()])
  } catch {
    // 请求层已提示
  } finally {
    signing.value = false
  }
}

function onLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmColor: '#c7482a',
    success: async (res) => {
      if (!res.confirm) return
      await userStore.logout()
      summary.value = {}
      tasks.list = []
      tasks.done_count = 0
      tasks.total_count = 0
      checkin.value = null
      notifCount.value = 0
      recentKeys.value = []
      toast('已退出登录', 'success')
    }
  })
}

onShow(() => {
  loadShortcutKeys()
  loadRecent()
  loadSummary()
  loadTasks()
  loadCheckin()
  loadUnread()
})
</script>

<style lang="scss" scoped>
.mine-page {
  min-height: 100vh;
  padding: 14px 14px calc(76px + env(safe-area-inset-bottom));
  padding-top: calc(14px + env(safe-area-inset-top));
  background: var(--bg);
  background-image: var(--gradient-page);
}

.my {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 资料卡 */
.my-profile {
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.my-profile-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.my-avatar {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--bg-muted);
}

.my-profile-text {
  flex: 1;
  min-width: 0;
}

.my-nickname {
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}

.my-nickname .bi {
  font-size: 13px;
  color: var(--text-light);
}

.my-nickname-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-sub {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.my-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-soft);
}

.my-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  border-right: 1px solid var(--border-soft);
}

.my-stat:last-child {
  border-right: none;
}

.my-stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.my-stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

/* 未读消息条 */
.my-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  color: var(--text-soft);
  font-size: 13px;
}

.my-notice-icon {
  position: relative;
  display: flex;
  font-size: 16px;
  color: var(--primary);
}

.my-notice-dot {
  position: absolute;
  top: -1px;
  right: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--danger);
}

.my-notice-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-arrow {
  font-size: 12px;
  color: var(--text-light);
}

/* 通用卡片 */
.my-card {
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
}

.my-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.my-card-title {
  display: flex;
  align-items: baseline;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.my-card-sub {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}

.my-link {
  font-size: 12px;
  color: var(--text-muted);
}

/* 常用 / 最近使用的图标宫格 */
.my-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px 0;
}

.my-grid-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 2px;
  color: var(--text-soft);
}

.my-grid-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--bg-muted);
  color: var(--text-soft);
  font-size: 18px;
}

.my-grid-label {
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
}

.my-grid-badge {
  position: absolute;
  top: 4px;
  right: calc(50% - 26px);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
}

.my-grid-badge.is-add {
  background: var(--primary);
}

.my-grid-item.is-hidden {
  opacity: 0.55;
}

.my-tip {
  display: block;
  margin: 10px 0 6px;
  font-size: 12px;
  color: var(--text-muted);
}

/* 等级 / 账号安全 */
.my-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.my-mini {
  display: block;
  color: var(--text);
}

.my-mini-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.my-mini-value {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.my-mini-hint {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.my-bar {
  height: 6px;
  margin-top: 10px;
  border-radius: 3px;
  background: var(--bg-muted);
  overflow: hidden;
}

.my-bar-inner {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--primary), var(--primary-deep));
}

/* 今日任务 */
.my-tasks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.my-task {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-soft);
}

.my-task .bi {
  font-size: 14px;
  color: var(--text-light);
}

.my-task.is-done {
  color: var(--text-muted);
}

.my-task.is-done .bi {
  color: var(--success);
}

.my-task-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-task-value {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--primary);
}

/* 协议入口 */
.my-links {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
}

.my-link-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  font-size: 14px;
  color: var(--text);
}

.my-link-item + .my-link-item {
  border-top: 1px solid var(--border-soft);
}

.my-link-item > .bi:first-child {
  font-size: 15px;
  color: var(--primary);
}

.my-link-item-text {
  flex: 1;
  min-width: 0;
}

.my-link-item.is-danger > .bi:first-child,
.my-link-item.is-danger .my-link-item-text {
  color: var(--danger);
}
</style>
