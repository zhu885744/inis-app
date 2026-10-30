<template>
  <view class="mall-page">
    <view class="goods-page">
      <view class="section-header">
        <view class="section-title">
          <view class="title-bar" />
          <text>积分商城</text>
        </view>
        <view class="link" @click="goMine">
          <text>我的积分</text>
          <text class="bi bi-arrow-right" />
        </view>
      </view>

      <!-- 积分余额卡片 -->
      <view v-if="userStore.isLogin" class="card card-pad balance-card">
        <view class="balance-left">
          <text class="bi bi-coin balance-icon" />
          <view class="balance-info">
            <text class="balance-label">我的积分余额</text>
            <view class="balance-value">
              <text class="balance-num">{{ balanceText }}</text>
              <text class="balance-unit">积分</text>
            </view>
          </view>
        </view>
        <view class="balance-tip">
          <text class="bi bi-lightbulb" />
          <text>通过签到、发布内容等任务赚取积分</text>
        </view>
        <view class="balance-stats">
          <view class="stat-item">
            <text class="stat-num">{{ stats.pending }}</text>
            <text class="stat-label">待发货</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ stats.shipped }}</text>
            <text class="stat-label">已发货</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ stats.completed }}</text>
            <text class="stat-label">已完成</text>
          </view>
          <view class="stat-item">
            <text class="stat-num">{{ stats.integral_spent }}</text>
            <text class="stat-label">累计消耗积分</text>
          </view>
        </view>
      </view>
      <view v-else class="card card-pad balance-card balance-guest">
        <view class="balance-left">
          <text class="bi bi-coin balance-icon" />
          <view class="balance-info">
            <text class="balance-label">登录后查看积分</text>
          </view>
        </view>
        <view class="btn btn-sm btn-primary" @click="toLogin">立即登录</view>
      </view>

      <!-- 商城分区：积分商品 / 装扮 -->
      <view class="shop-tabs">
        <view class="shop-tab" :class="{ 'is-active': activeTab === 'goods' }" @click="switchTab('goods')">
          <text class="bi bi-bag" />
          <text>积分商品</text>
        </view>
        <view class="shop-tab" :class="{ 'is-active': activeTab === 'decoration' }" @click="switchTab('decoration')">
          <text class="bi bi-palette" />
          <text>装扮</text>
        </view>
      </view>

      <!-- ============ 积分商品 ============ -->
      <template v-if="activeTab === 'goods'">
        <view v-if="categories.length > 1" class="category-bar">
          <view
            v-for="item in categories"
            :key="item.category || 'all'"
            class="chip"
            :class="{ 'is-active': category === item.category }"
            @click="selectCategory(item.category)"
          >
            <text>{{ item.name }}</text>
            <text class="chip-count">{{ item.count }}</text>
          </view>
        </view>

        <view v-if="loading && !goodsList.length" class="is-loading">
          <text class="spinner" />
          <text> 加载中...</text>
        </view>

        <view v-else-if="!goodsList.length" class="card card-pad">
          <view class="empty">暂无商品</view>
        </view>

        <view v-else class="goods-grid">
          <view v-for="item in goodsList" :key="item.id" class="goods-card card">
            <view class="goods-cover-wrap">
              <image v-if="item.cover" class="goods-cover" :src="item.cover" mode="aspectFill" />
              <view v-else class="goods-cover goods-cover-empty">
                <text class="bi bi-image" />
              </view>
            </view>
            <view class="goods-body">
              <view class="goods-title">
                <text class="goods-title-text">{{ item.title }}</text>
                <text class="type-tag" :class="item.type === 'physical' ? 'physical' : 'virtual'">
                  {{ item.type === 'physical' ? '实物' : '虚拟' }}
                </text>
              </view>
              <text class="goods-desc">{{ item.description || '暂无描述' }}</text>
              <view class="goods-tags">
                <text v-if="Number(item.limit_per_user) > 0" class="goods-tag">
                  限购 {{ item.limit_per_user }} 件
                </text>
                <text v-if="Number(item.min_exp) > 0" class="goods-tag">
                  需经验 {{ item.min_exp }}
                </text>
                <text v-if="Number(item.sold) > 0" class="goods-tag">已兑 {{ item.sold }}</text>
              </view>
              <view class="goods-foot">
                <text class="goods-price"><text class="bi bi-coin" /> {{ item.price }}</text>
                <text class="goods-stock" :class="{ empty: Number(item.stock) <= 0 }">
                  {{ Number(item.stock) > 0 ? `库存 ${item.stock}` : '已售罄' }}
                </text>
              </view>
              <view
                class="btn btn-primary btn-block"
                :class="{ 'is-disabled': item.can_buy === false || buyingId === item.id }"
                @click="onBuyGoods(item)"
              >
                <text>{{ buyingId === item.id ? '兑换中…' : item.can_buy === false ? item.buy_reason || '不可兑换' : '兑换' }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="goodsLoadingMore" class="is-loading">
          <text class="spinner" />
          <text> 加载中...</text>
        </view>

        <!-- 我的兑换记录 -->
        <template v-if="userStore.isLogin">
          <text class="block-title">我的兑换记录</text>
          <view v-if="!orders.length" class="card card-pad">
            <view class="empty">还没有兑换记录</view>
          </view>
          <view v-else class="order-list">
            <view v-for="order in orders" :key="order.id" class="order-card card">
              <image
                v-if="order.result?.goods?.cover"
                class="order-card-cover"
                :src="order.result?.goods?.cover"
                mode="aspectFill"
              />
              <view class="order-card-body">
                <view class="order-card-head">
                  <text class="order-card-title">
                    {{ order.result?.goods?.title || order.goods_title || `商品 #${order.goods_id}` }}
                  </text>
                  <text class="status-tag" :class="`status-${order.status}`">{{ orderStatusText(order.status) }}</text>
                </view>
                <view class="order-card-meta">
                  <text class="order-card-price"><text class="bi bi-coin" /> {{ order.price }}</text>
                  <text v-if="order.order_no" class="order-card-no">单号 {{ order.order_no }}</text>
                  <text class="order-card-time">{{ formatTime(order.create_time) }}</text>
                </view>
                <view v-if="order.deliver_content" class="order-card-deliver">
                  <text class="deliver-tag">发货</text>
                  <text class="deliver-text">{{ order.deliver_content }}</text>
                </view>
                <view v-else-if="order.logistics" class="order-card-deliver">
                  <text class="deliver-tag">物流</text>
                  <text class="deliver-text">{{ order.logistics }}</text>
                </view>
              </view>
            </view>
          </view>
        </template>
      </template>

      <!-- ============ 装扮 ============ -->
      <template v-else>
        <view v-if="!decoEnabled" class="card card-pad">
          <view class="empty">
            <text class="empty-icon">🎨</text>
            <text>装扮商城未开启</text>
          </view>
        </view>

        <template v-else>
          <view v-if="decoTypes.length > 1" class="category-bar">
            <view class="chip" :class="{ 'is-active': decoType === '' }" @click="selectDecoType('')">
              <text>全部</text>
            </view>
            <view
              v-for="item in decoTypes"
              :key="item.type"
              class="chip"
              :class="{ 'is-active': decoType === item.type }"
              @click="selectDecoType(item.type)"
            >
              <text>{{ item.name }}</text>
            </view>
          </view>

          <view v-if="decoLoading && !decoList.length" class="is-loading">
            <text class="spinner" />
            <text> 加载中...</text>
          </view>

          <view v-else-if="!decoFiltered.length" class="card card-pad">
            <view class="empty">暂无装扮</view>
          </view>

          <view v-else class="goods-grid">
            <view v-for="item in decoFiltered" :key="item.id" class="goods-card card">
              <view class="goods-cover-wrap">
                <image v-if="item.preview" class="goods-cover" :src="item.preview" mode="aspectFit" />
                <view v-else class="goods-cover goods-cover-empty">
                  <text class="deco-name">{{ item.name }}</text>
                </view>
                <text v-if="isOwned(item)" class="goods-state is-end">
                  {{ isWearing(item) ? '佩戴中' : '已拥有' }}
                </text>
              </view>
              <view class="goods-body">
                <view class="goods-title">
                  <text class="goods-title-text">{{ item.name }}</text>
                </view>
                <view class="goods-foot">
                  <text class="goods-price">{{ decoPriceText(item) }}</text>
                  <text class="goods-stock">{{ decoDurationText(item) }}</text>
                </view>
                <view
                  class="btn btn-block"
                  :class="decoAction(item) === 'buy' ? 'btn-primary' : 'btn-ghost'"
                  @click="onTapDecoration(item)"
                >
                  <text>{{ decoBtnText(item) }}</text>
                </view>
              </view>
            </view>
          </view>
        </template>
      </template>
    </view>

    <AppTabBar current="mall" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import AppTabBar from '@/components/AppTabBar.vue'
import { buyGoods, getGoodsCategories, getGoodsList, getMyGoodsStats, getOrders, type GoodsOrderItem } from '@/api/goods'
import { buyDecoration, getDecorationShop, getMyDecorations, wearDecoration } from '@/api/decoration'
import type { DecorationItem, DecorationTypeMeta, GoodsCategory, GoodsItem } from '@/api/types'
import { usePagedList } from '@/composables/usePagedList'
import { useUserStore } from '@/stores/user'
import { formatCount, formatTime } from '@/utils/helper'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 商城（对齐 Mellow 主题 views/goods/Index.vue）
 *
 * 结构：版块标题 → 积分余额卡（含兑换统计）→ 分区切换（积分商品 / 装扮）
 * → 分类胶囊 → 商品网格 → 我的兑换记录。
 *
 * 数据接口与网页端完全一致：goods/all、goods/categories、goods/my-stats、
 * goods/orders、decoration/shop、decoration/my、decoration/buy、decoration/wear。
 */

type MallTab = 'goods' | 'decoration'

const userStore = useUserStore()

const activeTab = ref<MallTab>('goods')

/* ---------------- 余额与统计 ---------------- */
const balance = ref<number | null>(null)
const stats = reactive({ pending: 0, shipped: 0, completed: 0, integral_spent: 0 })

const balanceText = computed(() => (balance.value === null ? '--' : formatCount(balance.value)))

async function loadBalance(): Promise<void> {
  if (!userStore.isLogin) {
    balance.value = null
    stats.pending = 0
    stats.shipped = 0
    stats.completed = 0
    stats.integral_spent = 0
    return
  }
  try {
    const result: any = await getMyGoodsStats()
    if (!result) return
    balance.value = Number(result.integral || 0)
    stats.pending = Number(result.pending || 0)
    stats.shipped = Number(result.shipped || 0)
    stats.completed = Number(result.completed || 0)
    stats.integral_spent = Number(result.integral_spent || 0)
  } catch {
    balance.value = null
  }
}

/* ---------------- 积分商品 ---------------- */
const categories = ref<GoodsCategory[]>([])
const category = ref('')
const buyingId = ref(0)

const goodsPager = usePagedList<GoodsItem>(
  (page, limit) => getGoodsList({ page, limit, category: category.value || undefined }),
  10
)

const goodsList = goodsPager.items
const loading = computed(() => goodsPager.loading.value)
const goodsLoadingMore = computed(() => goodsPager.loading.value && goodsPager.items.value.length > 0)

async function loadCategories(): Promise<void> {
  try {
    const list = await getGoodsCategories()
    categories.value = Array.isArray(list) ? list : []
  } catch {
    categories.value = []
  }
}

function selectCategory(value: string): void {
  if (category.value === value) return
  category.value = value
  goodsPager.refresh()
}

async function onBuyGoods(item: GoodsItem): Promise<void> {
  if (!userStore.isLogin) {
    toLogin()
    return
  }
  if (item.can_buy === false) {
    toast(item.buy_reason || '当前不可兑换')
    return
  }
  if (buyingId.value) return
  if (item.type === 'physical') {
    toast('实物商品请在网页端填写收货地址后兑换')
    return
  }

  const ok = await confirm(`确认使用 ${formatCount(item.price)} 积分兑换「${item.title}」？`)
  if (!ok) return

  buyingId.value = Number(item.id)
  try {
    const result = await buyGoods(item.id)
    if (typeof result?.integral === 'number') balance.value = result.integral
    toast(result?.deliver_content ? '兑换成功，请在兑换记录中查看卡密' : '兑换成功', 'success')
    goodsPager.refresh()
    loadBalance()
    loadOrders()
  } catch {
    // 请求层已按业务码提示
  } finally {
    buyingId.value = 0
  }
}

/* ---------------- 我的兑换记录 ---------------- */
const orders = ref<GoodsOrderItem[]>([])

const ORDER_STATUS: Record<number, string> = {
  0: '待发货',
  1: '已发货',
  2: '已完成',
  3: '已取消'
}

function orderStatusText(status?: number): string {
  return ORDER_STATUS[Number(status ?? 0)] || '未知'
}

async function loadOrders(): Promise<void> {
  if (!userStore.isLogin) {
    orders.value = []
    return
  }
  try {
    const result = await getOrders({ limit: 5 })
    orders.value = Array.isArray(result?.data) ? result.data : []
  } catch {
    orders.value = []
  }
}

/* ---------------- 装扮 ---------------- */
const decoEnabled = ref(true)
const decoLoading = ref(false)
const decoList = ref<DecorationItem[]>([])
const decoTypes = ref<DecorationTypeMeta[]>([])
const decoType = ref('')
const ownedIds = ref<number[]>([])
const wearingMap = ref<Record<string, DecorationItem>>({})

const decoFiltered = computed(() =>
  decoType.value ? decoList.value.filter((item) => item.type === decoType.value) : decoList.value
)

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
  return `${Math.max(1, Math.round(duration / 86400))} 天`
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
    if (!result) {
      decoEnabled.value = false
      decoList.value = []
      return
    }
    decoEnabled.value = true
    decoList.value = Array.isArray(result.data) ? result.data : []
    if (Array.isArray(result.types) && result.types.length) decoTypes.value = result.types
  } catch {
    decoList.value = []
  } finally {
    decoLoading.value = false
  }
}

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
    // 请求层已提示
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
    // 请求层已提示
  }
}

