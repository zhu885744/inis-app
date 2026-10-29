<template>
  <view class="min-h-screen bg-page px-6 pt-12">
    <view class="mb-8">
      <text class="block text-22px text-gray-800 font-semibold">重置密码</text>
      <text class="mt-2 block text-13px text-gray-400">填写注册时绑定的邮箱或手机号，我们会发送验证码</text>
    </view>

    <view class="rounded-4 bg-white px-4 py-2 shadow-sm">
      <wd-input v-model="form.social" label="账号" placeholder="邮箱或手机号" clearable />
      <CodeInput v-model="form.code" :countdown="countdown" :loading="sending" @send="handleSendCode" />
      <wd-input v-model="form.password" label="新密码" type="password" placeholder="至少 6 位" />
      <wd-input v-model="form.confirm" label="确认密码" type="password" placeholder="请再次输入新密码" />
    </view>

    <view class="mt-6">
      <wd-button type="primary" block :loading="loading" @click="handleReset">确认重置</wd-button>
    </view>

    <view class="mt-6 flex-center gap-2 text-13px">
      <text class="text-gray-400">想起密码了？</text>
      <text class="text-primary" @click="goLogin">去登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import CodeInput from '@/components/CodeInput.vue'
import { resetPassword } from '@/api/comm'
import { useCountdown } from '@/composables/useCountdown'
import { toast } from '@/utils/toast'
import { validateCode, validatePassword, validateSocial } from '@/utils/validate'

const { countdown, start } = useCountdown()

const form = reactive({
  social: '',
  code: '',
  password: '',
  confirm: ''
})

const sending = ref(false)
const loading = ref(false)

/** 发重置验证码：不带 code / password 即为「只发码」 */
async function handleSendCode(): Promise<void> {
  const social = form.social.trim()
  if (!validateSocial(social)) return

  sending.value = true
  try {
    await resetPassword({ social })
    toast('验证码已发送，请查收', 'success')
    start()
  } catch {
    // 请求层已提示
  } finally {
    sending.value = false
  }
}

async function handleReset(): Promise<void> {
  const social = form.social.trim()
  if (!validateSocial(social)) return
  if (!validateCode(form.code)) return
  if (!validatePassword(form.password)) return
  if (form.password !== form.confirm) {
    toast('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    await resetPassword({ social, code: form.code.trim(), password: form.password })
    toast('密码重置成功，请用新密码登录', 'success')
    // 重置完成后回到登录页（本页通常是从登录页进来的）
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack({ delta: 1 })
      else uni.redirectTo({ url: '/pages/login/index' })
    }, 800)
  } catch {
    // 请求层已提示
  } finally {
    loading.value = false
  }
}

function goLogin(): void {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({ delta: 1 })
  else uni.redirectTo({ url: '/pages/login/index' })
}
</script>
