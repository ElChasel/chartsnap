# ChartSnap 6.0 网站运营统计 · 611 Studio

## 私有后台

登录本人 Umami Cloud 账号后打开：
https://cloud.umami.is/websites/af4b0c27-c80e-420a-a199-98643805f8c0

如登录后没有自动返回，打开 https://cloud.umami.is/ → Websites → ChartSnap 6.0。
勿启用 Share URL；本项目没有制作公开后台、管理员密码或读取数据的前端 API Key。网站 ID 是公开采集标识，并非登录凭据。此系统只统计 GitHub Pages 新站，不继承旧 chatgpt.site 的数据。

## 选择与成本（2026-10-22 官方文档核查）

|方案|免费/部署|适用性与隐私|大陆网络|
|---|---|---|---|
|Umami Cloud Hobby（采用）|$0，1网站，每月100,000事件，保留6个月，无自购服务器|自定义事件、属性、漏斗、近期活跃；使用官方 HTTP 接口，完全不加载第三方 JS|海外采集接口，必须实机测试；可能漏计|
|Cloudflare Web Analytics|免费、无需迁移DNS，托管|隐私友好；官方 FAQ 尚不支持自定义事件、UTM，无法完整分析上传/导出漏斗|同样需验证，不能因品牌推断可达|
|Microsoft Clarity|免费托管|HTML与操作重建会话；仅遮盖不足以满足本地数据隐私边界，未接入|无需为测试而引入录屏|
|自托管 Umami|开源，但需数据库、运行环境及维护|控制力强，非最低维护成本|取决于所选主机和合规条件|
|GoatCounter 托管|合理用量下个人/中小企业可免费|可作基础访问/事件备选；漏斗和细分体验不同|同样需真实测试，不承诺可达|

仅保留 Hobby；不添加付款方式、不升级、不购买服务。定期查看账户 Usage。PV、自定义事件及属性均消耗事件额度（属性也计量），10万不是10万访客。本站每页最多发送300条、队列30条；失败清队列、60秒冷却、不自动重试，范围变更按700ms操作组去抖。不是全站免费额度的硬性封顶器；达到额度时先停用采集或联系站主，不能自行升级。

## 指标与操作

Dashboard 日期选择 Today、Last 7 days、Last 30 days；按日查看 Views / Visitors。设置统一时区（建议 Asia/Shanghai）。同一网站 Overview 可看国家/地区、设备/浏览器与近期活跃；活跃表示近期收到事件，不是持续连接人数。

|业务指标|页面/事件|口径|
|首页PV|页面 `/chartsnap/`|同意后实际进入首页；初始和返回首页计次|
|Studio PV|页面 `/chartsnap/studio`|SPA虚拟路径；hash不外传|
|进入Studio|`studio_opened`|每次进入，去除React重复调用|
|上传成功|`file_upload_succeeded`|Worker解析完成；不含文件名、格式/行数或内容参数|
|生成图表|`chart_generated`|实际渲染新数据/映射/图形类型/模型；样式输入、resize不计|
|范围调整|`data_range_adjusted`，属性 `scope=plot/fit/viewport`|实际选区变化、范围恢复或缩放操作组；不发送范围值|
|图表导出|`chart_exported`，属性 `format=png/svg`|导出成功触发；Events→Properties 按格式拆分|

访客 UV 是 Umami 匿名会话标识的去重数：由站点、IP、User-Agent及轮换盐推算，当前文档默认盐按月轮换。共享网络可能合并，IP/浏览器变化可能拆分，跨期不可直接把每日UV相加，也不代表精确自然人数。没有本站自定义 visitor ID 或追踪Cookie。

**来源**：为避免私密URL泄漏，不上传原始referrer。Overview 的 Tags/标签筛选或 More→Tags 查看 `direct / xiaohongshu / wechat / search / douyin / bilibili / newsletter / other_referrals / other_campaign`。平台原生 Referrers 空白是此隐私设计的结果。无法精确区分无referrer的APP分享与直接访问。

小红书推广链接使用 `https://elchasel.github.io/chartsnap/?utm_source=xiaohongshu`；微信用 `utm_source=wechat`。只把白名单来源映射为固定标签，原始query、UTM文本、campaign和分享路径全部丢弃。未标记且APP不传来源时会归为 direct，不能凭空归因。

**漏斗需在本人登录的官方UI保存**：进入该网站 Reports → Funnel（若UI调整，以 Funnel 功能为准）→ 新建，命名“首页到图表导出”，依次加入 URL `/chartsnap/` → Event `studio_opened` → Event `file_upload_succeeded` → Event `chart_generated` → Event `chart_exported`。时间窗口建议60分钟，保存。直接进入Studio的用户不属于此首页漏斗；可另建以studio_opened开头的漏斗。无需提供密码/API Key给开发者。官方后台日期筛选、标签及事件属性已能覆盖运营，无需新做后台。