function selectDecoType(type: string): void {
  decoType.value = type
}

/* ---------------- 通用 ---------------- */
function switchTab(key: MallTab): void {
  if (activeTab.value === key) return
  activeTab.value = key
  if (key === 'decoration' && !decoList.value.length) {
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

onLoad((options) => {
  // 「我的」里的装扮商城入口带 ?tab=decoration 直达
  if (String((options as any)?.tab || '') === 'decoration') activeTab.value = 'decoration'
  loadCategories()
  goodsPager.refresh()
  if (activeTab.value === 'decoration') loadDecorations().then(() => loadOwned())
})

onShow(() => {
  loadBalance()
  loadOrders()
  if (activeTab.value === 'decoration') loadOwned()
})

onPullDownRefresh(async () => {
  if (activeTab.value === 'goods') {
    await Promise.all([goodsPager.refresh(), loadCategories(), loadBalance(), loadOrders()])
  } else {
    await Promise.all([loadDecorations(), loadOwned(), loadBalance()])
  }
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  if (activeTab.value === 'goods') goodsPager.loadMore()
})
</script>

<style lang="scss" scoped>
.mall-page {
  min-height: 100vh;
  background: var(--bg);
  background-image: var(--gradient-page);
  padding: 14px 14px calc(76px + env(safe-area-inset-bottom));
}

.goods-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 版块标题：与 Mellow SectionTitle 一致（900 衬线 + 朱砂竖条） */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  display: flex;
  align-items: center;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--text);
}

