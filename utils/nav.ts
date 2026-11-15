/** 跳登录页 */
export function toLogin(): void {
  uni.navigateTo({ url: '/pages/login/index' })
}

/**
 * 返回来源页；没有上一页时回首页
 * 登录 / 注册成功后统一使用
 */
export function backOrHome(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