## 隐私、权限与采集边界

- 静态站只运行自有代码，唯一统计外连是 `https://gateway.umami.is/api/send`。CSP不允许远程JavaScript。无Clarity、DOM快照、录屏、自动点击或表单监听。
- 用户明确同意后才传输；拒绝/重新打开隐私设置立即停止后续采集，清队列，尝试中止在途请求。已被接收的请求无法撤回。DNT、GPC和本机排除均优先于同意。
- 撤回入口：首页/Studio底部“隐私设置”。本机排除：在网站控制台执行 `localStorage.setItem('chartsnap.pages.analytics.exclude','true')` 并刷新；恢复用 removeItem 同一键。
- 固定事件白名单逐字段重新构造payload，未知事件/任意属性丢弃。不发送文件、名称、列、单元格、图表、用户输入、错误详情、原始query/hash/referrer。上传仍在本地Worker解析。
- 请求 `credentials: omit`、`referrerPolicy: no-referrer`。粗化屏幕与语言。Umami仍处理网络IP、浏览器UA和Origin用于地域/设备与匿名标识；安全日志和跨境处理仍有风险，并非零个人元数据。隐私告知已更新，站主需持续评估适用法律和服务条款。
- 页面状态“采集接口已接收”仅表示HTTP成功，不等于已独立查验私有Dashboard；必须由站主登录确认计数。网络/同意/拦截均会造成漏计，不能与GitHub仓库流量等同。
- 运营后台采用Umami账号身份验证。本地前端不存管理员密码，未创建公开分享链接；项目公开UUID可被伪造事件，常见客户端统计均有此完整性局限。

## 部署及故障恢复

生产配置：`public/analytics-config.json`，provider固定、UUID必须合法、enabled必须true，且运行主机/路径必须是 `elchasel.github.io/chartsnap/`。本地预览不发事件。紧急停用设enabled=false，提交main等Pages部署；无需更换网站代码或依赖。旧Site遥测保持独立。

构建 `npm run build:static`；单元测试 `npm test`；隐私与失败隔离浏览器测试 `npx playwright test e2e/pages-analytics.spec.js`。浏览器测试拦截线上域名映射到本地构建，并模拟采集响应，绝不向真实项目写测试数据。真实发布验收会产生少量真实访问/导出记录，应在运营解释中计入验收流量。

大陆验收必须使用关闭VPN的实体网络，访问主页→同意统计→上传CSV→导出PNG/SVG，查看页底状态，并在本人私有后台确认事件；之前“网站无需VPN可用”的验收不代表新采集接口可达。此开发环境不能冒充大陆移动网络。若失败，先保留绘图正常运行，报告漏计，再评估GoatCounter实测或经授权配置自有域名/免费Worker转发；不自动引入第二套重复统计、付费主机或将数据转给旧Site。

官方参考：
- https://umami.is/pricing
- https://docs.umami.is/docs/api/sending-stats
- https://docs.umami.is/docs/metric-definitions
- https://docs.umami.is/docs/tags
- https://docs.umami.is/docs/funnel
- https://umami.is/privacy
- https://umami.is/dpa
- https://developers.cloudflare.com/web-analytics/faq/
- https://learn.microsoft.com/en-gb/clarity/session-recordings/recordings-overview
- https://www.goatcounter.com/

## 发布验收记录（2026-10-22）

- 源码提交：ab81ac08e9ec4330805211288b3a4435c136d2f3。
- GitHub Pages工作流：https://github.com/ElChasel/chartsnap/actions/runs/39793577118 。生产构建与93项单元测试成功，发布日志于14:21:17 UTC报告Reported success；公网首页已返回同一构建的standalone-CzNNfXtK.js和新CSP。
- 正式网站于北京时间22:22左右完成真实验收，非模拟接口：2个PV、studio_opened、file_upload_succeeded、chart_generated、data_range_adjusted(scope=plot)、chart_exported(format=png)、chart_exported(format=svg)，共8条请求全部HTTP200并返回cache/sessionId/visitId。下载成功、无页面运行错误。渠道标签other_campaign（验收链接utm_source=release_validation），初始少量数据包含验收流量，不应解读为自然获客。
- 本地93项单元测试、15项原有浏览器功能场景与2项新增隐私/故障隔离场景分别验证通过；Edge在连续启动新context时偶发退出，单独运行故障场景通过。范围调整与撤回同意后停止采集已验证。
- 未登录访问具体后台地址会跳转到Umami Cloud官方登录页，未创建公共分享。
- HTTP采集成功不等于已读取私有报表：已请站主登录确认数据和保存漏斗。大陆实体手机网络的新采集链路也已请求站主确认，开发环境不能替代该测试。当前不声称这两项已验收。
- 未购买、升级或配置付费服务。保留Hobby账户，不开启试用或付款。
