<template>
  <view class="min-h-screen bg-page">
    <!-- 顶部：标题 + 我的积分 + 双商城切换 -->
    <view class="fixed-head">
      <view class="px-4 pt-2 pb-2">
        <view class="flex items-center justify-between">
          <text class="text-20px text-main font-bold">商城</text>
          <view v-if="userStore.isLogin" class="flex items-center gap-1" @click="goMine">
            <wd-icon name="money-circle" :size="15" color="#c7482a" />
            <text class="text-13px text-primary font-semibold">{{ balanceText }}</text>
          </view>
        </view>

        <view class="mt-3 flex rounded-full bg-gray-100 p-1">
          <view
            v-for="tab in TABS"
            :key="tab.key"
            class="flex-1 flex-center rounded-full py-2"
            :class="active === tab.key ? 'bg-white' : ''"
            @click="switchTab(tab.key)"
          >
            <text class="text-13px" :class="active === tab.key ? 'text-primary font-semibold' : 'text-sub'">
              {{ tab.label }}
            </text>
          </view>
        </view>
      </view>

      <!-- 筛选条：积分商城按分类，装扮商城按类型 -->
      <scroll-view v-if="active === 'goods'" scroll-x class="filter-scroll px-4 pb-2">
        <view
          v-for="item in categories"
          :key="item.category || 'all'"
          class="mr-2 inline-block"
          @click="selectCategory(item.category)"
        >
          <view class="rounded-full px-3 py-1" :class="category === item.category ? 'bg-primary' : 'bg-gray-100'">
            <text class="text-12px" :class="category === item.category ? 'text-white' : 'text-sub'">
              {{ item.name || '全部' }}
            </text>
          </view>
        </view>
      </scroll-view>

      <scroll-view v-else scroll-x class="filter-scroll px-4 pb-2">
        <view class="mr-2 inline-block" @click="selectDecoType('')">
          <view class="rounded-full px-3 py-1" :class="decoType === '' ? 'bg-primary' : 'bg-gray-100'">
            <text class="text-12px" :class="decoType === '' ? 'text-white' : 'text-sub'">全部</text>
          </view>
        </view>
        <view v-for="item in decoTypes" :key="item.type" class="mr-2 inline-block" @click="selectDecoType(item.type)">
          <view class="rounded-full px-3 py-1" :class="decoType === item.type ? 'bg-primary' : 'bg-gray-100'">
            <text class="text-12px" :class="decoType === item.type ? 'text-white' : 'text-sub'">{{ item.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="px-3 pt-3 pb-30">
      <!-- ============ 积分商城 ============ -->
      <template v-if="active === 'goods'">
        <view class="flex flex-wrap -mx-1">
          <view v-for="item in goodsView.items.value" :key="item.id" class="mb-2 w-1/2 px-1">
            <view class="overflow-hidden rounded-3 bg-white">
              <image v-if="item.cover" class="h-36 w-full bg-gray-100" :src="item.cover" mode="aspectFill" />
              <view v-else class="flex-center h-36 bg-gray-100">
                <wd-icon name="shop" :size="26" color="#c0c4cc" />
              </view>

              <view class="p-2">
                <text class="block text-13px text-main font-medium ellipsis">{{ item.title }}</text>
                <view class="mt-1 flex items-center justify-between">
                  <text class="text-14px text-primary font-semibold">{{ formatCount(item.price) }} 积分</text>
                  <text class="text-10px text-weak">{{ goodsStockText(item) }}</text>
                </view>

                <view
                  class="mt-2 flex-center rounded-full py-1"
                  :class="item.can_buy ? 'bg-primary' : 'bg-gray-100'"
                  @click="onBuyGoods(item)"
                >
                  <text class="text-12px" :class="item.can_buy ? 'text-white' : 'text-weak'">
                    {{ item.can_buy ? '兑换' : item.buy_reason || '不可兑换' }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="goodsView.empty.value" class="flex-col-center py-20">
          <text class="text-13px text-weak">暂无商品</text>
        </view>
        <view class="py-4 text-center text-12px text-weak">
          <text>{{ goodsStatus }}</text>
        </view>
      </template>

      <!-- ============ 装扮商城 ============ -->
      <template v-else>
        <!-- 总开关关闭时后端返回 200 + data=null，这里给空态而不是报错 -->
        <view v-if="!decoEnabled" class="flex-col-center py-20">
          <wd-icon name="gift" :size="30" color="#c0c4cc" />
          <text class="mt-2 text-13px text-weak">装扮商城未开启</text>
        </view>

        <template v-else>
          <view class="flex flex-wrap -mx-1">
            <view v-for="item in decoFiltered" :key="item.id" class="mb-2 w-1/2 px-1">
              <view class="overflow-hidden rounded-3 bg-white">
                <view class="relative">
                  <image
                    v-if="item.preview"
                    class="h-36 w-full bg-gray-100"
                    :src="item.preview"
                    mode="aspectFit"
                  />
                  <view v-else class="flex-center h-36 bg-gray-100">
                    <text class="text-13px text-sub">{{ item.name }}</text>
                  </view>

                  <view v-if="isOwned(item)" class="deco-flag">
                    <text class="text-10px text-white">{{ isWearing(item) ? '佩戴中' : '已拥有' }}</text>
                  </view>
                </view>

                <view class="p-2">
                  <text class="block text-13px text-main font-medium ellipsis">{{ item.name }}</text>
                  <view class="mt-1 flex items-center justify-between">
                    <text class="text-14px text-primary font-semibold">{{ decoPriceText(item) }}</text>
                    <text class="text-10px text-weak">{{ decoDurationText(item) }}</text>
                  </view>

                  <view
                    class="mt-2 flex-center rounded-full py-1"
                    :class="decoAction(item) === 'buy' ? 'bg-primary' : 'bg-gray-100'"
                    @click="onTapDecoration(item)"
                  >
                    <text class="text-12px" :class="decoAction(item) === 'buy' ? 'text-white' : 'text-weak'">
                      {{ decoBtnText(item) }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view v-if="!decoLoading && decoFiltered.length === 0" class="flex-col-center py-20">
            <text class="text-13px text-weak">暂无装扮</text>
          </view>
          <view v-if="decoLoading" class="py-4 text-center text-12px text-weak">
            <text>加载中...</text>
          </view>
        </template>
      </template>
    </view>

    <AppTabBar current="mall" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import { getGoodsCategories, getGoodsList, getMyGoodsStats, buyGoods } from '@/api/goods'
import {
  buyDecoration,
  getDecorationShop,
  getMyDecorations,
  wearDecoration
} from '@/api/decoration'
import type {
  DecorationItem,
  DecorationTypeMeta,
  GoodsCategory,
  GoodsItem
} from '@/api/types'
import { usePagedList } from '@/composables/usePagedList'
import { useUserStore } from '@/stores/user'
import { formatCount } from '@/utils/helper'
import { toLogin } from '@/utils/nav'
import { toast } from '@/utils/toast'

type MallTab = 'goods' | 'decoration'

const TABS: { key: MallTab; label: string }[] = [
  { key: 'goods', label: '积分商城' },
  { key: 'decoration', label: '装扮商城' }
]

const userStore = useUserStore()

const active = ref<MallTab>('goods')
const balance = ref<number | null>(null)
const balanceText = computed(() => (balance.value === null ? '--' : formatCount(balance.value)))

/* -------------------- 积分商城 -------------------- */

const categories = ref<GoodsCategory[]>([{ category: '', name: '全部', count: 0 }])
const category = ref('')

const goodsList = usePagedList<GoodsItem>(
  (page, limit) => getGoodsList({ page, limit, category: category.value || undefined }),
  10
)

const goodsView = {
  items: computed(() => goodsList.items.value),
  empty: computed(() => goodsList.isEmpty.value),
  loading: computed(() => goodsList.loading.value),
  finished: computed(() => goodsList.finished.value)
}

const goodsStatus = computed(() => {
  if (goodsView.loading.value) return '加载中...'
  if (goodsView.finished.value && goodsView.items.value.length > 0) return '没有更多了'
  return ''
})

/** 库存文案：列表里 stock 是剩余件数，sold 是已兑换数 */
function goodsStockText(item: GoodsItem): string {
  const stock = Number(item.stock || 0)
  if (stock <= 0) return '已兑完'
  return `剩 ${stock}`
}

async function loadCategories(): Promise<void> {
  try {
    const list = await getGoodsCategories()
    categories.value = Array.isArray(list) && list.length ? list : [{ category: '', name: '全部', count: 0 }]
  } catch {
    categories.value = [{ category: '', name: '全部', count: 0 }]
  }
}

function selectCategory(value: string): void {
  if (category.value === value) return
  category.value = value
  goodsList.refresh()
}

/**
 * 兑换商品
 *
 * 后端 buy 要求实物商品带 address（JSON 字符串），移动端没有地址簿，
 * 所以实物商品直接引导到网页端；虚拟商品（text / card）当场发货。
 */
async function onBuyGoods(item: GoodsItem): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (!item.can_buy) {
    toast(item.buy_reason || '当前不可兑换')
    return
  }
  if (item.type === 'physical') {
    toast('实物商品请在网页端填写收货地址后兑换')
    return
  }

  const ok = await confirm(`确认使用 ${formatCount(item.price)} 积分兑换「${item.title}」？`)
  if (!ok) return

  try {
    const result = await buyGoods(item.id)
    if (typeof result?.integral === 'number') balance.value = result.integral
    toast(result?.deliver_content ? '兑换成功，请在订单中查看卡密' : '兑换成功', 'success')
    goodsList.refresh()
  } catch {
    // 请求层已按业务码弹提示（202 积分不足 / 库存不足 等）
  }
}

/* -------------------- 装扮商城 -------------------- */

const decoEnabled = ref(true)
const decoLoading = ref(false)
const decoLoaded = ref(false)
const decoList = ref<DecorationItem[]>([])
const decoTypes = ref<DecorationTypeMeta[]>([])
const decoType = ref('')
const ownedIds = ref<number[]>([])
const wearingMap = ref<Record<string, DecorationItem>>({})

const decoFiltered = computed(() =>
  decoType.value ? decoList.value.filter((item) => item.type === decoType.value) : decoList.value
)

function selectDecoType(type: string): void {
  decoType.value = type
}

function isOwned(item: DecorationItem): boolean {
  return ownedIds.value.includes(Number(item.id))
}

function isWearing(item: DecorationItem): boolean {
  return Number(wearingMap.value[item.type]?.id || 0) === Number(item.id)
}

function decoPriceText(item: DecorationItem): string {
  const price = Number(item.price || 0)
  if (item.price_type === 'free' || price <= 0) return '免费'
  return `${formatCount(price)} 积分`
}

function decoDurationText(item: DecorationItem): string {
  const duration = Number(item.duration || 0)
  if (duration <= 0) return '永久'
  const days = Math.max(1, Math.round(duration / 86400))
  return `${days} 天`
}

type DecoAction = 'wear' | 'wearing' | 'buy' | 'sold_out' | 'blocked'

function decoAction(item: DecorationItem): DecoAction {
  if (isWearing(item)) return 'wearing'
  if (isOwned(item)) return 'wear'
  if (item.sold_out) return 'sold_out'
  if (item.on_sale === false) return 'blocked'
  return 'buy'
}

function decoBtnText(item: DecorationItem): string {
  switch (decoAction(item)) {
    case 'wearing':
      return '已佩戴'
    case 'wear':
      return '佩戴'
    case 'sold_out':
      return '已售罄'
    case 'blocked':
      return item.buy_reason || '不可兑换'
    default:
      return '兑换'
  }
}

async function loadDecorations(): Promise<void> {
  if (decoLoading.value) return
  decoLoading.value = true
  try {
    const result = await getDecorationShop()
    // 总开关关闭：code=200 但 data=null，不是错误
    if (!result) {
      decoEnabled.value = false
      decoList.value = []
      // 标记已加载，避免每次切到该分区都重新请求（下拉刷新仍会强制重取）
      decoLoaded.value = true
      return
    }
    decoEnabled.value = true
    decoList.value = Array.isArray(result.data) ? result.data : []
    if (Array.isArray(result.types) && result.types.length) decoTypes.value = result.types
    decoLoaded.value = true
  } catch {
    decoList.value = []
  } finally {
    decoLoading.value = false
  }
}

/** 已拥有 / 佩戴中：未登录时后端会 401，这里直接跳过 */
async function loadOwned(): Promise<void> {
  if (!userStore.isLogin) {
    ownedIds.value = []
    wearingMap.value = {}
    return
  }
  try {
    const result = await getMyDecorations()
    const ids: number[] = []
    Object.values(result?.list || {}).forEach((list) => {
      ;(list || []).forEach((item) => ids.push(Number(item.id)))
    })
    ownedIds.value = ids
    wearingMap.value = result?.wearing || {}
  } catch {
    ownedIds.value = []
    wearingMap.value = {}
  }
}

/** 纯样式模板头衔：payload 既无 image 也无 text，佩戴时必须自填文字 */
function needsCustomText(item: DecorationItem): boolean {
  if (item.type !== 'title') return false
  let payload: any = item.payload
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload || '{}')
    } catch {
      payload = {}
    }
  }
  return !payload?.image && !payload?.text
}

