<template>
  <!-- 底部导航：小红书式五格（首页 / 购物 / 发布 / 消息 / 我） -->
  <view class="xhs-tabbar">
    <view
      v-for="tab in TABS"
      :key="tab.key"
      class="xhs-tabbar-item"
      :class="{ 'is-active': current === tab.key }"
      @click="onTabClick(tab)"
    >
      <!-- 中间发布：红色圆角方块，与小红书一致 -->
      <view v-if="tab.center" class="xhs-publish">
        <text class="bi bi-plus-lg" />
      </view>

      <block v-else>
        <view class="xhs-icon-wrap">
          <text class="bi xhs-icon" :class="current === tab.key ? tab.iconActive : tab.icon" />
          <text v-if="tab.key === 'message' && unreadBadge" class="xhs-badge">{{ unreadBadge }}</text>
        </view>
        <text class="xhs-label">{{ tab.label }}</text>
      </block>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getUnreadCount } from '@/api/notification'
import { useUserStore } from '@/stores/user'
import { toLogin } from '@/utils/nav'

type TabKey = 'index' | 'mall' | 'message' | 'mine'

interface TabItem {
  key: TabKey | 'publish'
  label: string
  /** 未激活：线性图标 */
  icon: string
  /** 激活：填充图标（小红书底部导航选中态是实心） */
  iconActive: string
  path?: string
  /** 中间凸起的发布按钮 */
  center?: boolean
  /** 进入前必须登录 */
  needLogin?: boolean
}

/**
 * 自定义底部导航（小红书版）
 *
 * 没有用 pages.json 的 tabBar：原生 tabBar 图标必须是图片资源，
 * 且中间需要一个红色发布方块，原生不支持。因此各页面底部自行引入，
 * 跳转统一用 reLaunch（保证页面栈干净）。
 */
const TABS: TabItem[] = [
  { key: 'index', label: '首页', icon: 'bi-house', iconActive: 'bi-house-fill', path: '/pages/index/index' },
  { key: 'mall', label: '购物', icon: 'bi-bag', iconActive: 'bi-bag-fill', path: '/pages/mall/index' },
  { key: 'publish', label: '', icon: '', iconActive: '', center: true, needLogin: true },
  {
    key: 'message',
    label: '消息',
    icon: 'bi-chat-dots',
    iconActive: 'bi-chat-dots-fill',
    path: '/pages/message/index',
    needLogin: true
  },
  { key: 'mine', label: '我', icon: 'bi-person', iconActive: 'bi-person-fill', path: '/pages/mine/index', needLogin: true }
]

const props = defineProps<{
  current: TabKey
}>()

const userStore = useUserStore()
const unreadBadge = ref('')

async function loadUnread(): Promise<void> {
  if (!userStore.isLogin) {
    unreadBadge.value = ''
    return
  }
  try {
    const result = await getUnreadCount()
    const count = Number(result?.count || 0)
    unreadBadge.value = count > 0 ? (count > 99 ? '99+' : String(count)) : ''
  } catch {
    unreadBadge.value = ''
  }
}

function onTabClick(tab: TabItem): void {
  if (tab.needLogin && !userStore.isLogin) {
    toLogin()
    return
  }
  // 发布：直接进编辑器（小红书点「+」也是直发，不弹二级面板）
  if (tab.center) {
    uni.navigateTo({ url: '/pages/publish/index' })
    return
  }
  if (!tab.path || tab.key === props.current) return
  uni.reLaunch({ url: tab.path })
}

onMounted(loadUnread)
</script>

<style lang="scss" scoped>
.xhs-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: calc(52px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--bg-card);
  border-top: 1px solid var(--border-soft);
}

.xhs-tabbar-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 100%;
  color: #b0b0b0;
}

.xhs-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
}

.xhs-icon {
  font-size: 20px;
  line-height: 1;
}

.xhs-label {
  font-size: 10px;
  line-height: 1.2;
  letter-spacing: 0.02em;
}

/* 选中：黑色实心图标（小红书不是用品牌红做选中态） */
.xhs-tabbar-item.is-active {
  color: var(--text);
}

.xhs-tabbar-item.is-active .xhs-label {
  font-weight: 600;
}

/* 发布按钮：46×32 圆角 8 的红色方块 */
.xhs-publish {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 32px;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  box-shadow: 0 3px 10px rgba(255, 36, 66, 0.28);
}

.xhs-publish .bi {
  font-size: 19px;
  font-weight: 700;
}

.xhs-publish:active {
  transform: scale(0.94);
}

/* 未读数：贴在图标右上角 */
.xhs-badge {
  position: absolute;
  top: -4px;
  left: 50%;
  margin-left: 4px;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  line-height: 15px;
  text-align: center;
  box-sizing: border-box;
}
</style>
