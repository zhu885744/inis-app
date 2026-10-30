<template>
  <view class="agreement-page">
    <view class="agreement-head">
      <view class="agreement-title">
        <text class="bi" :class="icon" />
        <text>{{ title }}</text>
      </view>
      <text class="agreement-desc">{{ desc }}</text>
    </view>

    <view class="card card-pad">
      <text class="agreement-body">{{ content }}</text>
    </view>

    <view class="agreement-foot">
      <view class="agreement-foot-link" @click="switchType">
        <text class="bi bi-file-earmark-text" />
        <text>查看{{ otherTitle }}</text>
      </view>
      <view class="agreement-foot-link" @click="goHome">
        <text class="bi bi-house-door" />
        <text>返回首页</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSiteConfig } from '@/api/config'

/**
 * 用户协议 / 隐私协议（对齐 Mellow 主题 views/Agreement.vue）
 *
 * 内容取自站点配置 Mellow_functions → auth_dialog_agreement：
 *   - 用户协议：user_agreement_content
 *   - 隐私协议：privacy_agreement_content
 * 配置缺失时回退到与网页端一致的内置默认文案，保证页面不会空白。
 */

const DEFAULT_USER =
  '用户协议\n\n欢迎使用我们的服务！请仔细阅读以下用户协议。\n\n1. 服务条款\n您必须年满13周岁才能使用本服务。\n\n2. 账户安全\n您有责任维护账户密码的安全性。\n\n3. 用户行为规范\n请勿发布违法或侵犯他人权益的内容。'
const DEFAULT_PRIVACY =
  '隐私协议\n\n我们重视您的隐私。\n\n1. 收集的信息\n我们可能收集您的账户信息和使用数据。\n\n2. 信息使用\n用于提供和改进服务。\n\n3. 信息共享\n我们不会向第三方出售您的个人信息。'

const type = ref<'user' | 'privacy'>('user')
const config = ref<Record<string, any>>({})

const isUser = computed(() => type.value !== 'privacy')
const title = computed(() => (isUser.value ? '用户协议' : '隐私协议'))
const icon = computed(() => (isUser.value ? 'bi-file-earmark-text' : 'bi-shield-check'))
const desc = computed(() =>
  isUser.value ? '使用本站服务前，请先阅读并同意以下条款' : '我们如何收集、使用与保护你的信息'
)
const otherTitle = computed(() => (isUser.value ? '隐私协议' : '用户协议'))

const content = computed(() => {
  const agreement = config.value?.auth_dialog_agreement || {}
  const text = isUser.value ? agreement.user_agreement_content : agreement.privacy_agreement_content
  const value = String(text || '').trim()
  return value || (isUser.value ? DEFAULT_USER : DEFAULT_PRIVACY)
})

function switchType(): void {
  type.value = isUser.value ? 'privacy' : 'user'
  uni.setNavigationBarTitle({ title: title.value })
}

function goHome(): void {
  uni.reLaunch({ url: '/pages/index/index' })
}

onLoad(async (options) => {
  const value = String((options as any)?.type || '')
  type.value = value === 'privacy' ? 'privacy' : 'user'
  uni.setNavigationBarTitle({ title: title.value })
  config.value = await getSiteConfig()
})
</script>

<style lang="scss" scoped>
.agreement-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100vh;
  padding: 16px 14px calc(24px + env(safe-area-inset-bottom));
  background: var(--bg);
  background-image: var(--gradient-page);
}

.agreement-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: var(--text);
}

.agreement-title .bi {
  font-size: 18px;
  color: var(--primary);
}

.agreement-desc {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.card-pad {
  padding: 18px;
}

.agreement-body {
  display: block;
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-soft);
  white-space: pre-wrap;
  word-break: break-word;
}

.agreement-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 2px;
}

.agreement-foot-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--primary-deep);
}
</style>
