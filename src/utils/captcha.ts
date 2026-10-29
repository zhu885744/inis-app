import { ref } from 'vue'
import { getCaptcha } from '@/api/comm'
import { toast } from '@/utils/toast'

/**
 * 通用滑块验证「闸门」
 *
 * 后端契约（见 app/model/captcha.go 与 api/middleware 里的 428 拦截）：
 * - 触发风控时任意接口返回 `code=428`，**题目随响应一起下发**：`data.captcha = { token, target, width, tolerance, expire }`
 * - `target` 是**落点百分比（10~90）**，不是像素；`tolerance` 固定 3
 * - 没有独立的校验接口：把 `captcha_token` + `captcha_value`（落点百分比）补进**原请求**重放，
 *   中间件在那次请求里就地校验，通过后继续走原来的业务逻辑
 * - 判定口径：`|captcha_value - target| <= tolerance`；同一 token 连错 3 次作废；有效期 5 分钟
 * - 同 IP 每分钟取题 ≥20 次会被限流，此时返回 { limited: true, message }（没有 token）
 *
 * 交互实现：uni-app 的 App.vue 不渲染视图，全局浮层没有天然挂载点，
 * 所以这里走「独立验证页 + uni.$emit 回传票据」——任何页面、任何请求撞上 428 都能覆盖到，
 * 不必在每个页面模板里挂一次弹窗组件。
 */

export interface SliderChallenge {
  token?: string
  /** 缺口落点：0~100 的百分比（后端取值 10~90） */
  target?: number
  /** 容差（百分比），后端固定 3 */
  tolerance?: number
  /** 题目过期时间戳（unix 秒），有效 5 分钟 */
  expire?: number
  /** 轨道参考宽度（后端固定 300，仅参考，前端按自己渲染的尺寸换算） */
  width?: number
  /** 取题被限流：没有 token，只有 message */
  limited?: boolean
  message?: string
}

export interface SliderTicket {
  token: string
  /** 用户拖动后的落点百分比（0~100 整数） */
  value: number
}

/** 当前题目：验证页渲染它；为空代表没有进行中的验证 */
export const sliderChallenge = ref<SliderChallenge | null>(null)

/** 验证页把票据（或 null 表示取消）回传过来的全局事件名 */
const TICKET_EVENT = 'inis:captcha-ticket'

/** 等待票据的调用方：多个请求同时撞上 428 时共用同一张票据重放 */
let waiters: ((ticket: SliderTicket | null) => void)[] = []
/** 验证页是否已经在展示（避免叠加第二个页面） */
let sessionActive = false

function flush(ticket: SliderTicket | null): void {
  const pending = waiters
  waiters = []
  pending.forEach((resolve) => resolve(ticket))
}

/** 主动取一道新题（「换一题」也用它） */
export async function fetchChallenge(): Promise<SliderChallenge | null> {
  try {
    return await getCaptcha()
  } catch {
    return null
  }
}

/** 验证页在「换一题」时替换当前题目 */
export function replaceChallenge(challenge: SliderChallenge | null): void {
  sliderChallenge.value = challenge
}

/**
 * 请求用户完成滑块验证
 *
 * @param challenge 428 响应里带下来的题目；缺失（或没有 token）时会主动拉一次新题
 * @returns 票据；用户取消 / 取题失败 / 跳转失败时返回 null
 */
export async function requestSliderCaptcha(challenge?: SliderChallenge | null): Promise<SliderTicket | null> {
  const promise = new Promise<SliderTicket | null>((resolve) => {
    waiters.push(resolve)
  })

  // 验证页已在展示：只排队等票据，不再跳一次
  if (sessionActive) return promise

  if (challenge?.limited) {
    toast(challenge.message || '操作过于频繁，请稍后再试！')
    flush(null)
    return promise
  }

  if (challenge?.token) {
    sliderChallenge.value = challenge
  } else {
    const fresh = await fetchChallenge()
    if (fresh?.limited) {
      toast(fresh.message || '操作过于频繁，请稍后再试！')
      flush(null)
      return promise
    }
    if (!fresh?.token) {
      toast('获取验证题失败，请稍后再试')
      flush(null)
      return promise
    }
    sliderChallenge.value = fresh
  }

  sessionActive = true

  const handler = (ticket: SliderTicket | null) => {
    sessionActive = false
    sliderChallenge.value = null
    flush(ticket)
  }

  uni.$once(TICKET_EVENT, handler)

  uni.navigateTo({
    url: '/pages/captcha/index',
    fail: () => {
      // 页面栈满了（>10 层）：撤回监听，交回原始的 428 错误
      uni.$off(TICKET_EVENT, handler)
      sessionActive = false
      sliderChallenge.value = null
      toast('页面打开层数过多，请返回后再试')
      flush(null)
    }
  })

  return promise
}

/**
 * 验证页提交（ticket 传 null 表示取消）
 * 先广播票据（此时请求层会拿到并重放原请求），再退回上一页
 */
export function submitSliderCaptcha(ticket: SliderTicket | null): void {
  uni.$emit(TICKET_EVENT, ticket)
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
}

/** 把票据合进请求参数：uni.request 对 GET 拼进 query、其余方法作为 body，后端两种都读 */
export function withCaptcha<T extends Record<string, any> | undefined>(
  data: T,
  ticket: SliderTicket
): Record<string, any> {
  return { ...(data || {}), captcha_token: ticket.token, captcha_value: ticket.value }
}
