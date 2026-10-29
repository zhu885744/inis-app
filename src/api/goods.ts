import { http } from './request'
import type { GoodsBuyResult, GoodsCategory, GoodsItem, GoodsStats, PageResult } from './types'

/**
 * 积分商城接口（见 docs/API docs/goods.md）
 *
 * 注意几个和后端实现强相关的点：
 * - 列表返回 `{ data, count, page }`，其中 **page 是总页数**（usePagedList 已按此判断到底）；
 * - `limit` 被 SYSTEM_PAGE_LIMIT 夹到最大 50，传 0 会被改回 10；
 * - 非管理员强制 `status = 1` 且排除 `deliver_type = "decoration"`，
 *   所以装扮商品不会出现在这里，装扮走 api/decoration.ts；
 * - 兑换就是 `POST /api/goods/buy`，没有 exchange 之类的动词。
 */

export interface GoodsListParams {
  page?: number
  limit?: number
  /** 白名单：sort desc, id desc / price asc ... / create_time desc / id asc 等 */
  order?: string
  category?: string
  keyword?: string
}

/** 商品列表（匿名可访问） */
export function getGoodsList(params: GoodsListParams = {}) {
  const { page = 1, limit = 10, order = 'sort desc, id desc', category, keyword } = params
  return http.get<PageResult<GoodsItem>>('/goods/all', {
    page,
    limit,
    order,
    ...(category ? { category } : {}),
    ...(keyword ? { keyword } : {})
  })
}

/** 商品详情（匿名可访问；注意 one 不校验 status，下架商品也能按 id 读到） */
export function getGoods(id: number) {
  return http.get<GoodsItem>('/goods/one', { id })
}

/** 分类聚合：data 直接是数组，首个元素是「全部」 */
export function getGoodsCategories() {
  return http.get<GoodsCategory[]>('/goods/categories')
}

/**
 * 兑换商品
 *
 * `address` 是**收货地址 JSON 字符串**（不是对象），实物商品必填，
 * 形如 `{"name":"张三","phone":"138...","address":"广东省深圳市..."}`。
 */
export function buyGoods(goodsId: number, address?: string) {
  return http.post<GoodsBuyResult>(
    '/goods/buy',
    { goods_id: goodsId, ...(address ? { address } : {}) },
    { auth: true, loading: '兑换中' }
  )
}

/** 我的兑换统计（需登录）：顺带返回当前积分余额 */
export function getMyGoodsStats() {
  return http.get<GoodsStats>('/goods/my-stats', undefined, { auth: true, silent: true })
}
