# 6.0当前部署状态

GitHub Pages已启用，正式网址https://elchasel.github.io/chartsnap/；仓库https://github.com/ElChasel/chartsnap现为public。Actions自动测试、构建及发布，发布前验证提交仍是main HEAD。历史旧工作流无此检查，不应重跑旧提交；回退请将旧内容作为新提交或运行最新main的workflow_dispatch。最终Pages15项测试通过，用户已确认大陆无VPN实体手机完整流程可用。原Sites与后台继续保留。完整记录见DELIVERY_V6_PHASE1.md。下方是早期部署说明与历史状态，以本段为准。

# 6.0静态部署补充

新的静态构建命令为npm run build:static，产物dist-static/index.html，支持/chartsnap/子路径，无API/AI/统计依赖。GitHub授权现已修复，可同步ElChasel/chartsnap；Pages启用与私有仓库账户计划需在GitHub Settings验证。下面保留4.0 Worker部署说明，其GitHub404与旧静态备用页段落仅为历史记录，以本段及AUDIT_V6为准。

# ChartSnap 4.0 部署与维护

## 当前主部署

保留原Sites项目与网址：https://chartsnap-studio.super-ash-1449.chatgpt.site/ 。4.0已经从纯静态形态扩展为同Site的Vinext/Cloudflare Worker + D1，**不能再把npm run build的dist当成纯静态Pages目录上传**。

项目身份在`.openai/hosting.json`，保留project_id，D1绑定名DB，R2为null。starter的sites() Vite插件、Worker入口、官方ChatGPT身份集成和迁移文件必须保留。

环境：Node22.13+；实际验收Node24.14.0。`npm ci`安装锁定依赖，`npm test`，`npm run test:e2e`，`npm run build`。产物为dist/server与dist/client，Sites源助手打包，保存版本并部署到原项目。后台`/admin`使用站点所有者ChatGPT账号登录，再由服务端ADMIN_EMAILS校验。

## 必需与可选环境变量

| 名称 | 位置与用途 |
|---|---|
| ADMIN_EMAILS | 服务端允许的管理员邮箱，逗号分隔；不设置则拒绝全部管理员 |
| ANALYTICS_SECRET | 服务端Secret，密码学随机32字节以上，用于匿名会话签名和标识加盐，禁止放前端 |
| ANALYTICS_DAILY_LIMIT | 默认20000事件/24小时的应用保护阈值，不是金额预算 |
| AI_BILLING_AUTHORIZED | 当前false；只有用户明确授权后才可改true |
| OPENAI_API_KEY | 尚未配置；服务端Secret，不能填公开页面 |
| OPENAI_MODEL / OPENAI_BASE_URL | 可配置模型名称/可信HTTPS兼容接口，只有服务端读取 |
| AI_DAILY_REQUEST_LIMIT | 默认30，服务端D1保存日请求预算；还需供应商金额硬上限 |
| FEEDBACK_URL | 可选HTTPS问卷/反馈地址；未配置时明确展示未设置 |
| VITE_API_URL | 默认/api同源，不需要配置；一般不应改为外部API |

通过Sites原生Secrets/环境配置工具设置生产值，不上传.env/.dev.vars。生产没有本地模拟身份。当前模型因用户拒绝计费授权而关闭，即使存在密钥也必须先检查计费开关。

## 本地开发与数据库

复制`.dev.vars.example`到未跟踪的`.dev.vars`，本地ADMIN_EMAILS使用seedy@sites.test。先构建生成Wrangler配置，再按README命令对DB应用drizzle/0000_silky_the_fallen.sql。开发`npm run dev`；完整生产产物本地预览`npm start`。只有dev提供loopback模拟登录，start不模拟。

修改schema时`npm run db:generate`生成新增迁移，检查SQL，不修改已经应用的迁移历史。Sites发布会在上传Worker前应用迁移；失败发布也可能已经应用，应检查实际状态，不反复重放或删除表。数据库不放原始Excel。

## 版本与回退

旧可用静态版保留Sites版本3、Git标签chartsnap-v3-before-v4和父目录ChartSnap-v3-backup.zip。回退使用该已保存版本重新部署，保留旧网址。回退静态版后新统计API不可用，但数据库应保留，不自动删除；重新发布4.0可恢复访问。

这台Windows的原生fs.cpSync曾导致打包崩溃，可仅在源助手进程设置NODE_OPTIONS加载scripts/windows-copy-compat.cjs，路径由实际checkout确定，不是生产依赖。工具包管理器Windows shim曾出现npm路径故障，已使用普通npm安装/构建通过；源助手可以省略已完成且输入未变化的构建。

## GitHub和其他平台

用户提供https://github.com/ElChasel/chartsnap.git，但当前连接仍返回404，未取得写入权限。没有声称已推送；完整源码在当前checkout及Sites源仓库。后续需要在GitHub应用安装权限中授予该仓库访问，再同步，不能把Sites源仓库称作GitHub。

本次没有为域名迁移整套网站。未来若迁移Cloudflare/Vercel，应先核对数据库迁移、身份网关、成本、隐私和旧链接保留。其他平台不能直接信任oai身份请求头，必须实现等价身份校验。`build:static`只保留独立基础绘图备用页，standalone.html不是4.0后台部署方案。

可选Python/FastAPI和render.yaml仍保留。它们用于3.0兼容数值扩展，没有公网部署，不是当前Worker后台。不要把Render部署误认为已经具备站点网关身份与D1统计。

## 上线检查

验证匿名HTTPS、上传和多Sheet、绘图与坐标、PNG/SVG、favicon/OG、AI503降级、默认不采集、同意后真实写D1、匿名及伪造身份头不能读管理API。管理员本人还应通过顶层ChatGPT登录确认后台数据，记录采集起始与更新时刻。
