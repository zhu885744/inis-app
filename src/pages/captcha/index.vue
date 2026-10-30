<template>
  <view class="min-h-screen bg-page">
    <view class="nav-bar">
      <view class="flex-center h-8 w-8 rounded-full bg-gray-100" @click="cancel">
        <wd-icon name="arrow-left1" :size="17" color="#4b5563" />
      </view>
      <text class="ml-2 text-15px text-main font-medium">安全验证</text>
    </view>

    <view class="px-4 pt-6">
      <view class="rounded-3 bg-white p-4">
        <view class="flex items-center">
          <text class="text-16px text-main font-semibold">请完成滑块验证</text>
          <text v-if="remainText" class="ml-auto text-11px text-weak">{{ remainText }}</text>
        </view>

        <text class="mt-1 block text-12px text-sub">{{ tip }}</text>

        <!--
          轨道：整条都能按下去拖，不必对准小方块
          鼠标事件是给桌面浏览器（H5 调试 / PC 端）用的 —— 小程序与 App 不会派发 mousedown 这类事件，
          那几个绑定在端上是死代码，但可以忽略；单标签比按端拆两份更省心
        -->
        <view
          class="track"
          :class="{ 'is-disabled': disabled }"
          @touchstart="onStart"
          @touchmove.stop.prevent="onMove"
          @touchend="onEnd"
          @touchcancel="onEnd"
          @mousedown="onStart"
          @mousemove.stop.prevent="onMove"
          @mouseup="onEnd"
          @mouseleave="onEnd"
        >
          <view class="track-fill" :style="{ width: `${offsetRpx}rpx` }" />
          <!-- 缺口：位置由后端下发的 target（百分比）换算 -->
          <view class="gap" :style="{ left: `${gapLeftRpx}rpx` }" />
          <!-- 拼图块 -->
          <view class="piece" :class="{ 'is-passed': passed }" :style="{ left: `${offsetRpx}rpx` }">
            <wd-icon :name="passed ? 'check' : 'arrow-right1'" :size="18" color="#ffffff" />
          </view>
        </view>

        <view class="mt-4 flex items-center">
          <view class="flex-center h-8 w-8 rounded-full bg-gray-100" @click="onRefresh">
            <wd-icon name="refresh" :size="16" color="#6b7280" />
          </view>
          <text class="ml-2 text-12px text-sub" @click="onRefresh">换一题</text>
          <text class="ml-auto px-2 py-1 text-13px text-sub" @click="cancel">取消</text>
        </view>
      </view>

      <view class="mt-3 rounded-3 bg-white p-4">
        <text class="text-11px text-weak leading-relaxed">
          验证通过后会自动继续你刚才的操作，无需重新提交。若反复失败，请稍等一分钟再试。
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import {
  fetchChallenge,
  replaceChallenge,
  sliderChallenge,
  submitSliderCaptcha,
  type SliderTicket
} from '@/utils/captcha'
import { toast } from '@/utils/toast'

/**
 * 滑块验证页
 *
 * 由 utils/captcha.ts 的闸门在收到 428 时拉起，验证结果通过 `uni.$emit` 回传
 * （不是组件弹窗：uni-app 的 App.vue 不渲染视图，全局浮层没有挂载点，
 *  独立页面才能覆盖「任意页面 + 任意请求」触发的风控）。
 *
 * 几何换算：后端下发的是**百分比**（target 10~90、tolerance 3），
 * 前端把可拖动范围也按百分比切分，所以位移要从 px 折回 rpx 再算百分比；
 * 轨道与方块用 rpx 定尺寸，因此只需要 rpx→px 的换算比（屏宽 / 750）。
 */
const TRACK_RPX = 560
const PIECE_RPX = 76
/** 可拖动范围：方块左边缘能走的最大距离 */
const MAX_OFFSET_RPX = TRACK_RPX - PIECE_RPX

const offsetRpx = ref(0)
const dragging = ref(false)
const passed = ref(false)
const startX = ref(0)
const startOffset = ref(0)
const now = ref(Math.floor(Date.now() / 1000))

/** 已把票据（或取消）交回请求层，避免 onUnload 重复提交 */
let settled = false
let timer: ReturnType<typeof setInterval> | null = null
/** rpx → px 的换算比（1rpx = ratio px） */
let rpxRatio = 0.5

const target = computed(() => Number(sliderChallenge.value?.target || 0))
const tolerance = computed(() => Number(sliderChallenge.value?.tolerance ?? 3))

/** 没有 token（取题被限流）时不能拖，只能换一题或退出 */
const disabled = computed(() => !sliderChallenge.value?.token)

const expired = computed(() => {
  const expire = Number(sliderChallenge.value?.expire || 0)
  return expire > 0 && expire <= now.value
})

const gapLeftRpx = computed(() => (MAX_OFFSET_RPX * target.value) / 100)

