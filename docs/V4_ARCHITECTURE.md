# 4.0 架构与边界

在原有 src/engine.js、Worker、ECharts、React 工作台基础上扩展，没有重新开发产品或更换 Site 身份。标签 chartsnap-v3-before-v4、父目录 ChartSnap-v3-backup.zip、Sites 版本3保存旧版回退点。

## 服务端

采用 Sites 官方 Vinext starter 的构建、Cloudflare Worker、请求身份和源同步集成，保留 sites() 插件、worker/index.ts 的请求上下文。`.openai/hosting.json` 保留原 project_id，将静态配置升级为 D1 `DB`；未启用 R2。迁移由 Drizzle 生成，Sites 发布时应用，处理路由中不创建表。

- `/api/analytics/session`：同意后签发30分钟 HMAC会话 Cookie；访客随机标识在服务端加盐哈希，数据库不存原标识。
- `/api/analytics/events`：同源、签名、有效期、频率和属性白名单校验；事件 UUID 为主键，重试不重复计数；服务端时间戳，事件不带用户内容。
- `/api/admin`：每次检查平台注入的登录身份与 ADMIN_EMAILS；匿名401，其他账号403。前端没有管理密码。依赖 Sites 身份网关清理用户伪造身份头，公网伪造身份头已验证返回401。
- `/api/plan`：密钥与 AI_BILLING_AUTHORIZED 同时成立才可调用。关闭时直接503，完全不调用模型。启用后需登录、传输同意、D1日调用预算、用户频率限制、最多2个当前实例并发、20秒超时、1200输出token、严格JSON Schema、服务端注册表/字段校验、5分钟/50条内存缓存。多实例并发限制不是全局信号量，日预算存储为D1。调用失败由用户显式重试，不做可能重复计费的自动重试。
- `/api/health`：仅返回版本和启用状态，不暴露密钥。

平台后台未提供可调用的原生 Sites Analytics 查询工具，因此没有声称同步原生历史数据。新后台只展示本站经同意的第一方事件。未接入 PostHog/Clarity，避免额外账户、重复采集和录屏风险。

## 客户端计算

保留原公式/模型模块，增加 workflows.js、pro-charts.js、pro-controls.jsx。Worker维护不可变派生快照、10步撤销/重做及结构化处理步骤。手动类型选择保留。JSON配置包含源文件SHA-256、工作表、处理步骤、图表配置和模型；重放前要求匹配文件、确认，Worker校验步骤后原子提交。JSON不包含原始数据，重放需要原文件。

主工作台在浏览器懒加载，公开页面服务端输出品牌和分享元数据。CSV/XLSX解析、公式、回归、插值仍在本地Worker；完整统计不基于显示采样。指数拟合为对数线性模型，误差与指标回到原Y空间；不是非线性最小二乘。相关矩阵使用成对有效样本的Pearson r，至少3点，常量列留空。

数据导出：CSV对潜在公式文本转义并告知；XLSX使用字符串单元格存文本，数值/百分比按当前类型输出数值，不执行文本公式。透明/深色图导出保留真实预览背景与缩放。

可选 Python 数值API与Render配置仍保留，属于3.0兼容扩展；主站统计、鉴权、AI接入现由Worker提供，不需要Render在线。没有配置真实模型服务或域名。

生产原生Request.cf只在Worker入口读取，写入被服务端覆盖的内部国家头；框架路由只读取该头，避免包装请求上的原生getter错误。客户端伪造国家头不会覆盖平台元数据。
