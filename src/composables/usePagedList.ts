import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { PageResult } from '@/api/types'

export interface PagedList<T> {
  items: Ref<T[]>
  count: Ref<number>
  loading: Ref<boolean>
  finished: Ref<boolean>
  /** 首次加载完成且列表为空（用于空状态展示，避免加载中就显示「暂无数据」） */
  isEmpty: ComputedRef<boolean>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

/**
 * 分页列表加载器
 *
 * 后端分页结构：{ data: T[], count: 总条数, page: 总页数 }（见 app/api/controller/article.go）
 * 请求失败由请求层统一提示，这里只负责状态收尾，不向上抛错
 */
export function usePagedList<T>(
  fetcher: (page: number, limit: number) => Promise<PageResult<T>>,
  limit = 10
): PagedList<T> {
  const items = ref([]) as Ref<T[]>
  const count = ref(0)
  const loading = ref(false)
  const finished = ref(false)
  const loaded = ref(false)

  const isEmpty = computed(() => loaded.value && !loading.value && items.value.length === 0)

  async function load(reset = false): Promise<void> {
    if (loading.value) return
    if (!reset && finished.value) return

    loading.value = true
    const current = reset ? 1 : Math.floor(items.value.length / limit) + 1

    try {
      const result = await fetcher(current, limit)
      const list = Array.isArray(result?.data) ? result.data : []

      items.value = reset ? list : items.value.concat(list)
      count.value = Number(result?.count || 0)

      // page 是总页数：两者取或，任一满足即到底（同时防止后端少返回一页时死循环）
      const totalPages = Number(result?.page || 0)
      finished.value = list.length < limit || (totalPages > 0 && current >= totalPages)
      loaded.value = true
    } catch {
      // 请求层已提示；失败时不写 finished，方便用户下拉重试
      if (reset) {
        items.value = []
        loaded.value = true
      }
    } finally {
      loading.value = false
    }
  }

  const refresh = () => load(true)
  const loadMore = () => load(false)

  return { items, count, loading, finished, isEmpty, refresh, loadMore }
}
