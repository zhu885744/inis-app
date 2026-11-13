<template>
  <view class="mine">
    <!-- 顶部：右侧菜单（功能入口收进抽屉，主页保持干净） -->
    <view class="mine-topbar">
      <text v-if="userStore.isLogin && unreadBadge" class="topbar-notice" @click="goMessage">
        <text class="bi bi-bell-fill" />
        <text class="topbar-notice-dot" />
      </text>
      <view class="topbar-icon" @click="drawerOpen = true">
        <text class="bi bi-list" />
      </view>
    </view>

    <!-- 资料卡 -->
    <view class="profile">
      <view class="profile-row">
        <image v-if="avatar" class="profile-avatar" :src="avatar" mode="aspectFill" />
        <view v-else class="profile-avatar profile-avatar-empty">
          <text class="bi bi-person-fill" />
        </view>

        <view class="profile-main">
          <view class="profile-name">
            <text class="profile-nickname ellipsis">{{ nickname }}</text>
            <text v-if="levelValue" class="profile-level">Lv.{{ levelValue }}</text>
          </view>
          <text class="profile-id">INIS 号：{{ uid ? uid : '未登录' }}</text>
        </view>

        <view v-if="userStore.isLogin" class="xhs-btn is-ghost profile-btn" @click="goAuthor">编辑资料</view>
        <view v-else class="xhs-btn profile-btn" @click="toLogin">登录</view>
      </view>

      <text class="profile-bio">{{ bio }}</text>

      <!-- 关注 / 粉丝 / 获赞与收藏 -->
      <view class="profile-stats">
        <view class="profile-stat" @click="goFollow">
          <text class="stat-num">{{ formatCount(stats.follow) }}</text>
          <text class="stat-label">关注</text>
        </view>
        <view class="profile-stat" @click="goFollow">
          <text class="stat-num">{{ formatCount(stats.fans) }}</text>
          <text class="stat-label">粉丝</text>
        </view>
        <view class="profile-stat">
          <text class="stat-num">{{ formatCount(stats.likes) }}</text>
          <text class="stat-label">获赞与收藏</text>
        </view>
      </view>

      <!-- 本站特色：签到 / 积分 / 经验，压成一条横向小卡 -->
      <view v-if="userStore.isLogin" class="profile-quick">
        <view class="quick-chip" :class="{ 'is-done': checked }" @click="onSignIn">
          <text class="bi" :class="checked ? 'bi-check-circle-fill' : 'bi-calendar-check'" />
          <text>{{ checked ? `已签到 ${streak} 天` : signing ? '签到中…' : '每日签到' }}</text>
        </view>
        <view class="quick-chip" @click="goMall">
          <text class="bi bi-coin" />
          <text>{{ integral }} 积分</text>
        </view>
        <view class="quick-chip" @click="drawerOpen = true">
          <text class="bi bi-stars" />
          <text>{{ exp }} 经验</text>
        </view>
      </view>
    </view>

    <!-- 三栏 tab -->
    <view class="mine-tabs">
      <view
        v-for="item in TABS"
        :key="item.key"
        class="mine-tab"
        :class="{ 'is-active': activeTab === item.key }"
        @click="switchTab(item.key)"
      >
        <text>{{ item.label }}</text>
        <view class="mine-tab-line" />
      </view>
    </view>

    <NoteWaterfall
      :notes="notes"
      :loading="loading"
      :finished="true"
      :empty-text="emptyText"
      @click="openNote"
    />

    <AppTabBar current="mine" />

    <!-- ========== 功能抽屉 ========== -->
    <view v-if="drawerOpen" class="drawer-mask" @click="drawerOpen = false" />
    <view class="drawer" :class="{ 'is-open': drawerOpen }">
      <view class="drawer-head">
        <text class="drawer-title">更多功能</text>
        <text class="bi bi-x-lg drawer-close" @click="drawerOpen = false" />
      </view>

      <scroll-view scroll-y class="drawer-body">
        <!-- 今日任务 -->
        <view v-if="taskList.length" class="drawer-card">
          <view class="drawer-card-head">
            <text class="drawer-card-title">今日任务</text>
            <text class="drawer-card-sub">{{ tasks.done_count }}/{{ tasks.total_count }}</text>
          </view>
          <view v-for="task in taskList.slice(0, 3)" :key="task.type" class="task-row">
            <text class="bi task-icon" :class="task.done ? 'bi-check-circle-fill' : 'bi-circle'" />
            <text class="task-name">{{ task.name }}</text>
            <text class="task-value">{{ task.done ? '已完成' : Number(task.remain) > 0 ? `+${task.remain}` : '继续' }}</text>
          </view>
        </view>

        <!-- 功能宫格（可编辑：隐藏 / 恢复，记在本地） -->
        <view class="drawer-card">
          <view class="drawer-card-head">
            <text class="drawer-card-title">常用</text>
            <text class="drawer-edit" @click="editing = !editing">{{ editing ? '完成' : '编辑' }}</text>
          </view>
          <view class="shortcut-grid">
            <view v-for="item in visibleShortcuts" :key="item.key" class="shortcut" @click="onShortcutTap(item)">
              <view class="shortcut-icon"><text class="bi" :class="item.icon" /></view>
              <text class="shortcut-label">{{ item.name }}</text>
              <view v-if="editing" class="shortcut-badge"><text class="bi bi-dash" /></view>
            </view>
          </view>

          <view v-if="editing && hiddenShortcuts.length" class="shortcut-hidden">
            <text class="shortcut-hidden-tip">已隐藏（点一下加回来）</text>
            <view class="shortcut-grid">
              <view v-for="item in hiddenShortcuts" :key="item.key" class="shortcut" @click="toggleShortcut(item)">
                <view class="shortcut-icon is-muted"><text class="bi" :class="item.icon" /></view>
                <text class="shortcut-label">{{ item.name }}</text>
                <view class="shortcut-badge is-add"><text class="bi bi-plus" /></view>
              </view>
            </view>
          </view>
        </view>

        <!-- 协议与账号 -->
        <view class="drawer-links">
          <view class="drawer-link" @click="openAgreement('user')">
            <text class="bi bi-file-earmark-text" />
            <text class="drawer-link-text">用户协议</text>
            <text class="bi bi-chevron-right drawer-arrow" />
          </view>
          <view class="drawer-link" @click="openAgreement('privacy')">
            <text class="bi bi-shield-check" />
            <text class="drawer-link-text">隐私协议</text>
            <text class="bi bi-chevron-right drawer-arrow" />
          </view>
          <view v-if="userStore.isLogin" class="drawer-link is-danger" @click="onLogout">
            <text class="bi bi-box-arrow-right" />
            <text class="drawer-link-text">退出登录</text>
            <text class="bi bi-chevron-right drawer-arrow" />
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import NoteWaterfall from '@/components/NoteWaterfall.vue'
import { getCheckinStatus, signIn, type CheckinStatus } from '@/api/checkin'
import { getUnreadCount } from '@/api/notification'
import { getIntegral, getIntegralTasks, type IntegralTaskItem } from '@/api/integral'
import { getArticles } from '@/api/article'
import { getMoments } from '@/api/moments'
import { getSocialStats } from '@/api/follow'
import { getCollects } from '@/api/collect'
import { getUserLikes } from '@/api/like'
import {
  articleToNote,
  fetchNotesByIds,
  momentToNote,
  normalizeTargetType,
  type NoteItem,
  type NoteRef
} from '@/composables/useNotes'
import type { ArticleItem, LikeItem, MomentItem } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { formatCount } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 我的（小红书式个人主页）
 *
 * 版式：资料卡（头像 / 昵称 / INIS 号 / 简介 / 关注粉丝获赞）
 * → 签到·积分·经验横条 → 笔记 / 收藏 / 喜欢 三栏 → 双列瀑布流。
 *
 * 功能性入口（常用宫格、今日任务、协议、退出）收进右侧抽屉，
 * 保证主页视觉与小红书一致，同时不丢原有能力。
 */

