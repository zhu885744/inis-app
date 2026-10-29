<template>
  <view class="min-h-screen bg-page px-6 pt-12">
    <view class="mb-8">
      <text class="block text-22px text-gray-800 font-semibold">创建账号</text>
      <text class="mt-2 block text-13px text-gray-400">支持邮箱或手机号注册，验证码 5 分钟内有效</text>
    </view>

    <view class="rounded-4 bg-white px-4 py-2 shadow-sm">
      <wd-input v-model="form.social" label="账号" placeholder="邮箱或手机号" clearable />
      <CodeInput v-model="form.code" :countdown="countdown" :loading="sending" @send="handleSendCode" />
      <wd-input v-model="form.password" label="密码" type="password" placeholder="请设置密码（至少 6 位）" />
      <wd-input v-model="form.confirm" label="确认密码" type="password" placeholder="请再次输入密码" />
    </view>

    <view class="mt-6">
      <wd-button type="primary" block :loading="loading" @click="handleRegister">注册</wd-button>
    </view>

    <view class="mt-6 flex-center gap-2 text-13px">
      <text class="text-gray-400">已有账号？</text>
      <text class="text-primary" @click="goLogin">去登录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import CodeInput from '@/components/CodeInput.vue'
import { register } from '@/api/comm'
import { useUserStore } from '@/stores/user'
import { useCountdown } from '@/composables/useCountdown'
import { toast } from '@/utils/toast'
import { backOrHome } from '@/utils/nav'
import { validateCode, validatePassword, validateSocial } from '@/utils/validate'
import type { LoginResult } from '@/api/types'

const userStore = useUserStore()
const { countdown, start } = useCountdown()

const form = reactive({
  social: '',
  code: '',
  password: '',
  confirm: ''
})

const sending = ref(false)
const loading = ref(false)

/** 发注册验证码：不带 code 调用 register 即为「只发码」 */
async function handleSendCode(): Promise<void> {
  const social = form.social.trim()
  if (!validateSocial(social)) return

  sending.value = true
  try {
    await register({ social })
    toast('验证码已发送，请查收', 'success')
    start()
  } catch {
    // 请求层已提示（如发送过于频繁）
  } finally {
    sending.value = false
  }
}

async function handleRegister(): Promise<void> {
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
    const result = await register({ social, code: form.code.trim(), password: form.password })

    // 正常注册：直接拿到登录态
    if (result && 'token' in result && result.token) {
      userStore.applyLogin(result as LoginResult)
      toast('注册成功', 'success')
      setTimeout(backOrHome, 400)
      return
    }

    // 站点开启人工审核：账号已创建但没有 token
    toast('注册成功，请等待管理员审核', 'success')
    setTimeout(backOrHome, 800)
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
