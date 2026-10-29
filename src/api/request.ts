import { Code, type ApiResponse } from './types'
import { clearToken, clearUserCache, getToken } from '@/utils/storage'
import { requestSliderCaptcha, withCaptcha, type SliderChallenge } from '@/utils/captcha'
import { toast } from '@/utils/toast'

/** 接口前缀：后端注册在 /api 下（见 app/api/route/app.go） */
const API_PREFIX = '/api'

/**
 * 解析请求地址
 * - 开发环境 VITE_API_BASE 留空 → 走 vite 代理（/api 会转发到 127.0.0.1:8642）
 * - 生产环境 VITE_API_BASE=https://dom.com（或 https://dom.com/api，两种写法都兼容）
 *
 * uni.uploadFile 不走本文件的封装（它没有 request 那套 header / 业务码处理），
 * 所以这个函数导出给附件上传用（见 api/attachment.ts）
 */
export function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  const base = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')
  if (!base) return `${API_PREFIX}${path}`
  return base.endsWith(API_PREFIX) ? `${base}${path}` : `${base}${API_PREFIX}${path}`
}

/** 带业务码的接口错误，页面可据 code / data 做特殊处理（如 428 需滑块） */
export class ApiError extends Error {
  code: number
  data: any

  constructor(code: number, message: string, data: any = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.data = data
  }
}

export interface RequestOptions {
  /** 以 / 开头的接口路径，如 /comm/login */
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** GET / DELETE 会拼到 query（嵌套对象请自行 JSON.stringify） */
  data?: Record<string, any>
  /** 需要登录：本地无 token 时直接跳登录页，不发请求 */
  auth?: boolean
  /** 显示 loading：true 用默认文案，传字符串用自定义文案 */
  loading?: boolean | string
  /** 静默模式：不自动弹错误提示（由调用方处理错误） */
  silent?: boolean
  timeout?: number
  /**
   * 内部标记：本次请求已带滑块票据重放过
   * 防止「重放后又 428」无限弹窗（例如票据被另外的请求先消费掉）
   */
  captchaRetried?: boolean
}

/** 未登录时跳登录页（已在登录页则不重复跳） */
function redirectToLogin(): void {
  const pages = getCurrentPages()
  const current = pages.length ? pages[pages.length - 1] : null
  const route = current ? (current as any).route : ''
  if (route === 'pages/login/index') return
  uni.navigateTo({ url: '/pages/login/index' })
}

/** 登录态失效：清掉本地凭证并提示 */
function handleUnauthorized(message: string): void {
  clearToken()
  clearUserCache()
  toast(message || '登录已过期，请重新登录')
}

/**
 * 统一请求封装
 * 注意：后端 HTTP 状态码恒为 200，业务结果看 body.code，
 * 所以这里只按业务码判断成功与失败。
 */
export function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, auth = false, loading = false, silent = false, timeout = 15000 } = options

  const token = getToken()
  if (auth && !token) {
    redirectToLogin()
    return Promise.reject(new ApiError(Code.UNAUTHORIZED, '请先登录'))
  }

  const header: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  // 裸 JWT：后端中间件不解析 Bearer 前缀
  if (token) header.Authorization = token

  if (loading) {
    uni.showLoading({ title: typeof loading === 'string' ? loading : '加载中', mask: true })
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: resolveUrl(url),
      method,
      data: data as any,
      header,
      timeout,
      success: (res) => {
        const body = res.data as ApiResponse<T>

        // 非标准响应：多为网关 / 反代拦截，或站点未安装
        if (!body || typeof body.code !== 'number') {
          const message = '服务响应异常，请稍后再试'
          if (!silent) toast(message)
          reject(new ApiError(-1, message, res.data))
          return
        }

        // 200 成功 / 201 验证码已发送（data 可能为空）
        if (body.code === Code.SUCCESS || body.code === Code.SENT) {
          resolve(body.data)
          return
        }

        // 204 无数据：按空结果返回，避免列表页到处判空
        if (body.code === Code.NO_DATA) {
          resolve(body.data)
          return
        }

        const message = body.msg || '请求失败'

        if (body.code === Code.UNAUTHORIZED || body.code === Code.NOT_INSTALL) {
          // 401 登录失效；412 站点未安装（两者都清掉登录态）
          handleUnauthorized(body.code === Code.NOT_INSTALL ? '站点尚未完成安装' : message)
          reject(new ApiError(body.code, message, body.data))
          return
        }

        if (body.code === Code.NEED_CAPTCHA) {
          // 428：风控拦截。题目随响应下发（data.captcha），这里统一弹全局滑块，
          // 用户滑完后把 captcha_token / captcha_value 补进**原请求**重放（后端没有独立校验接口）
          if (options.captchaRetried) {
            // 已经带票重放过仍然 428：票据被消费 / 过期，不再递归弹窗
            if (!silent) toast(message)
            reject(new ApiError(body.code, message, body.data))
            return
          }

          const challenge = (body.data as { captcha?: SliderChallenge } | null)?.captcha

          requestSliderCaptcha(challenge)
            .then((ticket) => {
              if (!ticket?.token) {
                // 用户取消或取题失败：把原始 428 交回调用方
                reject(new ApiError(body.code, message, body.data))
                return
              }

              resolve(
                request<T>({
                  ...options,
                  data: withCaptcha(options.data, ticket),
                  captchaRetried: true
                })
              )
            })
            .catch(() => {
              reject(new ApiError(body.code, message, body.data))
            })
          return
        }

        if (!silent) toast(message)
        reject(new ApiError(body.code, message, body.data))
      },
      fail: (err) => {
        const message = '网络异常，请检查网络后重试'
        if (!silent) toast(message)
        reject(new ApiError(-1, message, err))
      },
      complete: () => {
        if (loading) uni.hideLoading()
      }
    })
  })
}

export const http = {
  get: <T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>) =>
    request<T>({ url, method: 'GET', data, ...options }),
  post: <T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>) =>
    request<T>({ url, method: 'POST', data, ...options }),
  put: <T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>) =>
    request<T>({ url, method: 'PUT', data, ...options }),
  delete: <T = any>(url: string, data?: Record<string, any>, options?: Partial<RequestOptions>) =>
    request<T>({ url, method: 'DELETE', data, ...options })
}
