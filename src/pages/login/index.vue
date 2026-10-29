<template>
  <view class="min-h-screen bg-page px-6 pt-14">
    <!-- 品牌区 -->
    <view class="mb-10 text-center">
      <view class="mx-auto mb-4 flex-center h-16 w-16 rounded-5 bg-primary text-24px text-white font-bold shadow-lg">
        INIS
      </view>
      <text class="block text-22px text-gray-800 font-semibold">欢迎回来</text>
      <text class="mt-2 block text-13px text-gray-400">登录后即可发布内容、评论与互动</text>
    </view>

    <!-- 表单卡片 -->
    <view class="rounded-4 bg-white px-4 py-2 shadow-sm">
      <wd-input
        v-model="account"
        label="账号"
        placeholder="邮箱 / 手机号 / 用户名"
        clearable
        @confirm="handleLogin"
      />
      <wd-input v-model="password" label="密码" type="password" placeholder="请输入密码" @confirm="handleLogin" />
    </view>

    <view class="mt-6">
      <wd-button type="primary" block :loading="loading" @click="handleLogin">登录</wd-button>
    </view>

    <!-- 底部入口 -->
    <view class="mt-6 flex-center gap-3 text-13px">
      <text class="text-primary" @click="goRegister">注册账号</text>
      <text class="text-gray-200">|</text>
      <text class="text-primary" @click="goReset">忘记密码</text>
    </view>

    <view class="mt-10 text-center text-13px text-gray-400" @click="backOrHome">
      <text>先随便看看</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { backOrHome } from '@/utils/nav'

const userStore = useUserStore()

const account = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin(): Promise<void> {
  const name = account.value.trim()
  if (!name) {
    toast('请输入账号')
    return
  }
  if (!password.value) {
    toast('请输入密码')
    return
  }

  loading.value = true
  try {
    // 明文提交（后端仅在带加密头时才解密，见 src/api/comm.ts 注释）
    await userStore.loginByPassword(name, password.value)
    toast('登录成功', 'success')
    setTimeout(backOrHome, 400)
  } catch {
    // 请求层已提示（如「账号或密码错误！」）
  } finally {
    loading.value = false
  }
}

function goRegister(): void {
  uni.navigateTo({ url: '/pages/register/index' })
}

function goReset(): void {
  uni.navigateTo({ url: '/pages/reset-password/index' })
}
</script>

<style lang="scss" scoped>
/* wot-design-uni 输入框的左右留白与卡片内边距对齐 */
:deep(.wd-input) {
  padding-left: 0;
  padding-right: 0;
}
</style>
