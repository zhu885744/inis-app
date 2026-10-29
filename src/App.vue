<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

onLaunch(() => {
  // 冷启动时若本地有 token，静默校验一次：过期 / 被封禁会在请求层统一清理登录态
  if (userStore.token) {
    userStore.checkLoginState().catch(() => {})
  }
})
</script>

<!-- Mellow 移植层的全局样式（设计 token / 组件类 / 图标字体） -->
<style src="./mellow/assets/index.css"></style>

<style lang="scss">
/* 全局基础样式：uni.scss 里的变量由 uni-app 自动注入，可直接使用 */
page {
  background-color: $inis-bg;
  color: $inis-text;
  font-size: 28rpx;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* 通用文本截断 */
.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ellipsis-2 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* wot-design-uni 主题色对齐主色 */
page {
  --wot-color-theme: #{$inis-primary};
}
</style>