type TabKey = 'note' | 'collect' | 'like'

interface ShortcutItem {
  key: string
  name: string
  icon: string
  to?: string
  action?: 'compose' | 'checkin'
  public?: boolean
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'note', label: '笔记' },
  { key: 'collect', label: '收藏' },
  { key: 'like', label: '喜欢' }
]

const SHORTCUTS_STORE = 'inis_my_shortcuts'
const RECENT_STORE = 'inis_my_recent'
const RECENT_MAX = 5
const DEFAULT_VISIBLE = 8

/** 可放进「常用」的入口（只放 App 内真实存在的页面） */
const CATALOGUE: ShortcutItem[] = [
  { key: 'moment-new', name: '发布动态', icon: 'bi-plus-square', action: 'compose' },
  { key: 'author', name: '我的主页', icon: 'bi-person-badge', to: '/pages/user/author' },
  { key: 'follow', name: '我的关注', icon: 'bi-people', to: '/pages/user/follow' },
  { key: 'search', name: '搜索', icon: 'bi-search', to: '/pages/search/index', public: true },
  { key: 'goods', name: '积分商城', icon: 'bi-bag', to: '/pages/mall/index', public: true },
  { key: 'decoration-shop', name: '装扮商城', icon: 'bi-palette', to: '/pages/mall/index?tab=decoration', public: true },
  { key: 'notifications', name: '消息通知', icon: 'bi-bell', to: '/pages/message/index' },
  { key: 'checkin', name: '每日签到', icon: 'bi-calendar-check', action: 'checkin' }
]

