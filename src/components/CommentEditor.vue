<template>
  <view class="comment-editor" :class="{ 'is-sheet': sheet }">
    <view class="flex items-start gap-2">
      <image
        v-if="!compact"
        class="h-8 w-8 flex-none rounded-full bg-gray-100"
        :src="userStore.avatar"
        mode="aspectFill"
      />

      <view class="min-w-0 flex-1">
        <textarea
          v-model="text"
          class="editor-textarea"
          :placeholder="placeholder"
          :maxlength="maxLength"
          :disabled="submitting"
          auto-height
          :cursor-spacing="20"
        />

        <!-- 已选图片（本地临时路径，提交时才上传） -->
        <view v-if="images.length" class="mt-1 flex flex-wrap gap-2">
          <view v-for="(path, index) in images" :key="path" class="relative">
            <image class="h-16 w-16 rounded-2 bg-gray-100" :src="path" mode="aspectFill" @click="previewImage(index)" />
            <view class="img-del" @click.stop="removeImage(index)">
              <wd-icon name="close" :size="10" color="#ffffff" />
            </view>
          </view>
        </view>

        <view class="mt-2 flex items-center">
          <view class="flex-center h-7 w-7 rounded-full bg-gray-100" @click="chooseImage">
            <wd-icon name="image" :size="15" color="#6b7280" />
          </view>
          <text class="ml-2 text-11px text-weak">{{ images.length ? `已选 ${images.length} 张` : '添加图片' }}</text>

          <view class="ml-auto flex items-center">
            <view v-if="sheet" class="mr-2 px-3 py-2" @click="emit('cancel')">
              <text class="text-13px text-sub">取消</text>
            </view>
            <wd-button type="primary" size="small" :loading="submitting" @click="submit">{{ submitText }}</wd-button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createComment } from '@/api/comment'
import { uploadFiles } from '@/api/attachment'
import type { TargetType } from '@/api/types'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

/**
 * 评论 / 回复输入框
 *
 * 图片策略：选择后只在本地预览（临时路径各端都能渲染），**提交时才上传**，
 * 避免用户选完图后又取消、白占一份附件（附件表没有「回收」概念）。
 */
defineOptions({ name: 'CommentEditor' })

const props = withDefaults(
  defineProps<{
    bindId: number
    bindType?: TargetType
    /** 0 / 不传 = 主评论；填评论 id = 回复该条 */
    pid?: number
    placeholder?: string
    submitText?: string
    /** 底部弹层样式（回复某条评论时用） */
    sheet?: boolean
    /** 紧凑模式：不显示头像（弹层里空间有限） */
    compact?: boolean
    maxLength?: number
  }>(),
  {
    bindType: 'article',
    pid: 0,
    placeholder: '说点什么…',
    submitText: '发送',
    sheet: false,
    compact: false,
    maxLength: 500
  }
)

const emit = defineEmits<{
  (e: 'success', result: { id: number; audit: number; pending: boolean }): void
  (e: 'cancel'): void
}>()

const userStore = useUserStore()

const text = ref('')
const images = ref<string[]>([])
const submitting = ref(false)

function chooseImage(): void {
  if (images.value.length >= 9) {
    toast('最多 9 张图片')
    return
  }
  uni.chooseImage({
    count: 9 - images.value.length,
    sizeType: ['compressed'],
    success: (res) => {
      const paths = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : []
      images.value = images.value.concat(paths)
    }
  })
}

function removeImage(index: number): void {
  images.value.splice(index, 1)
}

function previewImage(index: number): void {
  if (!images.value.length) return
  uni.previewImage({ urls: images.value, current: index })
}

async function submit(): Promise<void> {
  if (submitting.value) return

  const content = text.value.trim()
  if (!content && !images.value.length) {
    toast('说点什么再发送吧')
    return
  }

  submitting.value = true
  try {
    let uploaded = ''
    if (images.value.length) {
      uni.showLoading({ title: '图片上传中', mask: true })
      const files = await uploadFiles(images.value)
      uni.hideLoading()

      // 全部上传失败：uploadFiles 已提示过，这里直接中断，避免发出空图评论
      if (!files.length) return
      uploaded = files.map((file) => file.full_url).join(',')
    }

    const result = await createComment({
      bind_id: props.bindId,
      bind_type: props.bindType,
      pid: props.pid || 0,
      content,
      images: uploaded
    })

    text.value = ''
    images.value = []
    emit('success', result)
  } catch {
    // 请求层已按业务码提示（频率限制 / 敏感词 / 未登录等）
  } finally {
    uni.hideLoading()
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.comment-editor {
  background: #ffffff;
}

.comment-editor.is-sheet {
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
}

.editor-textarea {
  width: 100%;
  min-height: 72rpx;
  max-height: 400rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  line-height: 1.5;
  color: $inis-text;
  background: $inis-bg;
  border-radius: $inis-radius;
}

.img-del {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
}
</style>