.title-bar {
  width: 4px;
  height: 20px;
  margin-right: 10px;
  border-radius: 2px;
  background: var(--primary);
}

.link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-muted);
}

/* ---------------- 余额卡 ---------------- */
.balance-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
  background: linear-gradient(135deg, var(--gold-soft), var(--accent-wash));
  border: 1px solid var(--gold-line);
}

.balance-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.balance-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.balance-icon {
  flex-shrink: 0;
  font-size: 34px;
  color: #d4a148;
}

.balance-label {
  font-size: 12px;
  color: var(--text-muted);
}

.balance-value {
  display: flex;
  align-items: baseline;
  gap: 5px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--primary-deep);
}

.balance-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}

.balance-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}

.balance-stats {
  flex-basis: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding-top: 12px;
  border-top: 1px dashed var(--gold-line);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-num {
  font-size: 17px;
  font-weight: 700;
  color: #d4a148;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* ---------------- 分区切换 ---------------- */
.shop-tabs {
  display: flex;
  align-self: flex-start;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--bg-muted);
}

.shop-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 18px;
  border-radius: 8px;
  color: var(--text-soft);
  font-size: 14px;
  font-weight: 500;
}

.shop-tab.is-active {
  background: var(--bg-card);
  color: var(--primary-deep);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* ---------------- 分类胶囊 ---------------- */
.category-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.5;
}