const userStore = useUserStore()

const uid = computed(() => Number(userStore.user?.id || 0))
const nickname = computed(() => userStore.nickname)
const avatar = computed(() => userStore.avatar)
const bio = computed(() => {
  if (!userStore.isLogin) return '登录后同步你的内容、积分与消息'
  return String(userStore.user?.description || '这个人很懒，还没有写简介')
})

/* ---------------- 数据 ---------------- */
const stats = reactive({ follow: 0, fans: 0, likes: 0 })
const checkin = ref<CheckinStatus | null>(null)
const signing = ref(false)
const integral = ref(0)
const exp = ref(0)
const tasks = reactive<{ list: IntegralTaskItem[]; done_count: number; total_count: number }>({
  list: [],
  done_count: 0,
  total_count: 0
})
const unreadBadge = ref(false)

const taskList = computed(() => tasks.list || [])
const checked = computed(() => Boolean(checkin.value?.checked))
const streak = computed(() => Number(checkin.value?.streak || 0))
const levelValue = computed(() => Number((userStore.user as any)?.result?.level?.current?.value || 0))

/* ---------------- 三栏列表 ---------------- */
const activeTab = ref<TabKey>('note')
const notes = ref<NoteItem[]>([])
const loading = ref(false)
const loaded = reactive<Record<TabKey, boolean>>({ note: false, collect: false, like: false })

const emptyText = computed(() => {
  if (activeTab.value === 'collect') return '还没有收藏别人的笔记'
  if (activeTab.value === 'like') return '还没有点过赞'
  return userStore.isLogin ? '还没有发布笔记，点「+」发一条吧' : '登录后查看你的笔记'
})

/** 我的笔记：文章 + 动态合并，按时间倒序 */
async function loadMyNotes(): Promise<void> {
  if (!uid.value) {
    notes.value = []
    return
  }
  const [articleResult, momentResult] = await Promise.all([
    getArticles({ where: { uid: uid.value }, limit: 20, order: 'create_time desc' }).catch(() => null),
    getMoments({ where: { uid: uid.value }, limit: 20, order: 'create_time desc' }).catch(() => null)
  ])

  const articleNotes = ((articleResult?.data || []) as ArticleItem[]).map(articleToNote)
  const momentNotes = ((momentResult?.data || []) as MomentItem[]).map(momentToNote)
  notes.value = [...articleNotes, ...momentNotes].sort((a, b) => (b.createTime || 0) - (a.createTime || 0))
}

/** 收藏 / 喜欢共用：先拿目标引用，再批量回查内容 */
async function loadRefNotes(loadRefs: () => Promise<NoteRef[]>): Promise<void> {
  if (!uid.value) {
    notes.value = []
    return
  }
  const refs = await loadRefs()
  notes.value = refs.length ? await fetchNotesByIds(refs) : []
}

async function loadMyCollects(): Promise<void> {
  await loadRefNotes(async () => {
    const result = await getCollects({ uid: uid.value }).catch(() => null)
    return (result?.list || [])
      .map((item) => ({ type: normalizeTargetType(item.target_type), id: Number(item.target_id) }))
      .filter((item): item is NoteRef => Boolean(item.type) && item.id > 0)
      .slice(0, 40)
  })
}

async function loadMyLikes(): Promise<void> {
  await loadRefNotes(async () => {
    const result = await getUserLikes({ uid: uid.value }).catch(() => null)
    return ((result?.list || []) as LikeItem[])
      .map((item) => ({ type: normalizeTargetType(item.target_type), id: Number(item.target_id) }))
      .filter((item): item is NoteRef => Boolean(item.type) && item.id > 0)
      .slice(0, 40)
  })
}

async function loadTab(force = false): Promise<void> {
  if (!userStore.isLogin) {
    notes.value = []
    return
  }
  if (loading.value) return
  if (!force && loaded[activeTab.value]) return

  loading.value = true
  try {
    if (activeTab.value === 'note') await loadMyNotes()
    else if (activeTab.value === 'collect') await loadMyCollects()
    else await loadMyLikes()
    loaded[activeTab.value] = true
  } finally {
    loading.value = false
  }
}

