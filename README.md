# inis-app

INIS 移动端（uni-app + Vue3 + TypeScript + Vite），UI 用 [wot-design-uni](https://wot-design-uni.pages.dev/)，样式用 [UnoCSS](https://unocss.dev/) 原子类。

> 当前阶段：可浏览可互动（登录 / 注册 / 首页列表 / 详情页 / 评论 / 点赞 / 关注 / 搜索 / 消息）

## 技术栈

| 能力 | 选型 | 版本 |
|---|---|---|
| 跨端框架 | uni-app（Vue3 + Vite） | `3.0.0-5020620260917001` |
| 构建 | Vite | `5.2.8`（uni-app 要求精确版本） |
| 语言 | TypeScript | `^5.6` |
| UI 组件库 | wot-design-uni | `^1.14` |
| 原子化 CSS | UnoCSS（presetWind3） | `^66.11` |
| 状态管理 | Pinia | `^4.1` |

## 快速开始

```bash
cd inis-app
npm install

# H5（默认 http://localhost:5173，/api 已代理到本地后端 8642）
npm run dev:h5

# 微信小程序：产物在 dist/dev/mp-weixin，用微信开发者工具导入
npm run dev:mp-weixin

# App：产物在 dist/dev/app，用 HBuilderX 运行/打包
npm run dev:app

# 生产构建
npm run build:h5
npm run build:mp-weixin

# 类型检查
npm run type-check
```

## 目录结构

```
inis-app/
├── src/
│   ├── api/                 # 接口层（与后端控制器一一对应）
│   │   ├── request.ts       # uni.request 封装：业务码判断、token 注入、401/412 统一处理
│   │   ├── ids.ts           # ids 归一化：query 传逗号串 / body 传数组（后端两套口径）
│   │   ├── comm.ts          # 登录 / 注册 / 验证码 / 重置密码 / check-token
│   │   ├── article.ts       # 文章列表、详情
│   │   ├── moments.ts       # 动态列表、详情
│   │   ├── comment.ts       # 评论列表（comment/flat）、发表 / 删除
│   │   ├── like.ts          # 点赞（user-likes）：like / unlike / is-liked / counts / 我赞过的 id
│   │   ├── collect.ts       # 收藏（user-collects）：collect / uncollect / is-collected / counts
│   │   ├── follow.ts        # 关注（user-follows）：关注四态、关注 / 粉丝列表、社交数字
│   │   ├── search.ts        # 搜索（search/*）六种类型 + 全局搜索
│   │   ├── notification.ts  # 消息（notification/*）：列表、未读数、已读、清空
│   │   ├── attachment.ts    # 附件上传（uni.uploadFile，评论图片用）
│   │   └── types.ts         # 响应体、分页、用户、文章、动态、评论、通知等类型
│   ├── components/          # ArticleCard / MomentCard / TitleBadge / CodeInput /
│   │                        # CommentList（评论区）/ CommentItem / CommentEditor / LikeBar
│   ├── composables/         # usePagedList（分页列表）、useCountdown（发码倒计时）
│   ├── pages/
│   │   ├── index/index.vue          # 首页：文章 / 动态 Tab 列表 + 未读角标
│   │   ├── discover/index.vue       # 发现：热榜 + 热门话题
│   │   ├── search/index.vue         # 搜索：综合 + 单类型（含历史与关键词高亮）
│   │   ├── message/index.vue        # 消息：分类通知列表 + 未读角标
│   │   ├── mine/index.vue           # 我的：搜索 + 资料卡（签到 / 金币 / 经验 / 内容）
│   │   │                            #   + 消息条 + 常用 / 最近使用 + 等级 / 会员卡
│   │   ├── article/detail.vue       # 文章详情：封面 + 分类/置顶 + 作者卡 + 阅读信息
│   │   │                            #   + 正文 + 底部固定操作栏（评论 / 点赞 / 收藏）
│   │   ├── moment/detail.vue        # 动态详情：同上
│   │   ├── user/author.vue          # 作者主页：社交数字 + 四态关注按钮 + 动态 / 文章
│   │   ├── user/follow.vue          # 关注 / 粉丝名单
│   │   ├── captcha/index.vue        # 通用滑块验证页（428 风控时由请求层拉起）
│   │   ├── login/index.vue          # 登录
│   │   ├── register/index.vue       # 注册
│   │   └── reset-password/index.vue # 重置密码
│   ├── stores/user.ts       # 登录态（token + user）
│   ├── utils/               # storage / toast / nav / validate / helper /
│   │                        # comment（层级重建）/ markdown / html（清洗与高亮）/
│   │                        # captcha（滑块闸门：428 拦截 → 验证页 → 原请求重放）
│   ├── App.vue
│   ├── main.ts
│   ├── pages.json           # 页面路由 + wot-design-uni 的 easycom 规则
│   ├── manifest.json        # 各端配置（appid、h5、mp-weixin）
│   └── uni.scss             # 全局设计变量（会自动注入到每个组件）
├── uno.config.ts            # UnoCSS：presetWind3 + 主题色 + 快捷类
├── vite.config.ts           # 插件顺序（UnoCSS 在 uni 之前）+ dev 代理
└── .env.development / .env.production
```

## 后端对接

后端（仓库根目录的 Go 项目）默认监听 **8642**，接口统一挂在 `/api` 下。

### 开发环境

`vite.config.ts` 里已把 `/api`、`/dev` 代理到 `http://127.0.0.1:8642`，因此 **H5 开发时不需要改后端 CORS 配置**。

### 生产环境

1. 改 `.env.production` 的 `VITE_API_BASE`（可写 `https://your-domain.com` 或 `https://your-domain.com/api`，两种写法都兼容）。
2. H5 部署后若与后端不同源，需要把 H5 的访问来源加入后端 `config/app.toml`：

   ```toml
   [system.cors]
   allowed_origins = "https://your-domain.com,http://localhost:5173"
   ```

   否则浏览器预检会被后端直接 403。
3. 微信小程序不走浏览器 CORS，但必须在微信后台配置 request 合法域名，且**只能是 https**。

### 关于登录加密

后端 `comm/login` 只有在请求头 `X-Gorgon` 命中 `^([\w+]{16})\D+([\w+]{16})$` 时才走 AES 解密分支；**不带这三个头就是明文登录**（见 `app/api/controller/comm.go`）。

本端选择明文 + HTTPS 的方案，省掉一套容易和后端不同步的加密实现；若后续要接（例如为兼容官方主题的抓包策略），在 `src/api/comm.ts` 的 `login` 里补 `X-Argus/X-Gorgon/X-Khronos` 即可。

### 关键接口约定（踩坑点）

- **HTTP 状态码恒为 200**，业务结果看响应体 `code`（200 成功 / 201 验证码已发送 / 401 未登录 / 412 未安装 / 428 需滑块）。
- **分页结构是嵌套的**：`data.data` 是列表、`data.count` 是总数、`data.page` 是总页数。
- **分页参数名是 `limit`，不是文档里的 `size`**：列表接口统一走 `meta.limit(ctx)`（读 query 的 `limit`，并按站点配置封顶）；`user-likes` / `notification` 的文档写的是 `size`，实际不生效。
- **列表的 `field` 白名单必须带 `result`**，否则作者 / 评论数会被后端裁掉（`src/api/article.ts` 已处理）。
- **作者信息内联在列表项里**：`item.result.author`，不需要另调 users。
- **token 放 `Authorization` 头且不加 `Bearer`**（`src/api/request.ts`）。
- **`comment/flat` 的 `replies` 是扁平数组**：后端从根评论递归收集**所有层级**的后代后一次性挂在根评论上，且只有根评论有该字段。要真实层级必须按 `pid` 重建（`src/utils/comment.ts` 的 `buildCommentTree`），直接按一层渲染会把三层以上的回复错挂到根评论下。
- **点赞 / 关注的部分接口要求登录**：`user-likes/is-liked`、`user-follows/is-following|relation|suggest` 在权限规则里是 `type=login`（与接口文档里「公共接口」的描述不一致，以 `app/model/auth-rules.go` 为准），所以未登录时要跳过请求而不是等 401。
- **通知没有推送**：只落库，前端靠拉列表 + 轮询未读数（`notification/unread-count`）刷新角标；列表分页参数走 `notification/list`。
- **评论审核**：`comment/create` 返回 `{ id, audit, pending }`，`pending=true` 时评论不会立刻出现在列表里（非管理员只查得到 `audit=1`），前端需自行提示并插入本地占位。
- **428 滑块风控**：任意接口都可能返回 `code=428`，**题目随响应下发**：`data.captcha = { token, target, width, tolerance, expire }`，其中 `target` 是**落点百分比**（10~90）而不是像素，`tolerance` 为 3。后端没有独立的校验接口 —— 正确做法是把 `captcha_token` + `captcha_value` 补进**原请求**重放，中间件在这一次请求里就地校验，通过后继续走原业务。`api/request.ts` 已统一拦截并拉起 `pages/captcha`，业务代码无需感知；同 IP 每分钟取题 ≥20 次会返回 `{ limited: true, message }`（此时没有 token）。
- **附件上传绕过了统一封装**（`uni.uploadFile` 走不了 `uni.request`），所以 428 兜底需要在 `api/attachment.ts` 里单独做一次。

## 已实现

- [x] 登录（账号 / 邮箱 / 手机号 + 密码）
- [x] 注册（邮箱 / 手机号 + 验证码 + 密码，兼容站点开启人工审核的场景）
- [x] 重置密码（验证码校验 + 新密码）
- [x] 首页文章列表、动态列表（Tab 切换、下拉刷新、触底分页、空状态）
- [x] 登录态持久化（本地缓存 + 冷启动 check-token 校正）
- [x] 文字头衔 / 图片头衔渲染（与后台装扮系统同口径）
- [x] 文章详情页、动态详情页（Markdown / 富文本正文、图片预览、分享）
- [x] 文章详情版式：封面、分类 / 置顶徽章、作者卡（关注）、阅读时长 / 字数 / 阅读量信息条、底部固定操作栏（发表评论弹层 / 点赞 / 收藏 / 评论数）
- [x] 评论区（主评论 + 多级回复、评论图片上传、评论点赞、删除自己的评论、待审核占位）
- [x] 点赞（文章 / 动态 / 评论）、关注作者（列表卡片与详情页，四态关注按钮）
- [x] 搜索（文章 / 动态 / 用户 / 话题 / 页面 / 友链 + 综合搜索、关键词高亮、搜索历史）
- [x] 消息中心（评论 / 点赞 / 关注 / 系统分类、未读角标、全部已读、清空已读）
- [x] 作者主页与关注 / 粉丝名单
- [x] 通用滑块验证（428 风控自动拦截 → 验证页拖动 → 原请求带票据自动重放）
- [x] 个人中心（资料卡 / 金币 / 经验 / 等级进度 / 每日签到 / 未读消息条 / 常用九宫格 / 最近使用）
- [x] 底部导航消息未读角标

## 待办（下一步）

- [ ] 资料编辑、我的装扮、常用入口自定义排序（「编辑」目前只提示）
- [ ] 个人中心的「任务中心 / 认证中心 / 推广中心 / 钱包 / 商城 / 我的订单 / 会员」等入口只有占位提示
- [ ] 我的收藏 / 我的点赞列表页
- [ ] 发布动态与文章（创作入口目前仅占位）
- [ ] 独立页面（`search/pages` 命中的内容）在 App 内的渲染容器；目前点按只做提示
- [ ] 「点赞 / 收藏」类通知的落地页：其 `bind_id` 是**评论 id**，需要先有评论详情锚点
- [ ] 第三方登录（微信 / QQ 等，需各端 appid）

## 常见问题

**Q：`npm install` 报 uni-app 相关依赖版本不存在？**
uni-app 的版本号必须**全家桶一致**（`@dcloudio/*` 都是 `3.0.0-5020620260917001`）。升级时用官方版本管理器一次性对齐：

```bash
npx @dcloudio/uvm@latest
```

**Q：H5 打开接口 403 / 跨域报错？**
开发环境请确认后端已启动在 8642；生产环境把来源加入后端 `allowed_origins`。

**Q：启动时报 `"unocss/vite" resolved to an ESM file. ESM file cannot be loaded by require`？**
已修，**这两处不要改回去**：

1. `package.json` 里的 `"type": "module"` —— unocss 66 是 ESM-only，而 uni-app 默认会把 `vite.config.ts` 按 CJS 打包后再 require，必然撞上这个错；加 `type: module` 后 vite 会按 ESM 加载配置。
2. `vite.config.ts` 里对 uni 插件的取值兼容 —— `@dcloudio/vite-plugin-uni` 是 CJS 包，切到 ESM 后 `import uni from '...'` 拿到的是 `module.exports` 而不是插件函数（报 `uni is not a function`），所以写了 `typeof uniPlugin === 'function' ? uniPlugin : uniPlugin.default`。

**Q：构建时一堆 `DEPRECATION WARNING` 来自 wot-design-uni 的 scss？**
那是组件库内部用了 Sass 的全局内建函数（`unquote` 等），Dart Sass 3.0 才会移除，当前只影响日志，不影响产物。

**Q：小程序里 UnoCSS 的类没生效？**
1. 确认 `main.ts` 里 import 了 `virtual:uno.css`，并且 `vite.config.ts` 中 `UnoCSS()` 排在 `uni()` **之前**。
2. **不要写任意值类**（`bg-#f6f7f9`、`text-[#333]`）：小程序 WXSS 不支持带转义符的选择器，整条样式会失效。颜色统一用命名色（`bg-page`、`bg-primary`）或 UnoCSS 内置色板（`text-gray-400`）。
3. 字号写 `text-13px`（带单位），不要写 `text-13` —— 后者在 UnoCSS 里是 `13 × 0.25rem` = 3.25rem。

**Q：尺寸单位怎么算的？**
`uno.config.ts` 里的 `postprocess` 会把 rem 统一换算成 rpx（1rem = 16px = 32rpx），因为小程序没有 html 根元素，rem 没有参照。所以 `h-8` = 2rem = 64rpx ≈ 32px，和 750 设计稿一致。
