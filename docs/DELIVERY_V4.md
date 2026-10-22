# ChartSnap 4.0 — 611 Studio Edition 完整交付报告

日期：2026-10-22。4.0主站已发布并实测；独立域名与真实付费AI按用户选择未启用。

## A. 公网网址

https://chartsnap-studio.super-ash-1449.chatgpt.site/ 保持原地址、HTTPS。公众上传与绘图无需登录；后台需管理员登录。没有购买或绑定新域名，旧推广链接仍可用。候选chartsnap.studio、chartsnap611.com、611studio.dev的RDAP查询未找到记录，不能视作可注册或价格确认；同名产品碰撞与后续步骤见DOMAINS.md。

## B. 品牌

原创C与采样轨迹Logo、611 Studio标识、3个方案及选择说明、真实ICO/16与32像素PNG、Apple图标与manifest已交付。611 Studio介绍弹窗展示用户提供的双语介绍；Title为“ChartSnap — Intelligent Data Visualization | 611 Studio”，含Description、OG/Twitter与1200×630分享图。资源和元数据线上通过；微信/小红书真实抓取未测试。见BRAND.md和public品牌资源。

## C. 运营后台

https://chartsnap-studio.super-ash-1449.chatgpt.site/admin 。ChatGPT平台登录后，服务端校验ADMIN_EMAILS；站主已确认进入，生产查询200，匿名及伪造身份请求401。统计实际写D1，没有随机模拟数值。

有PV/UV/会话、今日访客、最近5分钟活跃会话、图表/导出/AI请求及错误、处理耗时、导出转化、有序漏斗、功能使用、渠道/国家/设备/系统/浏览器、新老访客。15秒自动与手动刷新，支持时间范围、时区、趋势粒度、渠道筛选。首次有效采集约2026-10-22 16:54上海时间，含本次验收流量。

默认不采集，需要同意；不保存文件内容/字段/文件名/AI问题。统计覆盖已同意且未拦截流量，UV为浏览器标识估计。没有升级前历史、精确人数、跨设备归并、录屏热力图、可靠机器人识别，也没有同步原生Sites Analytics。第三方分析平台未接入。口径与保留限制见OPERATIONS.md。

## D. 新增功能

原折线、散点、柱、面积、直方、箱线保留；增加横向柱、热力、饼、环、气泡、相关矩阵、对称误差棒、多图布局，共14类图表/布局。支持多Y、双轴、Scientific/Dark主题、副标题、线点和透明度、图例、坐标与原PNG/SVG导出。

新增筛选/稳定排序/分组聚合/合并拆分/异常标记、10步撤销重做；带源文件SHA-256的JSON配置导入预览和原子重放；处理后CSV/XLSX及计算记录。金融增加累计收益、年化波动、历史最大回撤、CAGR并要求确认年化与年数。新增指数对数线性拟合，保留残差与比较。

未包含蜡烛、提琴、等高线、3D和任意表达式/LOESS等高级扩展；误差棒不自动生成置信区间。完整边界见KNOWN_LIMITATIONS.md。

## E. AI

没有真正调用大模型，没有API密钥，没有模型调用费用；默认配置名gpt-4.1-mini不代表已使用。首页和顶部Ask ChartSnap入口明确显示未启用，接口503降级；免费本地数值计算正常。

已实现：问题与统计摘要经同意传输→服务端严格结构输出→字段/注册公式/模型校验→假设和待确认问题→用户确认→本地Worker真实计算和图表/残差。Mock响应已验证这条流水线，不当作真实模型质量验收。

注册公式12项：差分、变化率/简单收益、对数收益、累计和、移动平均、样本标准差、Min–Max、Z-Score、累计收益、年化波动、历史最大回撤、CAGR。模型6项：线性、二次多项式、指数对数线性、分段线性插值、PCHIP、移动平均。数值由JavaScript Worker确定性引擎执行，原可选Python/NumPy/SciPy服务保留但未公网部署。

未来需用户授权预算与服务商后才设置服务端Secrets并打开计费开关。已实现日请求数/频率/超时/缓存/输出token控制，它们不替代服务商金额硬上限。见AI_V4.md。

## F. 测试

Vitest62/62、pytest14/14、本地Playwright16/16通过；最终公网15通过、0失败、1本地模拟登录专用项跳过。站主已人工确认生产登录。10k XLSX 861ms、100k CSV 2729ms为最终公网单次测量，不是SLA。真实导出文件内容、数据库事件和未授权拒绝均实测。

npm审计残留6项high，来自braces构建依赖链；构建有source-map与大chunk警告。没有声称0风险。首次公网发现的统计Request.cf调用错误已修复并复测。社交平台抓取、新域名和真实LLM未验收。细节见TEST_REPORT_V4.md与KNOWN_LIMITATIONS.md。

## G. 维护

源码目录D:/网站开发/chartsnap；完整移交包D:/网站开发/ChartSnap-4.0-source.zip。线上功能提交0909ded4c4e3fc62f44d1a67caae7eaa43fee7e9，后续仅交付文档更新；Sites保存版本6、部署appgdep_6ad9cf25f74881918a33c26079f8b545成功。

GitHub目标https://github.com/ElChasel/chartsnap.git 当前连接仍404，未推送；需要在GitHub应用安装权限授予该仓库访问。已有本地与Sites源仓库备份。不要在公开聊天发送token。

npm ci→配置本地.dev.vars→迁移本地DB→npm run dev；发布前npm test / test:e2e / build，使用Sites源同步助手保存并发布原project_id。主部署是Vinext/Worker+D1，不能按静态Pages上传。环境变量ADMIN_EMAILS、ANALYTICS_SECRET、ANALYTICS_DAILY_LIMIT已配置；AI_BILLING_AUTHORIZED=false，OPENAI_API_KEY未设置。其余可选变量与Windows维护说明见DEPLOYMENT.md。回退点为Sites版本3/Git标签chartsnap-v3-before-v4/ChartSnap-v3-backup.zip，回退不删除D1。

## H. 成本

- 托管：沿用现有Sites，未购买外部套餐；长期额度和计费以账号与平台规则为准。
- 域名：未购买，当前注册费用0；未来有注册/续费/可能溢价，应结算前核价。
- AI API：未启用，本次真实调用费用0；未来按服务商用量计费。
- 分析平台：本站第一方，无第三方分析订阅；事件消耗Worker/D1资源。
- 数据库/存储：新增D1存事件，不存Excel；未启用R2。请求、数据库读写和存储受平台额度，可能存在持续成本。
- 其他：可选Python托管、反馈服务、未来账号/报告等若启用可能另外收费，当前未购买。

没有保证永久免费，没有授权或执行购买。下一步仅需按需授予GitHub仓库访问；域名购买和真实AI预算留待用户另行决定。
