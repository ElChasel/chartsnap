# 4.0 测试记录

日期2026-10-22，Windows，Node24.14.0，Playwright系统Edge，单浏览器worker。

- Vitest **62/62通过**：保留30项，新增图表/工作流/金融/指数18项，以及持久SQL、鉴权、会话签名、跨源拒绝、属性白名单、事件幂等、有序漏斗、活跃过期、日限额、时区/DST、AI无计费授权不调用/严格输出/缓存/超时14项。SQL测试使用真实SQLite兼容D1接口，不用假统计数值。
- Playwright完整本地 **16/16通过**：旧9项保持；新增品牌与元数据/资产、8类新增图表、筛选预览与撤销重做/真实派生XLSX/JSON重放、mock计划执行本地公式与拟合、真实同意埋点与撤回Cookie、匿名管理API拒绝，以及本地登录管理员读取真实D1数据、刷新与手机布局。
- 已修复验收暴露问题：旧根index.html抢占元数据；图表错误视图复用DOM造成removeChild异常；多系列箱线图空占位导致ECharts异常；导出CSV来源的XLSX数值类型；管理员手机布局横向溢出；SQL RETURNING关键字引用。
- 生产构建通过；框架有source-map和动态导入/大chunk警告，没有假称构建零警告。
- 当前npm审计6项high，均为braces构建glob依赖链，上游最新3.0.3尚未修复；没有虚称0漏洞。Next/RSC/Vite/Cloudflare工具与fflate已更新。详见KNOWN_LIMITATIONS。
- 原Python数值API保留并复测；独立NumPy/SciPy核对仍属于基础计算验证，不能当作真实模型API调用。

## 性能

本地全套测试单次暖浏览器：10,000行真实XLSX上传到SVG **1319ms**，100,000行CSV **2833ms**。同一阶段其他运行出现1008–1373ms /2776–2833ms。包含解析、Worker传递、全量识别及首次绘图；不是SLA，没有百万行性能声明。

## 公网验收

最终Sites保存版本6（产品4.0），公网完整Playwright **15通过、0失败、1跳过**。跳过项是仅限本地的模拟管理员登录；站主本人已回复“已登录并看到统计面板”，生产日志管理API返回200。最终匿名和伪造身份管理请求均401，AI未配置返回503。实际文件上传、多Sheet、14类图表、金融计算、处理回放、PNG/SVG/XLSX导出、手机布局、favicon/OG和隐私撤回均通过。

公网单次性能：10k XLSX **861ms**，100k CSV **2729ms**。前次公网出现767ms /3783ms；网络、缓存与机器负载会改变结果，不承诺固定时延。

首次公网回归发现3失败：独立APIRequestContext受到平台403拒绝，以及Cloudflare原生Request.cf经框架包装后Illegal invocation导致统计会话400。已改用浏览器实际fetch验收，保持401断言；元数据在Worker入口读取并覆盖内部国家头，拒绝信任用户输入。修复后全套公网通过，D1检查确认真实page_view/studio_opened/file_upload_started/file_upload_succeeded/chart_generated事件，统计会话和事件接口均200。首批有效事件约2026-10-22 16:54（Asia/Shanghai），包含验收流量。

最近修改后Vitest62项复测通过，构建通过。源码密钥特征扫描0命中。Mock AI测试始终拦截上游，不代表真实模型调用。

社交平台实际抓取和自定义域名未验收：没有购买域名，不伪造结果。真实AI未验收：用户未授权付费，未发送任何真实模型请求。
