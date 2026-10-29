import { http } from './request'
import type {
  ApiResponse,
  DecorationBuyResult,
  DecorationConfig,
  DecorationItem,
  DecorationShopResult,
  DecorationTypeMeta,
  MyDecorationsResult
} from './types'

/**
 * 装扮商城接口（见 docs/API docs/decoration.md）
 *
 * 与积分商城完全解耦：`decoration/buy` 不写 goods / goods_order，
 * 价格、库存、经验门槛都取自装扮自身，扣的是 users.integral。
 *
 * ⚠️ 总开关 `SYSTEM_DECORATION` 关闭时 `shop` 返回 **200 + data = null**
 * （不是 202），所以这里把返回类型标成可空，调用方必须先判 null。
 */

export interface DecorationShopParams {
  /** avatar_frame / title；空 = 全部 */
  type?: string
  /** free 免费 / paid 付费 / 空或 all = 全部 */
  price_type?: string
}

/** 商城列表：无分页，一次返回全部上架装扮；未开启时返回 null */
export function getDecorationShop(params: DecorationShopParams = {}) {
  return http.get<DecorationShopResult | null>('/decoration/shop', {
    ...(params.type ? { type: params.type } : {}),
    ...(params.price_type ? { price_type: params.price_type } : {})
  })
}

/** 类型元数据 + 配置 */
export function getDecorationTypes() {
  return http.get<{ types: DecorationTypeMeta[]; config: DecorationConfig }>('/decoration/types')
}

/** 装扮配置本体（不是 { config: ... } 包裹） */
export function getDecorationConfig() {
  return http.get<DecorationConfig>('/decoration/config')
}

/** 装扮详情（走 Find，带 result 派生字段） */
export function getDecoration(id: number) {
  return http.get<DecorationItem>('/decoration/one', { id })
}

/** 我的装扮（需登录）：{ types, wearing, list }，list 按类型分组 */
export function getMyDecorations() {
  return http.get<MyDecorationsResult>('/decoration/mine', undefined, { auth: true })
}

/** 我当前佩戴的装扮（需登录） */
export function getWearingDecorations() {
  return http.get<Record<string, DecorationItem>>('/decoration/wearing', undefined, { auth: true })
}

/** 兑换装扮（需登录，202 = 业务拒绝：积分不足 / 售罄 / 未开启…） */
export function buyDecoration(decorationId: number) {
  return http.post<DecorationBuyResult>(
    '/decoration/buy',
    { decoration_id: decorationId },
    { auth: true, loading: '兑换中' }
  )
}

/** 佩戴装扮（需登录）；纯样式模板头衔必须传 text */
export function wearDecoration(decorationId: number, text = '') {
  return http.post<{ wearing: Record<string, DecorationItem> }>(
    '/decoration/wear',
    { decoration_id: decorationId, ...(text ? { text } : {}) },
    { auth: true }
  )
}

/** 卸下某类型的装扮（需登录） */
export function unwearDecoration(type: string) {
  return http.post<{ wearing: Record<string, DecorationItem> }>(
    '/decoration/unwear',
    { type },
    { auth: true }
  )
}

/** 兼容：部分调用方需要拿到完整响应体时用 */
export type DecorationShopResponse = ApiResponse<DecorationShopResult | null>
