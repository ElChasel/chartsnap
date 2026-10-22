# ChartSnap 4.0 — 611 Studio Edition 交付记录

日期：2026-10-22（Asia/Shanghai）。

- 公网：https://chartsnap-studio.super-ash-1449.chatgpt.site ，原网址保留，HTTPS，公开工具无需登录。
- Sites已保存版本6（产品4.0），部署succeeded；部署ID：appgdep_6ad9cf25f74881918a33c26079f8b545。
- 线上功能源码提交：0909ded4c4e3fc62f44d1a67caae7eaa43fee7e9。后续文档补充不改变产品行为。
- 托管为Cloudflare Worker / Vinext / D1；线上四张业务表已创建。
- 健康接口200，version=4.0.0，analytics_configured=true，ai_configured=false。
- 匿名管理API和伪造站主身份头均401。站主本人已确认登录看到统计面板，生产管理查询200。最终公网15通过、0失败、1本地登录专用项跳过；本地16通过、Vitest62通过、pytest14通过。
- 第一方统计需同意后启用，统计始于升级后，不回填历史；验收数据属于测试流量。第三方平台未配置。
- 用户未购买域名，候选研究见DOMAINS.md；没有购买、绑定或切换网址。
- 用户未授权付费AI：没有密钥或真实请求费用。已实现严格计划接入和关闭降级，mock不能当作真实模型验收。
- GitHub目标 https://github.com/ElChasel/chartsnap.git 已记录；当前连接读取404，未推送。源码同步Sites源仓库，另提供本地源码包。
- 3.0回滚点：Sites版本3、Git标签chartsnap-v3-before-v4、父目录ChartSnap-v3-backup.zip。

测试与风险见TEST_REPORT_V4.md和KNOWN_LIMITATIONS.md。npm审计仍有6项high构建依赖链风险。没有购买域名、订阅或开通付费AI；托管与数据库长期费用受账号配额和政策影响，不能保证永久免费。
