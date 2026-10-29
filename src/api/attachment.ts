import { resolveUrl } from './request'
import { requestSliderCaptcha } from '@/utils/captcha'
import { getToken } from '@/utils/storage'
import { toast } from '@/utils/toast'

/**
 * 附件上传（attachment/batch，需登录）
 *
 * 为什么不用 api/request.ts：uni.request 发不了文件，必须走 uni.uploadFile，
 * 它没有统一的业务码处理，所以这里自己解析响应体（HTTP 状态码恒为 200，看 body.code）。
 * 也正因为绕过了统一封装，428（滑块风控）要在这里自己兜一次底。
 *
 * 字段名：后端同时接受 `files`（多文件，H5 / App）与 `file`（单文件），
 * 小程序端 uni.uploadFile **一次只能带一个文件**，因此统一按单文件循环上传。
 */

export interface UploadedFile {
  full_url: string
  original_name?: string
  /** success | exist */
  status?: string
}

interface BatchResult {
  results?: UploadedFile[]
  success_count?: number
  fail_count?: number
}

interface UploadBody {
  code?: number
  msg?: string
  data?: BatchResult & { captcha?: any }
}

/** 发一次上传请求并解析响应体（不做业务码判断） */
function send(filePath: string, formData?: Record<string, any>): Promise<UploadBody> {
  const token = getToken()

  return new Promise<UploadBody>((resolve, reject) => {
    uni.uploadFile({
      url: resolveUrl('/attachment/batch'),
      filePath,
      // 单文件用 `file`（多文件才需要 `files`）
      name: 'file',
      // 滑块票据走表单字段：后端参数中间件会合并 query / body / form
      formData,
      header: token ? { Authorization: token } : {},
      success: (res) => {
        let body: any = res.data
        // H5 下 uni.uploadFile 返回的是字符串，需要自己解析
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body)
          } catch {
            reject(new Error('上传响应解析失败'))
            return
          }
        }
        resolve((body || {}) as UploadBody)
      },
      fail: () => reject(new Error('上传失败，请检查网络'))
    })
  })
}

/** 上传单个本地文件，返回服务端可访问的完整地址 */
export async function uploadFile(filePath: string): Promise<UploadedFile> {
  let body = await send(filePath)

  if (body.code === 428) {
    const ticket = await requestSliderCaptcha(body.data?.captcha)
    if (!ticket) throw new Error(body.msg || '请先完成滑块验证')
    body = await send(filePath, { captcha_token: ticket.token, captcha_value: ticket.value })
  }

  if (body.code !== 200) throw new Error(body.msg || '上传失败')

  const item = body.data?.results?.find((row) => row.full_url)
  if (!item) throw new Error('上传失败：未返回文件地址')

  return item
}

/**
 * 批量上传（顺序上传，避免小程序并发上限）
 * 任意一张失败会交互提示，但已成功的仍然返回，不整批丢弃
 */
export async function uploadFiles(paths: string[]): Promise<UploadedFile[]> {
  const uploaded: UploadedFile[] = []

  for (const path of paths) {
    try {
      uploaded.push(await uploadFile(path))
    } catch (error) {
      toast(error instanceof Error ? error.message : '图片上传失败')
    }
  }

  return uploaded
}
