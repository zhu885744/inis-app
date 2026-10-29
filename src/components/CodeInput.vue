<template>
  <view class="flex items-center gap-3">
    <view class="min-w-0 flex-1">
      <wd-input
        :model-value="modelValue"
        :label="label"
        type="number"
        :maxlength="6"
        :placeholder="placeholder"
        @update:model-value="onInput"
      />
    </view>
    <wd-button size="small" plain :loading="loading" :disabled="disabled" @click="emit('send')">
      {{ buttonText }}
    </wd-button>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    placeholder?: string
    /** 发码请求进行中 */
    loading?: boolean
    /** 倒计时剩余秒数，>0 时禁用按钮 */
    countdown?: number
    disabled?: boolean
  }>(),
  {
    label: '验证码',
    placeholder: '6 位数字验证码',
    loading: false,
    countdown: 0,
    disabled: false
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'send'): void
}>()

const buttonText = computed(() => {
  if (props.countdown > 0) return `${props.countdown}s 后重发`
  if (props.loading) return '发送中'
  return '获取验证码'
})

function onInput(value: string): void {
  // 只保留数字，避免用户粘贴带空格的内容
  emit('update:modelValue', String(value || '').replace(/\D/g, '').slice(0, 6))
}
</script>
