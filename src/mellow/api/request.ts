/**
 * Mellow 移植层的请求适配（P0 地基）
 *
 * 目的：让从 Mellow 复制过来的 `api/*.js` 与页面代码「零改动」跑在 uni-app 里。
 *
 * 与 Mellow/src/api/request.js 的行为对齐：
 *   - 暴露同样的 `call(controller, method, { method, params, data })`
 *   - resolve 的是**完整响应体** `{ code, msg, data }`（Mellow 页面大量判 `res.code === 200`）
 *   - 业务失败时 reject 完整响应体（Mellow 的 axios 拦截器同样 reject），页面里的 catch 行为一致
 *   - 428 滑块：自动弹全局滑块并在通过后重放原请求，业务代码无感知
 *
 * 与项目原有 `@/api/request` 的区别：那个把 `data` 直接 resolve 出来，是 inis-app 现有页面的风格；
 * 这里保留 Mellow 的 `{ code, msg, data }` 结构，两套并存，互不影响。
 */
import { resolveUrl } from '@/mellow/api/request'
import { clearToken, clearUserCache, getToken } from '@/mellow/utils/storage'
import { requestSliderCaptcha, withCaptcha, type SliderChallenge } from '@/mellow/utils/captcha'
import { toast } from '@/mellow/utils/toast'

export interface MellowResponse<T = any> {
  code: number
  msg?: string
  data?: T
  [key: string]: any
}

/**
 * 这些接口绝对不能带残留 token：
 * 带上失效 token，后端会先按「token 无效」拦成 401，登录接口自己都进不去。
 */
const AUTH_ENDPOINTS = [
  '/comm/login',
  '/comm/sign-code',
  '/comm/register',
  '/comm/check-token',
  '/comm/logout',
  '/comm/reset-password'
]

const isAuthEndpoint = (url: string): boolean => AUTH_ENDPOINTS.some((item) => url.includes(item))

/** 后端接口根地址（去掉 /api 后缀），dev 类接口（/dev/info/time）用它 */
function apiRoot(): string {
  const base = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
  if (!base) return ''
  return base.endsWith('/api') ? base.slice(0, -4) : base
}

/**
 * query 序列化
 * 数组按 `key[]=a&key[]=b` 展开（与 axios 默认一致，后端已验证可用）；
 * 对象按 JSON 字符串传，避免 `[object Object]`。
 */
function serialize(params?: Record<string, any>): string {
  if (!params) return ''

  const parts: string[] = []
  const push = (key: string, value: any) => {
    if (value === undefined || value === null || value === '') return
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  }

  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (Array.isArray(value)) {
      value.forEach((item) => push(`${key}[]`, item))
    } else if (value && typeof value === 'object') {
      push(key, JSON.stringify(value))
    } else {
      push(key, value)
    }
  })

  return parts.length ? `?${parts.join('&')}` : ''
}

interface SendOptions {
  method: string
  params?: Record<string, any>
  data?: Record<string, any>
  /** 走完整 URL（dev 接口不带 /api 前缀） */
  absolute?: boolean
  /** 静默：不自动弹错误提示 */
  silent?: boolean
  /** 内部标记：本次已带滑块票据重放过 */
  captchaRetried?: boolean
}

function send(url: string, options: SendOptions): Promise<MellowResponse> {
  const { method, params, data, absolute = false, silent = false, captchaRetried = false } = options

  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token && !isAuthEndpoint(url)) {
    // 裸 JWT：后端中间件不解析 Bearer 前缀
    header.Authorization = token
  }

  const fullUrl = absolute ? url : resolveUrl(url)
  const isQueryMethod = method === 'GET' || method === 'DELETE'

  return new Promise<MellowResponse>((resolve, reject) => {
    uni.request({
      url: `${fullUrl}${serialize(params)}`,
      method: method as any,
      data: (isQueryMethod ? undefined : data) as any,
      header,
      timeout: 30000,
      success: (res) => {
        const body = res.data as MellowResponse

        // 非标准响应：多为网关 / 反代拦截，或站点未安装
        if (!body || typeof body.code !== 'number') {
          const error = { code: -1, msg: '服务响应异常，请稍后再试' }
          if (!silent) toast(error.msg)
          reject(error)
          return
        }

        // 200 成功 / 201 验证码已发送 / 204 无数据：都按「拿到结果」处理
        if (body.code === 200 || body.code === 201 || body.code === 204) {
          resolve(body)
          return
        }

        // 428：发送验证码类接口的风控，先弹滑块，通过后把票据补进原请求重放
        if (body.code === 428 && !captchaRetried) {
          const challenge = (body.data as { captcha?: SliderChallenge } | null)?.captcha

          requestSliderCaptcha(challenge)
            .then((ticket) => {
              if (!ticket?.token) {
                reject(body)
                return
              }
              resolve(
                send(url, {
                  ...options,
                  params: withCaptcha(params, ticket),
                  captchaRetried: true
                })
              )
            })
            .catch(() => reject(body))
          return
        }

        // 401 / 412：登录失效或站点未安装，清掉本地登录态（不抢路由，交给页面自己处理）
        if (body.code === 401 || body.code === 412) {
          clearToken()
          clearUserCache()
        }

        if (!silent) toast(body.msg || '请求失败')
        reject(body)
      },
      fail: (err) => {
        const error = { code: -1, msg: '网络异常，请检查网络后重试' }
        if (!silent) toast(error.msg)
        reject({ ...error, data: err })
      }
    })
  })
}

/**
 * 与 Mellow 完全一致的调用入口
 * GET / DELETE 的 params 拼 query，其余放 body（与 axios 封装保持一致）
 */
export const call = (controller: string, method: string, options: any = {}): Promise<MellowResponse> => {
  const { method: httpMethod = 'GET', params, data, config } = options
  const verb = String(httpMethod).toUpperCase()
  const isQueryMethod = verb === 'GET' || verb === 'DELETE'

  return send(`/${controller}/${method}`, {
    method: verb,
    params: isQueryMethod ? params : undefined,
    data: isQueryMethod ? undefined : data,
    silent: Boolean(config?.silent)
  })
}

/**
 * dev 类接口（/dev/info/time、/dev/info/version）——不带 /api 前缀
 * 目前只有 utils/crypto.js 取服务器时间用得到，保持同样的解构习惯：拿到的就是 { code, msg, data }
 */
export const devService = {
  get: (url: string): Promise<MellowResponse> =>
    send(`${apiRoot()}${url}`, { method: 'GET', absolute: true, silent: true })
}
