/**
 * id 列表归一化工具
 *
 * 后端对 `ids` 的解析有两套口径（见 utils.Unity.Ids）：
 * - DELETE / GET 走 query 传参 → 数组会被序列化成 `ids[]=`，后端拿不到，必须传逗号分隔字符串
 * - POST / PUT 走 JSON body → 直接传数组即可
 */

/** 转逗号分隔字符串（DELETE / GET query 用） */
export function toIds(ids: number | number[]): string {
  return (Array.isArray(ids) ? ids : [ids])
    .map((id) => Number(id))
    .filter((id) => id > 0)
    .join(',')
}

/** 转数字数组（POST / PUT body 用） */
export function toIdsArray(ids: number | number[]): number[] {
  return (Array.isArray(ids) ? ids : [ids]).map((id) => Number(id)).filter((id) => id > 0)
}