function switchTab(key: TabKey): void {
  if (activeTab.value === key) return
  activeTab.value = key
  notes.value = []
  loadTab()
}

/* ---------------- 概要数据 ---------------- */
function loadSummary(): void {
  if (!userStore.isLogin || !uid.value) return

  getSocialStats(uid.value)
    .then((result) => {
      stats.follow = Number(result?.follow || 0)
      stats.fans = Number(result?.fans || 0)
      stats.likes = Number(result?.likes || 0)
    })
    .catch(() => {})

  getCheckinStatus()
    .then((result) => {
      checkin.value = result
    })
    .catch(() => {})

  getIntegral()
    .then((result: any) => {
      integral.value = Number(result?.integral ?? userStore.user?.integral ?? 0)
      exp.value = Number(result?.exp ?? userStore.user?.exp ?? 0)
    })
    .catch(() => {
      exp.value = Number(userStore.user?.exp || 0)
    })

  getIntegralTasks()
    .then((result: any) => {
      tasks.list = Array.isArray(result?.list) ? result.list : []
      tasks.done_count = Number(result?.done_count || 0)
      tasks.total_count = Number(result?.total_count || tasks.list.length || 0)
    })
    .catch(() => {})

  getUnreadCount()
    .then((result: any) => {
      unreadBadge.value = Number(result?.count || 0) > 0
    })
    .catch(() => {})
}

/* ---------------- 签到 ---------------- */
async function onSignIn(): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (checked.value || signing.value) return
  signing.value = true
  try {
    await signIn()
    toast('签到成功')
    const result = await getCheckinStatus().catch(() => null)
    if (result) checkin.value = result
    loadSummary()
  } catch {
    // 请求层已提示
  } finally {
    signing.value = false
  }
}

/* ---------------- 常用 / 最近使用（本地偏好） ---------------- */
const visibleKeys = ref<string[]>([])
const recentKeys = ref<string[]>([])
const editing = ref(false)
const drawerOpen = ref(false)

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

const visibleShortcuts = computed(
  () => visibleKeys.value.map((key) => CATALOGUE.find((item) => item.key === key)).filter(Boolean) as ShortcutItem[]
)
const hiddenShortcuts = computed(() => CATALOGUE.filter((item) => !visibleKeys.value.includes(item.key)))

function toggleShortcut(item: ShortcutItem): void {
  if (visibleKeys.value.includes(item.key)) {
    visibleKeys.value = visibleKeys.value.filter((key) => key !== item.key)
  } else {
    visibleKeys.value = [...visibleKeys.value, item.key]
  }
  writeStorage(SHORTCUTS_STORE, visibleKeys.value)
}

function loadRecent(): void {
  const raw = readStorage(RECENT_STORE)
  const list = Array.isArray(raw) ? raw : []
  recentKeys.value = list.filter((key: string) => CATALOGUE.some((item) => item.key === key)).slice(0, RECENT_MAX)
}

function pushRecent(item: ShortcutItem): void {
  const next = [item.key, ...recentKeys.value.filter((key) => key !== item.key)].slice(0, RECENT_MAX)
  recentKeys.value = next
  writeStorage(RECENT_STORE, next)
}

/* ---------------- 跳转 ---------------- */
function withUid(path: string): string {
  if (!path.includes('?')) return uid.value > 0 ? `${path}?id=${uid.value}` : path
  return uid.value > 0 ? `${path}&id=${uid.value}` : path
}

function ensureLogin(): boolean {
  if (userStore.isLogin) return true
  toLogin()
  return false
}

function onShortcutTap(item: ShortcutItem): void {
  if (editing.value) {
    toggleShortcut(item)
    return
  }
  if (!item.public && !ensureLogin()) return

  if (item.action === 'compose') {
    drawerOpen.value = false
    uni.navigateTo({ url: '/pages/publish/index' })
    return
  }
  if (item.action === 'checkin') {
    drawerOpen.value = false
    onSignIn()
    return
  }
  if (!item.to) return

  pushRecent(item)
  drawerOpen.value = false
  uni.navigateTo({ url: withUid(item.to) })
}

function goAuthor(): void {
  if (!ensureLogin()) return
  uni.navigateTo({ url: withUid('/pages/user/author') })
}

function goFollow(): void {
  if (!ensureLogin()) return
  uni.navigateTo({ url: withUid('/pages/user/follow') })
}

function goMall(): void {
  uni.reLaunch({ url: '/pages/mall/index' })
}

function goMessage(): void {
  uni.reLaunch({ url: '/pages/message/index' })
}