async function onTapDecoration(item: DecorationItem): Promise<void> {
  const action = decoAction(item)

  if (action === 'wearing') {
    toast('正在佩戴中')
    return
  }
  if (action === 'sold_out') {
    toast('该装扮已售罄')
    return
  }
  if (action === 'blocked') {
    toast(item.buy_reason || '该装扮暂不可兑换')
    return
  }

  if (!userStore.isLogin) {
    toLogin()
    return
  }

  if (action === 'wear') {
    await onWear(item)
    return
  }

  const ok = await confirm(`确认使用 ${decoPriceText(item)} 兑换「${item.name}」？`)
  if (!ok) return

  try {
    const result = await buyDecoration(item.id)
    if (typeof result?.integral === 'number') balance.value = result.integral
    toast('兑换成功', 'success')
    await Promise.all([loadDecorations(), loadOwned()])
  } catch {
    // 请求层已提示（装扮商城未开启 / 积分不足 / 已售罄 …）
  }
}

async function onWear(item: DecorationItem): Promise<void> {
  let text = ''
  if (needsCustomText(item)) {
    text = await prompt('请输入头衔文字')
    if (!text) {
      toast('请填写头衔文字')
      return
    }
  }

  try {
    await wearDecoration(item.id, text)
    toast('佩戴成功', 'success')
    await loadOwned()
  } catch {
    // 请求层已提示（未开启 / 无拥有记录 / 已过期 …）
  }
}

