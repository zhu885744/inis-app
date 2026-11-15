/** 统一的轻提示：不阻塞交互 */
export function toast(title: string, icon: 'none' | 'success' | 'error' = 'none'): void {
  uni.showToast({
    title: title,
    icon: icon,
    duration: 2000
  })
}

export function toastSuccess(title: string): void {
  toast(title, 'success')
}
