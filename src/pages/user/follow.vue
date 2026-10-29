<template>
  <view class="min-h-screen bg-page">
    <view class="nav-bar">
      <view class="flex-center h-8 w-8 rounded-full bg-gray-100" @click="back">
        <wd-icon name="arrow-left1" :size="17" color="#4b5563" />
      </view>
      <text class="ml-2 text-15px text-main font-medium">{{ title }}</text>
    </view>

    <view class="px-3 pt-3 pb-30">
      <!-- 隐私保护：对方把关注 / 粉丝列表设成了私密 -->
      <view v-if="isPrivate" class="mt-10 flex-col-center">
        <view class="flex-center mb-4 h-16 w-16 rounded-full bg-gray-100">
          <wd-icon name="lock-on" :size="30" color="#c0c4cc" />
        </view>
        <text class="text-14px text-sub">对方设置了私密，无法查看</text>
      </view>

      <template v-else>
        <view v-if="view.loading.value && !list.length" class="py-20 text-center">
          <text class="text-12px text-weak">加载中…</text>
        </view>

        <view v-else-if="view.empty.value" class="py-20 text-center">
          <text class="text-13px text-weak">{{ type === 'following' ? '还没有关注任何人' : '还没有粉丝' }}</text>
        </view>

        <template v-else>
          <view class="overflow-hidden rounded-3 bg-white">
            <view
              v-for="(item, index) in list"
              :key="item.id"
              class="flex items-center gap-3 px-4 py-3"
              :class="{ 'border-t border-line': index > 0 }"
              @click="openAuthor(userOf(item).id)"
            >
              <image class="h-10 w-10 flex-none rounded-full bg-gray-100" :src="userOf(item).avatar" mode="aspectFill" />
              <view class="min-w-0 flex-1">
                <view class="flex items-center">
                  <text class="max-w-30 text-14px text-main font-medium ellipsis">{{ userOf(item).nickname }}</text>
                  <TitleBadge :payload="titleOf(item).payload" :text="titleOf(item).text" />
                </view>
                <text class="mt-1 block text-11px text-weak ellipsis">
                  {{ userOf(item).description || '这个人很懒，什么都没写' }}
                </text>
              </view>
              <wd-icon name="chevron-right" :size="15" color="#c0c4cc" />
            </view>
          </view>

          <view class="py-3 text-center" @click="pager.loadMore()">
            <text class="text-12px text-primary">{{ view.loading.value ? '加载中…' : view.finished.value ? '没有更多了' : '加载更多' }}</text>
          </view>
        </template>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import TitleBadge from '@/components/TitleBadge.vue'
import { getFollowers, getFollowing } from '@/api/follow'
import type { AuthorInfo, FollowItem, PageResult } from '@/api/types'
import { usePagedList } from '@/composables/usePagedList'
import { pickUserTitlePayload, pickUserTitleText } from '@/utils/helper'

/**
 * 关注 / 粉丝列表（user-follows/following | followers）
 *
 * 未登录也能看（`uid` 必传）。对方在隐私设置里把列表设为私密时，
 * 后端返回 `{ private: true }`（HTTP 仍是 200），这里单独提示，不能只判空列表。
 */
type FollowListType = 'following' | 'followers'

const uid = ref(0)
const type = ref<FollowListType>('following')
const isPrivate = ref(false)
const title = ref('关注')

const pager = usePagedList<FollowItem>(async (page, limit) => {
  const result: any =
    type.value === 'followers' ? await getFollowers(uid.value, page, limit) : await getFollowing(uid.value, page, limit)

  isPrivate.value = Boolean(result?.private)
  return result as PageResult<FollowItem>
}, 20)

const list = pager.items

const view = {
  loading: computed(() => pager.loading.value),
  empty: computed(() => pager.isEmpty.value),
  finished: computed(() => pager.finished.value)
}

/** 列表项里关注对象在 result.follow_user，粉丝列表也是同名字段（后端统一口径） */
function userOf(item: FollowItem): AuthorInfo {
  const user = item?.result?.follow_user
  return {
    id: Number(user?.id || item?.follow_uid || item?.uid || 0),
    nickname: user?.nickname || '用户',
    avatar: user?.avatar || '',
    description: user?.description,
    title: user?.title,
    json: user?.json
  }
}

function titleOf(item: FollowItem) {
  const user = userOf(item)
  return { payload: pickUserTitlePayload(user), text: pickUserTitleText(user) }
}

function openAuthor(id: number): void {
  if (id > 0) uni.navigateTo({ url: `/pages/user/author?id=${id}` })
}

function back(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else uni.reLaunch({ url: '/pages/index/index' })
}

onLoad((options) => {
  uid.value = Number(options?.id || 0)
  type.value = String(options?.type || 'following') === 'followers' ? 'followers' : 'following'
  title.value = type.value === 'followers' ? '粉丝' : '关注'
  if (!uid.value) {
    uni.showToast({ title: '缺少用户 id', icon: 'none' })
    return
  }
  pager.refresh()
})

onReachBottom(() => {
  pager.loadMore()
})
</script>

<style lang="scss" scoped>
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-bottom: 1px solid $inis-border;
  padding-top: calc(16rpx + env(safe-area-inset-top));
}
</style>
