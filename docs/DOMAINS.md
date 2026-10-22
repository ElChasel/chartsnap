# 域名评估与绑定

当前网址保持 https://chartsnap-studio.super-ash-1449.chatgpt.site/ 。Site身份和slug不变，旧推广链接继续可访问。用户明确表示尚未购买域名，本次没有注册、购买、绑定候选域名或修改DNS。

Sites工具具备列出/添加自定义域名、读取DNS要求、刷新验证状态的能力；现有域名列表为空。尚无用户自有域名，不能验证真实DNS、www或自定义域名HTTPS证书，不能把候选写成已部署网址。

## 2026-10-22 查询记录

| 候选 | RDAP查询 | 可以得出的结论 |
|---|---|---|
| chartsnap.studio | https://rdap.org/domain/chartsnap.studio 返回404 | 未找到登记记录，不能等同可注册/非保留/非溢价 |
| chartsnap611.com | https://rdap.org/domain/chartsnap611.com 返回404 | 同上 |
| 611studio.dev | https://rdap.org/domain/611studio.dev 返回404 | 同上 |

公开名称搜索发现其他数据/交易分析产品使用ChartSnap：

- https://www.chartsnap.ai/ ：交易图表分析产品。
- https://chartsnaps.com/ ：图表数据提取产品。
- https://chartsnap.co.kr/ ：图表制作产品。

也检索到611studio.com这一近似域名，但这不证明611studio.dev的权利状态。以上是名称碰撞初筛，不是商标清查或无冲突结论；未取得任何商标权声明。扩大商业推广前需要针对目标市场再核查名称与商标，暂不擅自更名。

RDAP工具说明与查询入口：https://lookup.icann.org/ 。最终能否注册、首年/续费价格、保留与溢价状态都应在注册商结算前确认。

## 最少人工步骤

1. 自行打开所选注册商，例如 https://dash.cloudflare.com/ 的 Domain Registration，搜索候选并核对续费价与名称风险。购买由你决定，本项目没有购买授权。
2. 把已拥有的确切域名与DNS管理平台告诉本聊天。保留同一个Site，调用Sites的Add custom domain取得实际DNS记录，再按返回记录添加，不能预先编造CNAME目标。
3. 等待Sites域名验证与HTTPS证书生效后，分别验证主域、www、旧地址及旧推广链接；再决定主域与跳转策略。不要先关闭旧地址。

没有为了换网址迁移整套网站。服务端升级仍在原Sites项目内完成。