/* -------------------- 通用 -------------------- */

async function loadBalance(): Promise<void> {
  if (!userStore.isLogin) {
    balance.value = null
    return
  }
  try {
    const stats = await getMyGoodsStats()
    balance.value = Number(stats?.integral || 0)
  } catch {
    balance.value = null
  }
}

function switchTab(key: MallTab): void {
  if (active.value === key) return
  active.value = key
  if (key === 'decoration' && !decoLoaded.value) {
    loadDecorations().then(() => loadOwned())
  }
}

function goMine(): void {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  uni.reLaunch({ url: '/pages/mine/index' })
}

function confirm(content: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '提示',
      content,
      confirmColor: '#c7482a',
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    })
  })
}

function prompt(title: string): Promise<string> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      editable: true,
      placeholderText: '最多 10 个字',
      confirmColor: '#c7482a',
      success: (res) => resolve(res.confirm ? String(res.content || '').trim() : ''),
      fail: () => resolve('')
    })
  })
}

onLoad(() => {
  loadCategories()
  goodsList.refresh()
})

onShow(() => {
  loadBalance()
  if (active.value === 'decoration' && decoLoaded.value) loadOwned()
})

onPullDownRefresh(async () => {
  if (active.value === 'goods') {
    await Promise.all([goodsList.refresh(), loadCategories(), loadBalance()])
  } else {
    await Promise.all([loadDecorations(), loadOwned(), loadBalance()])
  }
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (active.value === 'goods') goodsList.loadMore()
})
</script>

<style lang="scss" scoped>
.fixed-head {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #ffffff;
  border-bottom: 1px solid $inis-border;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

/* 横向筛选条：隐藏滚动条，避免 H5 上出现一条灰杠 */
.filter-scroll {
  white-space: nowrap;
}

.deco-flag {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.5);
}
</style>
