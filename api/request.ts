import { API_DOMAIN, API_PREFIX } from '@/config/env'
import { clearToken, clearUserCache, getToken } from '@/utils/storage'
import { toast } from '@/utils/toast'

/** 业务码（与后端 app/facade 定义一致） */
export const Code = {
  SUCCESS: 200,
  /** 验证码已发送 */
  SENT: 201,
  /** 无数据 */
  NO_DATA: 204,
  /** 登录失效 */
  UNAUTHORIZED: 401,
  /** 站点未安装 */
  NOT_INSTALL: 412,
  /** 需要滑块风控 */
  NEED_CAPTCHA: 428
}

/** 带业务码的接口错误，页面可据 code 做特殊处理 */
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
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  /** 需要登录：本地无 token 直接跳登录页，不发请求 */
  auth?: boolean
  /** 显示 loading：true 用默认文案，字符串用自定义文案 */
  loading?: boolean | string
  /** 静默：不自动弹错误提示 */
  silent?: boolean
  timeout?: number
}

/** 接口地址拼接：域名 + /api + 路径 */
export function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = API_DOMAIN.replace(/\/+$/, '')
  if (base === '') return `${API_PREFIX}${path}`
  return base.endsWith(API_PREFIX) ? `${base}${path}` : `${base}${API_PREFIX}${path}`
}

/** 未登录时跳登录页（已在登录页则不重复跳） */
function redirectToLogin(): void {
  try {
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const current: any = pages[pages.length - 1]
      const route = current.route
      if (route != null && `${route}` === 'pages/login/index') return
    }
  } catch (e) {
    // 取页面栈失败就直接跳
  }
  uni.navigateTo({ url: '/pages/login/index' })
}

/** 登录态失效：清掉本地凭证并提示 */
function handleUnauthorized(message: string): void {
  clearToken()
  clearUserCache()
  toast(message === '' ? '登录已过期，请重新登录' : message)
}

/**
 * 统一请求封装
 *
 * 后端 HTTP 状态码恒为 200，业务结果看 body.code，所以只按业务码判断成败。
 * 428（风控）在 uni-app x 里暂不弹滑块，直接回错误提示 —— 滑块组件后续单独迁。
 */
export function request<T>(options: RequestOptions): Promise<T> {
  const url = options.url
  const method = options.method ?? 'GET'
  const auth = options.auth ?? false
  const loading = options.loading ?? false
  const silent = options.silent ?? false
  const timeout = options.timeout ?? 15000

  const token = getToken()
  if (auth && token === '') {
    redirectToLogin()
    return Promise.reject(new ApiError(Code.UNAUTHORIZED, '请先登录'))
  }

  const header: any = { 'Content-Type': 'application/json' }
  if (token !== '') header['Authorization'] = token

  if (loading !== false) {
    let titleText = '加载中'
    if (typeof loading === 'string') titleText = loading
    uni.showLoading({ title: titleText, mask: true })
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: resolveUrl(url),
      method: method,
      data: options.data,
      header: header,
      timeout: timeout,
      success: (res) => {
        if (loading !== false) uni.hideLoading()

        let body: any = res.data
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body as string)
          } catch (e) {
            body = null
          }
        }

        if (body == null) {
          const message = '服务响应异常，请稍后再试'
          if (!silent) toast(message)
          reject(new ApiError(-1, message, res.data))
          return
        }

        const code = Number(body.code)
        if (isNaN(code)) {
          const message = '服务响应异常，请稍后再试'
          if (!silent) toast(message)
          reject(new ApiError(-1, message, body))
          return
        }

        if (code === Code.SUCCESS || code === Code.SENT || code === Code.NO_DATA) {
          resolve(body.data as T)
          return
        }

        let message = '请求失败'
        if (body.msg != null) message = `${body.msg}`

        if (code === Code.UNAUTHORIZED || code === Code.NOT_INSTALL) {
          handleUnauthorized(code === Code.NOT_INSTALL ? '站点尚未完成安装' : message)
          reject(new ApiError(code, message, body.data))
          return
        }

        if (code === Code.NEED_CAPTCHA) {
          if (!silent) toast('操作太频繁，请稍后再试')
          reject(new ApiError(code, message, body.data))
          return
        }

        if (!silent) toast(message)
        reject(new ApiError(code, message, body.data))
      },
      fail: (err) => {
        if (loading !== false) uni.hideLoading()
        const message = '网络异常，请检查网络后重试'
        if (!silent) toast(message)
        reject(new ApiError(-1, message, err))
      }
    })
  })
}

export const http = {
  get: <T>(url: string, data?: any, options?: Partial<RequestOptions>) => {
    return request<T>({
      url: url,
      method: 'GET',
      data: data,
      auth: options?.auth,
      loading: options?.loading,
      silent: options?.silent
    })
  },
  post: <T>(url: string, data?: any, options?: Partial<RequestOptions>) => {
    return request<T>({
      url: url,
      method: 'POST',
      data: data,
      auth: options?.auth,
      loading: options?.loading,
      silent: options?.silent
    })
  },
  put: <T>(url: string, data?: any, options?: Partial<RequestOptions>) => {
    return request<T>({
      url: url,
      method: 'PUT',
      data: data,
      auth: options?.auth,
      loading: options?.loading,
      silent: options?.silent
    })
  },
  delete: <T>(url: string, data?: any, options?: Partial<RequestOptions>) => {
    return request<T>({
      url: url,
      method: 'DELETE',
      data: data,
      auth: options?.auth,
      loading: options?.loading,
      silent: options?.silent
    })
  }
}