const tip = computed(() => {
  if (sliderChallenge.value?.limited) return sliderChallenge.value?.message || '操作过于频繁，请稍后再试！'
  if (expired.value) return '验证已过期，请点「换一题」重新获取'
  if (passed.value) return '验证通过，正在继续你的操作…'
  return '拖动滑块，把方块移到虚线缺口处'
})

const remainText = computed(() => {
  const expire = Number(sliderChallenge.value?.expire || 0)
  if (!expire || disabled.value) return ''
  const left = expire - now.value
  if (left <= 0) return '已过期'
  return `剩余 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
})

/** rpx→px 换算比：小程序 / App 没有 html 根元素，只能自己折 */
function measureRatio(): void {
  try {
    const info =
      typeof (uni as any).getWindowInfo === 'function' ? (uni as any).getWindowInfo() : uni.getSystemInfoSync()
    const width = Number(info?.windowWidth || 375)
    if (width > 0) rpxRatio = width / 750
  } catch {
    rpxRatio = 0.5
  }
}

function startTimer(): void {
  stopTimer()
  now.value = Math.floor(Date.now() / 1000)
  timer = setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
  }, 1000)
}

function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}

/** 取触点横坐标：触摸事件读 touches / changedTouches，H5 鼠标事件直接读 clientX */
function pointX(event: any): number {
  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  const value = touch?.clientX ?? touch?.pageX ?? event?.clientX ?? event?.pageX
  return Number(value || 0)
}

function onStart(event: any): void {
  if (disabled.value || expired.value || passed.value) return
  dragging.value = true
  startX.value = pointX(event)
  startOffset.value = offsetRpx.value
}

function onMove(event: any): void {
  if (!dragging.value) return
  const dxRpx = (pointX(event) - startX.value) / rpxRatio
  offsetRpx.value = Math.min(MAX_OFFSET_RPX, Math.max(0, startOffset.value + dxRpx))
  const percent = Math.round((offsetRpx.value / MAX_OFFSET_RPX) * 100)
  passed.value = Math.abs(percent - target.value) <= tolerance.value
}

function onEnd(): void {
  if (!dragging.value) return
  dragging.value = false

  const percent = Math.round((offsetRpx.value / MAX_OFFSET_RPX) * 100)
  const token = String(sliderChallenge.value?.token || '')

  // 本地只拦「明显没对准」的情况，最终判定在服务端（|value - target| <= tolerance）
  if (!token || Math.abs(percent - target.value) > tolerance.value) {
    passed.value = false
    offsetRpx.value = 0
    toast('没对准，再试一次')
    return
  }

  passed.value = true
  const ticket: SliderTicket = { token, value: percent }
  // 留一点时间让「通过」状态可见，再把票据交回请求层
  setTimeout(() => settle(ticket), 240)
}

async function onRefresh(): Promise<void> {
  const fresh = await fetchChallenge()
  if (!fresh?.token) {
    toast(fresh?.message || '获取验证题失败，请稍后再试')
    // 取题失败也把题目清掉，页面变成「不可拖」状态，用户可取消退出
    replaceChallenge(fresh || null)
    return
  }
  offsetRpx.value = 0
  passed.value = false
  replaceChallenge(fresh)
}

function settle(ticket: SliderTicket | null): void {
  if (settled) return
  settled = true
  submitSliderCaptcha(ticket)
}

function cancel(): void {
  settle(null)
}

onLoad(() => {
  measureRatio()
  startTimer()
})

// 用户用系统返回 / 侧滑退出：按「取消」处理，别让原请求一直挂着
onUnload(() => {
  stopTimer()
  if (!settled) {
    settled = true
    uni.$emit('inis:captcha-ticket', null)
  }
})

/** 题目被闸门替换（例如换一题 / 新请求带来的新题）时复位拖动状态 */
watch(sliderChallenge, (value) => {
  offsetRpx.value = 0
  passed.value = false
  dragging.value = false
  if (!value) stopTimer()
})

onUnmounted(stopTimer)
</script>

<style lang="scss" scoped>
.nav-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: var(--bg-card);
  border-bottom: 1px solid $inis-border;
  padding-top: calc(16rpx + env(safe-area-inset-top));
}

.track {
  position: relative;
  height: 88rpx;
  margin-top: 28rpx;
  background: #f1f2f4;
  border-radius: 44rpx;
  overflow: hidden;
}

.track.is-disabled {
  opacity: 0.6;
}

.track-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgba(199, 72, 42, 0.12);
}

.gap {
  position: absolute;
  top: 8rpx;
  width: 76rpx;
  height: 72rpx;
  background: #e5e7eb;
  border: 2rpx dashed #b9bec7;
  border-radius: 12rpx;
}

.piece {
  position: absolute;
  top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 72rpx;
  background: linear-gradient(135deg, $inis-primary-light, $inis-primary-dark);
  border-radius: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(199, 72, 42, 0.35);
}

.piece.is-passed {
  background: linear-gradient(135deg, #4ade80, #16a34a);
  box-shadow: 0 4rpx 12rpx rgba(22, 163, 74, 0.35);
}
</style>