function openNote(id: number, type: 'article' | 'moment'): void {
  const url = type === 'article' ? `/pages/article/detail?id=${id}` : `/pages/moment/detail?id=${id}`
  uni.navigateTo({ url })
}

function openAgreement(type: string): void {
  drawerOpen.value = false
  uni.navigateTo({ url: `/pages/agreement/index?type=${type}` })
}

function onLogout(): void {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    success: async (res) => {
      if (!res.confirm) return
      await userStore.logout()
      drawerOpen.value = false
      notes.value = []
      loaded.note = false
      loaded.collect = false
      loaded.like = false
      uni.reLaunch({ url: '/pages/index/index' })
    }
  })
}

/* ---------------- 生命周期 ---------------- */
onShow(() => {
  loadShortcutKeys()
  loadRecent()
  loadSummary()
  if (userStore.isLogin) loadTab(true)
})

onPullDownRefresh(async () => {
  await Promise.all([loadTab(true)])
  loadSummary()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
.mine {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: calc(58px + env(safe-area-inset-bottom));
}

/* 顶部工具条 */
.mine-topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 8px 14px;
  padding-top: calc(8px + env(safe-area-inset-top));
  background: var(--bg);
}

.topbar-icon {
  font-size: 20px;
  color: var(--text);
}

.topbar-notice {
  position: relative;
  font-size: 18px;
  color: var(--text);
}

.topbar-notice-dot {
  position: absolute;
  top: 0;
  right: -2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--danger);
  border: 1.5px solid var(--bg);
  box-sizing: border-box;
}

/* 资料卡 */
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

.profile-level {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--xhs-red-soft);
  color: var(--primary);
  font-size: 10px;
  font-weight: 600;
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

/* 签到 / 积分 / 经验 */
.profile-quick {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;
}

.quick-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--bg-card);
  font-size: 11px;
  color: var(--text-soft);
}

.quick-chip .bi {
  font-size: 12px;
  color: var(--primary);
}

.quick-chip.is-done {
  background: var(--xhs-red-soft);
  color: var(--primary-deep);
}

/* 三栏 tab */
.mine-tabs {
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

.mine-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: var(--text-muted);
}

.mine-tab.is-active {
  font-weight: 700;
  color: var(--text);
}

.mine-tab-line {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  background: transparent;
}

.mine-tab.is-active .mine-tab-line {
  background: var(--primary);
}

/* ========== 抽屉 ========== */
.drawer-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.32);
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 301;
  display: flex;
  flex-direction: column;
  width: 82%;
  max-width: 340px;
  background: var(--bg);
  transform: translateX(100%);
  transition: transform 0.24s ease;
}

.drawer.is-open {
  transform: translateX(0);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  padding-top: calc(14px + env(safe-area-inset-top));
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-soft);
}

.drawer-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.drawer-close {
  font-size: 15px;
  color: var(--text-muted);
}

.drawer-body {
  flex: 1;
  padding: 12px;
}

.drawer-card {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
}

.drawer-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.drawer-card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.drawer-card-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.drawer-edit {
  font-size: 12px;
  color: var(--primary);
}

.task-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 12px;
  color: var(--text-soft);
}

.task-icon {
  font-size: 13px;
  color: var(--text-light);
}

.task-name {
  flex: 1;
  min-width: 0;
}

.task-value {
  font-size: 11px;
  color: var(--text-muted);
}

/* 功能宫格 */
.shortcut-grid {
  display: flex;
  flex-wrap: wrap;
}

.shortcut {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 25%;
  padding: 8px 0;
}

.shortcut-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--bg-muted);
  font-size: 17px;
  color: var(--text);
}

.shortcut-icon.is-muted {
  opacity: 0.5;
}

.shortcut-label {
  font-size: 11px;
  color: var(--text-soft);
}

.shortcut-badge {
  position: absolute;
  top: 4px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--text);
  color: #fff;
  font-size: 9px;
}

.shortcut-badge.is-add {
  background: var(--primary);
}

.shortcut-hidden {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border);
}

.shortcut-hidden-tip {
  font-size: 11px;
  color: var(--text-light);
}

/* 协议链接 */
.drawer-links {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border-bottom: 1px solid var(--border-soft);
  font-size: 13px;
  color: var(--text-soft);
}

.drawer-link:last-child {
  border-bottom: none;
}

.drawer-link.is-danger {
  color: var(--primary);
}

.drawer-link-text {
  flex: 1;
}

.drawer-arrow {
  font-size: 12px;
  color: var(--text-light);
}

.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