.chip.is-active {
  background: var(--accent-soft);
  border-color: var(--primary);
  color: var(--primary-deep);
  font-weight: 600;
}

.chip-count {
  font-size: 11px;
  color: var(--text-muted);
}

.chip.is-active .chip-count {
  color: var(--primary-deep);
}

/* ---------------- 商品网格 ---------------- */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.goods-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.goods-cover-wrap {
  position: relative;
  width: 100%;
  height: 110px;
  overflow: hidden;
  background: var(--bg-muted);
}

.goods-cover {
  display: block;
  width: 100%;
  height: 100%;
}

.goods-cover-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  font-size: 22px;
}

.deco-name {
  font-size: 14px;
  color: var(--text-muted);
}

.goods-state {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 9px;
  font-size: 11px;
  line-height: 1.6;
  color: #fff;
  border-radius: 999px;
  background: rgba(50, 46, 38, 0.72);
}

.goods-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.goods-title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.goods-title-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-tag {
  flex-shrink: 0;
  margin-left: 6px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 400;
  border-radius: 999px;
}

.type-tag.virtual {
  background: var(--accent-soft);
  color: var(--primary-deep);
}

.type-tag.physical {
  background: var(--gold-soft);
  color: #c7902f;
}

.goods-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.goods-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.goods-tag {
  padding: 1px 8px;
  font-size: 11px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-muted);
  white-space: nowrap;
}

