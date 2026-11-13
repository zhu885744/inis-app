<template>
  <view class="publish">
    <!-- 顶栏：取消 / 标题 / 发布 -->
    <view class="publish-nav">
      <text class="nav-cancel" @click="onCancel">取消</text>
      <text class="nav-title">发布笔记</text>
      <view class="xhs-btn nav-submit" :class="{ 'is-disabled': !canSubmit || submitting }" @click="onSubmit(1)">
        {{ submitting ? '发布中' : '发布' }}
      </view>
    </view>

    <scroll-view scroll-y class="publish-body">
      <!-- 图片九宫格 -->
      <view class="image-grid">
        <view v-for="(item, index) in images" :key="item.key" class="image-item">
          <image class="image-thumb" :src="item.path" mode="aspectFill" @click="preview(index)" />
          <view class="image-remove" @click.stop="removeImage(index)">
            <text class="bi bi-x-lg" />
          </view>
        </view>

        <view v-if="images.length < MAX_IMAGES" class="image-add" @click="chooseImages">
          <view class="image-add-inner">
            <text class="bi bi-camera image-add-icon" />
            <text class="image-add-text">{{ images.length }}/{{ MAX_IMAGES }}</text>
          </view>
        </view>
      </view>

      <!-- 正文 -->
      <view class="editor">
        <textarea
          v-model="content"
          class="editor-input"
          placeholder="添加标题和正文，分享你的生活瞬间…"
          placeholder-class="editor-placeholder"
          :maxlength="MAX_LENGTH"
          auto-height
          show-confirm-bar="false"
        />
        <text class="editor-count">{{ content.length }}/{{ MAX_LENGTH }}</text>
      </view>

      <!-- 位置 / 可见范围 -->
      <view class="xhs-block option-block">
        <view class="option-row" @click="pickLocation">
          <text class="bi bi-geo-alt option-icon" />
          <text class="option-label">位置</text>
          <text class="option-value ellipsis">{{ location || '添加地点' }}</text>
          <text class="bi bi-chevron-right option-arrow" />
        </view>
        <view class="option-row" @click="pickScope">
          <text class="bi bi-eye option-icon" />
          <text class="option-label">可见范围</text>
          <text class="option-value">{{ scopeLabel }}</text>
          <text class="bi bi-chevron-right option-arrow" />
        </view>
        <view class="option-row" @click="insertTopic">
          <text class="bi bi-hash option-icon" />
          <text class="option-label">话题</text>
          <text class="option-value">添加 #话题# 让更多人看到</text>
          <text class="bi bi-chevron-right option-arrow" />
        </view>
      </view>

      <view class="publish-tip">发布即表示同意社区规范，内容会经过安全审核</view>
    </scroll-view>

    <!-- 底部：存草稿 -->
    <view class="publish-foot">
      <view class="draft-btn" @click="onSubmit(0)">
        <text class="bi bi-file-earmark-text" />
        <text>存草稿</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createMoment } from '@/api/moments'
import { uploadFiles } from '@/api/attachment'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { toLogin } from '@/utils/nav'

/**
 * 发布动态（小红书式发布页）
 *
 * 流程：本地选图 → 逐张上传到 attachment/batch → 拿到 full_url →
 * 组装 content / images（逗号分隔）/ location / scope → moments/create。
 *
 * 审核提示按后端回传的 audit 决定（见 app/api/controller/moments.go 的 create）：
 * audit=0 说明进了待审核队列，不能一律提示「发布成功」。
 */

interface LocalImage {
  key: string
  /** 本地临时路径，上传成功后替换为服务端地址 */
  path: string
}

const MAX_IMAGES = 9
const MAX_LENGTH = 1000

const userStore = useUserStore()

const images = ref<LocalImage[]>([])
const content = ref('')
const location = ref('')
const scope = ref(1)
const submitting = ref(false)

const SCOPE_OPTIONS = [
  { value: 1, label: '公开', desc: '所有人可见' },
  { value: 2, label: '仅登录可见', desc: '登录用户才能看' },
  { value: 3, label: '积分可见', desc: '消耗积分才能看' }
]

const scopeLabel = computed(() => SCOPE_OPTIONS.find((item) => item.value === scope.value)?.label || '公开')

const canSubmit = computed(() => Boolean(content.value.trim() || images.value.length))

/* ---------------- 图片 ---------------- */
function chooseImages(): void {
  const remain = MAX_IMAGES - images.value.length
  if (remain <= 0) return

  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const paths = (res.tempFilePaths || []) as string[]
      const stamp = Date.now()
      paths.forEach((path, index) => {
        images.value.push({ key: `${stamp}-${index}`, path })
      })
    }
  })
}

function removeImage(index: number): void {
  images.value.splice(index, 1)
}

function preview(index: number): void {
  uni.previewImage({
    current: index,
    urls: images.value.map((item) => item.path)
  })
}

