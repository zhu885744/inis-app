/** 跳转登录页 */
export function toLogin(): void {
  uni.navigateTo({ url: '/pages/login/index' })
}

/** 跳转注册页 */
export function toRegister(): void {
  uni.navigateTo({ url: '/pages/register/index' })
}

/**
 * 返回来源页；没有上一页（如直接进入登录页）时回首页
 * 登录 / 注册 / 重置密码成功后统一使用
 */
export function backOrHome(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
