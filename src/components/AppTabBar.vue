<template>
  <view class="tabbar-root">
    <!-- 发布面板遮罩：点空白收起（层级低于底栏，方便直接切其它 tab） -->
    <view v-if="publishOpen" class="publish-mask" @click="publishOpen = false" />

    <!-- 发布面板：中间「发布」按钮展开，发文章 / 发动态 -->
    <view v-if="publishOpen" class="publish-panel">
      <view v-for="item in PUBLISH_ACTIONS" :key="item.key" class="publish-item" @click="goPublish(item)">
        <view class="publish-item-icon">
          <text class="bi" :class="item.icon" />
        </view>
        <view class="publish-item-text">
          <text class="strong">{{ item.label }}</text>
          <text class="small">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 底栏：与 Mellow 主题 components/MobileTabBar.vue 同一套视觉 -->
    <view class="mobile-tabbar">
      <view
        v-for="tab in TABS"
        :key="tab.key"
        class="tab-item"
        :class="{ 'is-active': current === tab.key, highlight: tab.center, 'is-open': tab.center && publishOpen }"
        @click="onTabClick(tab)"
      >
        <text v-if="tab.key === 'message' && unreadBadge" class="tab-badge">{{ unreadBadge }}</text>
        <text class="bi tab-icon" :class="tab.icon" />
        <text v-if="tab.label" class="tab-label">{{ tab.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getUnreadCount } from '@/api/notification'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

type TabKey = 'index' | 'mall' | 'message' | 'mine'

interface TabItem {
  key: TabKey | 'publish'
  label: string
  /** bootstrap-icons 类名，与 Mellow 底栏一致 */
  icon: string
  path?: string
  /** 中间凸起的发布按钮 */
  center?: boolean
  /** 进入前必须登录 */
  needLogin?: boolean
}

/**
 * 自定义底部导航（对齐 Mellow 主题 components/MobileTabBar.vue）
 *
 * 没有用 pages.json 的 tabBar：一是原生 tabBar 的图标必须是图片资源，
 * 二是中间需要一个凸起的发布按钮，原生 tabBar 不支持。
 * 因此各页面底部自行引入本组件，跳转用 reLaunch（保证页面栈干净）。
 */
const TABS: TabItem[] = [
  { key: 'index', label: '首页', icon: 'bi-house-door-fill', path: '/pages/index/index' },
  { key: 'mall', label: '商城', icon: 'bi-shop', path: '/pages/mall/index' },
  { key: 'publish', label: '', icon: 'bi-plus-circle-fill', center: true, needLogin: true },
  { key: 'message', label: '消息', icon: 'bi-bell-fill', path: '/pages/message/index', needLogin: true },
  { key: 'mine', label: '我的', icon: 'bi-person-fill', path: '/pages/mine/index', needLogin: true }
]

const props = defineProps<{
  current: TabKey
}>()

const userStore = useUserStore()
const unread = ref(0)
const publishOpen = ref(false)

/** 未读数角标：未登录不显示，超过 99 显示 99+ */
const unreadBadge = ref('')

async function loadUnread(): Promise<void> {
  if (!userStore.isLogin) {
    unread.value = 0
    unreadBadge.value = ''
    return
  }
  try {
    const result = await getUnreadCount()
    unread.value = Number(result?.count || 0)
    unreadBadge.value = unread.value > 0 ? (unread.value > 99 ? '99+' : String(unread.value)) : ''
  } catch {
    unread.value = 0
    unreadBadge.value = ''
  }
}

/// 发布面板入口：App 端暂未提供编辑器，落地为提示（与网页端 /manage 对应）
const PUBLISH_ACTIONS = [
  { key: 'post', label: '发文章', desc: '写一篇图文文章', icon: 'bi-pencil-square' },
  { key: 'moment', label: '发动态', desc: '分享此刻的想法', icon: 'bi-chat-square-dots' }
]

function togglePublish(): void {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  publishOpen.value = !publishOpen.value
}

function goPublish(item: { label: string }): void {
  publishOpen.value = false
  toast(`${item.label}功能开发中`)
}

function onTabClick(tab: TabItem): void {
  if (tab.center) {
    togglePublish()
    return
  }
  if (!tab.path) return
  if (tab.needLogin && !userStore.isLogin) {
    toLogin()
    return
  }
  if (tab.key === props.current) return
  publishOpen.value = false
  uni.reLaunch({ url: tab.path })
}

onMounted(loadUnread)
</script>

<style lang="scss" scoped>
/* ---------------- 底栏 ---------------- */
.tabbar-root {
  /* 面板 / 遮罩都是 fixed，根节点不参与布局 */
  position: relative;
}

.mobile-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 200;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  height: calc(56px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--bg-card);
  border-top: 1px solid var(--border-soft);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
}

.tab-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 2px;
  color: var(--text-muted);
  transition: color 0.2s;
}

.tab-icon {
  font-size: 21px;
  line-height: 1;
  margin-bottom: 3px;
  transition: transform 0.18s ease;
}

.tab-label {
  font-size: 11px;
  line-height: 1;
  letter-spacing: 1px;
}

.tab-badge {
  position: absolute;
  top: 2px;
  left: calc(50% + 6px);
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
  border: 1.5px solid var(--bg-card);
  box-sizing: border-box;
}

.tab-item.is-active {
  color: var(--danger);
}

.tab-item.is-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: var(--danger);
}

/* 中间「发布」按钮：46px 正圆，凸出栏外 */
.tab-item.highlight {
  justify-content: center;
  padding: 0;
}

.tab-item.highlight .tab-icon {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  flex-shrink: 0;
  font-size: 26px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  background-image: var(--gradient-brand);
  border-radius: 50%;
  border: 3px solid var(--bg-card);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}

/* 面板展开时「+」转 45° 变「×」 */
.tab-item.is-open .tab-icon {
  transform: rotate(45deg);
}

/* ---------------- 发布面板 ---------------- */
.publish-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 150;
  background: rgba(0, 0, 0, 0.28);
}

.publish-panel {
  position: fixed;
  right: 12px;
  bottom: calc(56px + env(safe-area-inset-bottom) + 10px);
  left: 12px;
  z-index: 202;
  display: flex;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--border-soft);
  border-radius: 4px;
  background: var(--bg-card);
  box-shadow: var(--shadow-md);
}

.publish-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border-radius: 4px;
  background: transparent;
}

.publish-item:active {
  background: var(--bg-muted);
}

.publish-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--primary-deep);
  font-size: 18px;
}

.publish-item-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.strong {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.small {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