/* ---------------- 选项 ---------------- */
function pickLocation(): void {
  uni.showModal({
    title: '添加地点',
    editable: true,
    placeholderText: '如：杭州 · 西湖',
    success: (res) => {
      if (!res.confirm) return
      location.value = String(res.content || '').trim()
    }
  })
}

function pickScope(): void {
  uni.showActionSheet({
    itemList: SCOPE_OPTIONS.map((item) => `${item.label}（${item.desc}）`),
    success: (res) => {
      const option = SCOPE_OPTIONS[res.tapIndex]
      if (option) scope.value = option.value
    }
  })
}

/** 话题：插到正文末尾，后端会把 #话题# 解析成话题链接并写 tags */
function insertTopic(): void {
  uni.showModal({
    title: '添加话题',
    editable: true,
    placeholderText: '如：生活记录',
    success: (res) => {
      if (!res.confirm) return
      const topic = String(res.content || '').trim().replace(/^#+|#+$/g, '')
      if (!topic) return
      content.value = `${content.value}${content.value ? ' ' : ''}#${topic}# `
    }
  })
}

/* ---------------- 提交 ---------------- */
async function onSubmit(status: number): Promise<void> {
  if (submitting.value) return
  if (!canSubmit.value) {
    toast(status === 0 ? '写点什么再存草稿吧' : '写点正文或选张图片吧')
    return
  }

  submitting.value = true
  try {
    // 1. 先上传图片（顺序上传，避免小程序并发限制）
    let urls: string[] = []
    if (images.value.length) {
      const uploaded = await uploadFiles(images.value.map((item) => item.path))
      urls = uploaded.map((item) => item.full_url).filter(Boolean)
      if (urls.length !== images.value.length) {
        toast('部分图片上传失败，已跳过')
      }
    }

    // 2. 提交动态
    const result = await createMoment({
      content: content.value.trim(),
      images: urls.join(','),
      location: location.value,
      status,
      scope: scope.value
    })

    // 3. 按后端回传的审核态给提示
    if (status === 0) {
      toast('已存为草稿')
    } else if (Number(result?.audit) === 0) {
      toast('已提交，等待审核通过后展示')
    } else {
      toast('发布成功')
    }

    // 通知首页刷新
    uni.$emit('feed:refresh')
    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch {
    // 错误提示已由请求层统一弹出
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  if (canSubmit.value) {
    uni.showModal({
      title: '放弃这次编辑？',
      content: '已填写的内容不会保存',
      confirmText: '放弃',
      success: (res) => {
        if (res.confirm) uni.navigateBack()
      }
    })
    return
  }
  uni.navigateBack()
}

onLoad(() => {
  if (!userStore.isLogin) {
    toLogin()
  }
})
</script>

<style lang="scss" scoped>
.publish {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-card);
}

/* 顶栏 */
.publish-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  padding-top: calc(10px + env(safe-area-inset-top));
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-soft);
}

.nav-cancel {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-soft);
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.nav-submit {
  flex-shrink: 0;
  height: 30px;
  padding: 0 16px;
  font-size: 13px;
}

.publish-body {
  flex: 1;
  padding: 14px;
  padding-bottom: 90px;
}

/* 图片九宫格 */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.image-item,
.image-add {
  position: relative;
  width: calc((100% - 12px) / 3);
  height: 0;
  padding-bottom: calc((100% - 12px) / 3);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg-muted);
}

.image-thumb {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 10px;
}

.image-add {
  position: relative;
  width: calc((100% - 12px) / 3);
  height: 0;
  padding-bottom: calc((100% - 12px) / 3);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: #fafafa;
  overflow: hidden;
  box-sizing: border-box;
}

.image-add-inner {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.image-add-icon {
  font-size: 22px;
  color: var(--text-light);
}

.image-add-text {
  font-size: 11px;
  color: var(--text-light);
}

/* 正文 */
.editor {
  position: relative;
  margin-top: 14px;
  padding-bottom: 22px;
}

.editor-input {
  width: 100%;
  min-height: 120px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
}

.editor-count {
  position: absolute;
  right: 0;
  bottom: 0;
  font-size: 11px;
  color: var(--text-light);
}

/* 选项 */
.option-block {
  margin-top: 8px;
  border: 1px solid var(--border-soft);
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 14px;
  border-bottom: 1px solid var(--border-soft);
}

.option-row:last-child {
  border-bottom: none;
}

.option-icon {
  flex-shrink: 0;
  font-size: 15px;
  color: var(--text-muted);
}

.option-label {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text);
}

.option-value {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 13px;
  color: var(--text-muted);
}

.option-arrow {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-light);
}

.publish-tip {
  margin-top: 14px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-light);
  text-align: center;
}

/* 底部草稿栏 */
.publish-foot {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1px solid var(--border-soft);
}

.draft-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 999px;
  background: var(--bg-muted);
  font-size: 13px;
  color: var(--text-soft);
}

.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
