import { http } from './request'

/**
 * 站点配置（config/one）
 *
 * 网页主题把站点级开关与文案统一存在 `Mellow_functions` 这一条配置里，
 * 返回值形如 `{ json: {...} }`（老库可能直接是对象），这里做一次归一化。
 */

export function getConfig(key: string) {
  return http.get<Record<string, any>>('/config/one', { key }, { silent: true })
}

/** 读取 Mellow 主题的站点配置（登录协议等文案都在里面） */
export async function getSiteConfig(): Promise<Record<string, any>> {
  try {
    const result: any = await getConfig('Mellow_functions')
    const info = result?.json ?? result ?? {}
    return info && typeof info === 'object' ? info : {}
  } catch {
    return {}
  }
}
