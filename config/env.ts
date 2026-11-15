/**
 * 运行环境配置
 *
 * uni-app x 没有 `import.meta.env`，接口域名只能写常量。
 * 换环境改这里即可：
 * - App（Android / iOS）：必须写完整域名（后端要把来源加进 CORS 白名单）
 * - H5：写完整域名走跨域；留空则走同源 `/api`
 */
export const API_DOMAIN = 'https://zhuxu.asia'
export const API_PREFIX = '/api'

/** 后端按 source 区分客户端账号体系，移动端统一用这个值 */
export const APP_SOURCE = 'inis-app'
