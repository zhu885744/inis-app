/** 统一的轻提示：小程序 / H5 都能用，不阻塞交互 */
export function toast(title: string, icon: 'none' | 'success' | 'error' = 'none'): void {
  uni.showToast({ title, icon, duration: 2000 })
}

export const toastSuccess = (title: string) => toast(title, 'success')
export const toastError = (title: string) => toast(title, 'none')
