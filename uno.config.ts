import { defineConfig, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss'

/**
 * UnoCSS 配置
 *
 * 说明：presetWind3 是 unocss 内置预设（Tailwind 风格的原子类），H5 与小程序都能用；
 * 若后续要更好的小程序适配（rpx 自动换算、类名转义等），可另装社区预设
 * `@uni-helper/unocss-preset-uni` 并替换 presets。
 */
export default defineConfig({
  presets: [presetWind3()],

  // 允许在 style 里用 @apply / @screen，以及变体分组写法 hover:(bg-red text-white)
  transformers: [transformerDirectives(), transformerVariantGroup()],

  theme: {
    colors: {
      // 与后台 / Mellow 主题一致的朱砂主色
      primary: '#c7482a',
      'primary-light': '#d9664c',
      'primary-dark': '#a3391f',
      // 页面底色；灰色系直接用 UnoCSS 内置色板（gray-100 ~ gray-800）
      //
      // 注意：不要用 bg-#f6f7f9 这类任意值类 —— 小程序端 WXSS 不支持
      // 带转义符的选择器（.bg-\#f6f7f9），会整条样式失效。
      page: '#f6f7f9',
      // 分割线 / 卡片描边
      line: '#eef0f3'
    }
  },

  /**
   * uni-app 小程序端没有 html 根元素，1rem 没有参照（H5 也只是碰巧接近），
   * 所以把 UnoCSS 产出的 rem 统一换算成 rpx：1rem = 16px = 32rpx（750 设计稿，1px = 2rpx）。
   * H5 端 uni-app 会把 rpx 按屏幕宽度换算回 px，因此两端视觉一致。
   */
  postprocess: (util) => {
    util.entries.forEach((entry) => {
      const value = entry[1]
      if (typeof value === 'string' && value.includes('rem')) {
        entry[1] = value.replace(/(-?\d*\.?\d+)rem/g, (_, num: string) => `${Number(num) * 32}rpx`)
      }
    })
  },

  shortcuts: {
    // 布局
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'flex-col-center': 'flex flex-col items-center justify-center',

    // 文本层级：与参考图的信息层级一致（标题深、正文中、辅助信息浅）
    'text-main': 'text-gray-800',
    'text-sub': 'text-gray-500',
    'text-weak': 'text-gray-400',

    // 卡片与分割线
    'app-card': 'bg-white rounded-3',
    'feed-card': 'bg-white px-4 py-3 mb-2',
    'divider': 'h-px bg-line',

    // 主题色渐变（今日头条卡、底部发布按钮）
    'bg-primary-gradient': 'bg-gradient-to-br from-primary-light to-primary-dark'
  }
})
