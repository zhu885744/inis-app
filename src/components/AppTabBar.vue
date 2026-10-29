<template>
  <view class="app-tabbar">
    <view class="app-tabbar__bar">
      <view v-for="item in TABS" :key="item.key" class="app-tabbar__item" @click="go(item)">
        <!-- 中间凸起的发布按钮 -->
        <view v-if="item.center" class="app-tabbar__plus">
          <wd-icon name="add" :size="24" color="#ffffff" />
        </view>

        <template v-else>
          <view class="app-tabbar__icon">
            <wd-icon
              :name="item.icon"
              :size="21"
              :color="item.key === current ? ACTIVE_COLOR : INACTIVE_COLOR"
            />
            <!-- 消息未读角标（进入页面时拉一次，后端无推送） -->
            <view v-if="item.key === 'message' && unread > 0" class="app-tabbar__badge">
              <text class="app-tabbar__badge-text">{{ unread > 99 ? '99+' : unread }}</text>
            </view>
          </view>
          <text class="app-tabbar__label" :class="{ 'is-active': item.key === current }">{{ item.label }}</text>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getUnreadCount } from '@/api/notification'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

type TabKey = 'index' | 'mall' | 'publish' | 'message' | 'mine'

interface TabItem {
  key: TabKey
  label: string
  icon: string
  path?: string
  /** 中间凸起的发布按钮 */
  center?: boolean
}

const ACTIVE_COLOR = '#c7482a'
const INACTIVE_COLOR = '#9ca3af'

/**
 * 自定义底部导航
 *
 * 没有用 pages.json 的 tabBar：一是原生 tabBar 的图标必须是图片资源，
 * 二是参考 UI 需要一个中间凸起的发布按钮，原生 tabBar 不支持。
 * 因此各页面底部自行引入本组件，跳转用 reLaunch（保证页面栈干净）。
 */
const TABS: TabItem[] = [
  { key: 'index', label: '首页', icon: 'home', path: '/pages/index/index' },
  { key: 'mall', label: '商城', icon: 'shop', path: '/pages/mall/index' },
  { key: 'publish', label: '', icon: 'add', center: true },
  { key: 'message', label: '消息', icon: 'chat', path: '/pages/message/index' },
  { key: 'mine', label: '我的', icon: 'user', path: '/pages/mine/index' }
]

const props = defineProps<{
  current: TabKey
}>()

const userStore = useUserStore()
const unread = ref(0)

/** 消息未读数：后端没有推送，进入页面时拉一次（读取失败就不显示角标） */
onMounted(async () => {
  if (!userStore.isLogin) return
  try {
    const result = await getUnreadCount()
    unread.value = Number(result?.count || 0)
  } catch {
    unread.value = 0
  }
})

function go(item: TabItem): void {
  if (item.center) {
    toast('发布功能开发中')
    return
  }
  if (item.key === props.current || !item.path) return
  uni.reLaunch({ url: item.path })
}
</script>

<style lang="scss" scoped>
.app-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 99;
  background: #ffffff;
  border-top: 1px solid $inis-border;
  /* iPhone 底部安全区 */
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.app-tabbar__bar {
  display: flex;
  align-items: center;
  height: 100rpx;
}

.app-tabbar__item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.app-tabbar__icon {
  position: relative;
}

.app-tabbar__badge {
  position: absolute;
  top: -8rpx;
  right: -16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 6rpx;
  background: #ef4444;
  border-radius: 14rpx;
}

.app-tabbar__badge-text {
  font-size: 17rpx;
  font-weight: 600;
  color: #ffffff;
}

.app-tabbar__label {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: $inis-text-muted;
}

.app-tabbar__label.is-active {
  color: $inis-primary;
  font-weight: 600;
}

.app-tabbar__plus {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  margin-top: -40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $inis-primary-light, $inis-primary-dark);
  box-shadow: 0 8rpx 20rpx rgba(199, 72, 42, 0.35);
}
</style>