.goods-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.goods-price {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 16px;
  font-weight: 700;
  color: #d4a148;
}

.goods-price .bi {
  font-size: 13px;
}

.goods-stock {
  font-size: 12px;
  color: var(--text-muted);
}

.goods-stock.empty {
  color: var(--danger);
}

.btn-block {
  width: 100%;
  margin-top: 2px;
}

/* ---------------- 兑换记录 ---------------- */
.block-title {
  margin: 6px 0 0;
  padding-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  border-bottom: 1px solid var(--border-soft);
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  display: flex;
  gap: 12px;
  padding: 12px;
}

.order-card-cover {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.order-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.order-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-card-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.status-tag {
  flex-shrink: 0;
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-soft);
}

.status-tag.status-1 {
  background: rgba(74, 144, 226, 0.12);
  color: #4a90e2;
}

.status-tag.status-2 {
  background: rgba(46, 122, 92, 0.12);
  color: var(--success);
}

.status-tag.status-3 {
  color: var(--text-light);
}

.order-card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.order-card-price {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #d4a148;
  font-weight: 600;
}

.order-card-deliver {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}

.deliver-tag {
  flex-shrink: 0;
  padding: 0 6px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--primary-deep);
}

.deliver-text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-soft);
  word-break: break-all;
}

.is-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  font-size: 13px;
  color: var(--text-muted);
}

.card-pad {
  padding: 16px;
}
</style>
