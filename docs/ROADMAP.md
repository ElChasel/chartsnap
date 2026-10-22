# 路线图与扩展接口

## P0 稳定性

文件解压炸弹防护、Worker 中增量 CSV 解析、百万行分块存储、显式单位、分布多系列验收与可访问性键盘验收。加强全局取消和内存预算。

## P1 专业分析

4.0已完成分组聚合、金融口径确认和波动/回撤/CAGR、指数对数线性拟合。后续：安全表达式AST、相对误差、更多模型注册与独立参考值验证。把 Python 扩展模型接入显式传输授权流程。AI 无法确定参数时只生成待确认方案，不能计算虚构结果。

## P2 设计（未实现）

`GET/POST /projects` 与版本快照，保存 schema/变换/图表配置，原始数据采用用户显式选择的存储；`POST /batch` 返回任务 ID；`GET /reports/:id`；OIDC 账号；`POST /billing/checkout` 与幂等 webhook；API key、配额和审计。`/capabilities` 当前对这些接口标记 not_implemented，避免可用性误导。不接入任何支付，也不开通计费。
