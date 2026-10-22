# 交付记录

- 产品：ChartSnap 3.0 核心工作台。
- 日期：2026-10-22（Asia/Shanghai）。
- 公开地址：https://chartsnap-studio.super-ash-1449.chatgpt.site
- 托管：Sites / Cloudflare Workers 静态部署。访问模式 public。
- 当前线上版本：2。部署状态 succeeded。部署 ID：appgdep_6ad9ab9f31508191b7472100b1fc9895。
- 功能代码版本：aa4516c035a624036508dcd349352fba811865a8。此后仅文档/格式维护不会改变产品行为。
- 验收：30 项 Vitest + 14 项 pytest + 最终公网 9 项 Playwright 全通过。
- 安全审计：npm 和 Python requirements 解析依赖均未报告已知漏洞；源码密钥特征扫描 0 命中。
- 公网性能：10k XLSX 1069 ms，100k CSV 2828 ms，本机 Edge 单次测量。
- AI：未接入真实模型；没有密钥，未发送真实表格数据至模型服务，未产生模型调用费用。
- 可选 Python 后端：本地测试通过，未部署到公网；Render 缺少账号访问凭据。
- GitHub：连接中未列出可访问仓库，工具不支持建仓。需要用户创建空仓库并提供 URL，才能继续交付 GitHub 副本。
- 源码：当前目录、Sites 同步源仓库；工作区父目录另有 `ChartSnap-source.zip` 可移交，不含密钥、node_modules 或用户数据。

没有购买域名、订阅或开通付费服务。当前托管政策与长期额度以账号服务条款为准，不能保证永久免费。后续启用模型 API 可能产生按量费用，建议先设置服务商硬预算。
