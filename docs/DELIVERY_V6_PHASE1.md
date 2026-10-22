# ChartSnap 6.0 · 第一阶段交付与验收

2026-10-22（Asia/Shanghai）。按任务书先交付核心体验；没有提前将PDF/脚本/Excel原生Chart等第二阶段能力写为完成。

## 网址、源码与恢复

原站：https://chartsnap-studio.super-ash-1449.chatgpt.site/ 。公开工具不需登录，HTTPS，保留原Sites身份和/admin后台。

GitHub：https://github.com/ElChasel/chartsnap 。用户已授予访问，完整133个源码文件已同步；首次完整交付提交edcd5e6233cd6aeb6f768e1d06ef9603490a0a72，后续正确性补丁以main最新提交为准。

GitHub Pages预期https://elchasel.github.io/chartsnap/，截至最终核查该网址HTTP404，不能当作已部署网址。Actions已实际跑通npm ci、84项当时单元测试及静态构建，configure-pages因未启用Pages返回404。当前连接不能管理Pages设置，已请站主在Settings/Pages选择GitHub Actions。仓库初始为private，未擅自公开或购买Pro。

恢复点：Git标签chartsnap-v4-before-v6、父目录ChartSnap-v4-backup.zip、旧Sites保存版本6（产品4.0）；新产品版本6.0和Sites内部版本号不是同一个编号。数据库保留。

## 已实现及相较4.0的变化

1. 本地解析xlsx、BIFF xls、CSV，保持多Sheet/多Y/字段识别/缺失提示、预览和拖拽。
2. 新增独立Plot Selection / Fit Selection / Axis Visible Range：全部、记录起止、每N行、X/Y范围、不连续区间、真实鼠标矩形框选、表格勾选、保存/载入、恢复全部。显示Original/Selected。记录1起始且不含表头，导入跳过空白，因此不是原Excel工作表行号；经过处理后索引针对当前处理表，处理变化时选区恢复全部。
3. 保留原ECharts单引擎与14图类，重点完善散点、线、连接线+标记、多Y和已有误差棒/双轴。真实非均匀X不变；缺失Y在线图中保留空断点，显示降采样只保留真实点，不平均化分析数据。
4. 专业默认点径随点数与图形尺寸调整，可直接输入2等精确数值；空心标记/线型/连接线/标记开关、透明度、颜色、字体、背景、图例。Scientific/Journal/Engineering/Presentation以及兼容旧主题。预设不是期刊合规保证。
5. 坐标范围、X/Y主刻度、次刻度、X/Y对数、反向、旋转、科学计数、精度/有效数字、标题与手动单位、单Y线性物理等比例。非法范围和不支持配置给出说明；双Y要求恰好2个Y及折线/散点/面积，右轴自动独立范围。
6. 同一chartOption与选区、轴、样式组成Plot Specification。预览与导出均由其生成，不各自维护数据。输出按目标尺寸重新布局；指定像素或mm，300/600DPI PNG并写入真实pHYs，SVG是真实路径与文字并有物理宽高。标记输入为逻辑px（96DPI布局），栅格按输出DPI同比例缩放；SVG文字可编辑但字体未嵌入，异机可能使用字体回退。
7. 样式设置撤销/重做、恢复专业默认；保留数据处理撤销重做。拟合显示样本n/区间/表达式/参数/R²/RMSE/MAE/残差，不以R²宣布最优。导出项目配置包含两类选区、可见范围与导出参数；重放按相同文件指纹还原拟合选区。
8. 首页与工作台改为Upload→Select→Customize→Export，移除不可用AI主入口；不调用付费模型。移除Google Fonts网络请求，Inter OFL字体本地打包，库与图标本地资源，中文系统字体回退。
9. npm run build:static生成dist-static/index.html，资源相对路径；真实/chartsnap/子路径运行。静态版不调用任何API/统计/登录，普通Excel上传与图表/导出不依赖后端。原站运营后台未迁移到Pages。

## 真实测试

- 最终Vitest86/86通过（4文件），覆盖原计算、SQL与鉴权，以及24项新选区/样式/导出/示例测试。
- 本地整套浏览器回归20通过、0失败、1项静态专用项跳过；独立静态子路径6/6通过；本地管理员登录与真实D1另1/1通过。
- 原网址发布后完整公网20通过、0失败、1静态专用项跳过。最后正确性补丁公网定向5/5通过，另1项静态专用跳过。已发布Sites内部版本8，产品6.0；线上功能提交05b1772b8fbcaca9722ae0c9572e571750c59dcb，部署appgdep_6ad9ff90e5d881919813c40f334bcd16成功。后续只有文档与静态分支隐私链接修复，不改变原Sites行为。
- 场景A：500条中100–150得到51条，选区CSV每个真实X/Y与源记录逐项相等；去掉图例后SVG恰好51个散点。
- 场景B/C：精确2逻辑px散点、关闭连接线、手动轴/刻度/字体/单位；101.6×76.2mm、300DPI PNG实际1200×900、pHYs11811像素/米；600DPI另外实测2400×1800、pHYs23622像素/米。SVG实际物理宽高、text/path且无image栅格层。PNG肉眼检查未裁切示例标签/图例，不保证任意长文本自动排版。
- 场景D：独立51点拟合，改变可见范围或绘图为20点不改变拟合n；JSON重放后仍51点。真实鼠标矩形框选得到6条对应记录。
- 静态模式拦截所有外网请求后，实际BIFF xls仍可上传绘图；API请求数0。Inter资源随构建输出。
- 手机390×844模拟视口：上传500条、选择51条、下载PNG成功，scrollWidth390，无页面横向溢出。不是实体iOS/Safari或大陆网络验收。
- 8组固定seed611样例涵盖20、500、5000不均匀、10000多系列、负数/0、突变、噪声及已知拟合，检查渲染数据均来自真实观测。node scripts/generate-v6-fixtures.mjs可重建CSV。
- 公网单次：10k XLSX753ms、100k CSV1187ms；本地790ms/2803ms。受网络/缓存/机器影响，不是固定SLA或真人完成任务时间。
- npm审计仍6项high构建依赖链风险、0critical；与4.0已知braces链相关。静态子路径隐私链接及返回首页另外1/1复测通过。构建有source-map/大chunk警告，GitHub Actions有旧action运行时兼容警告；没有声称零风险。

## 已修复问题

静态Vite8手动拆包配置类型不兼容；新增静态privacy.html抢占原服务器/privacy路由；PNG data URL被CSP阻止fetch；选区与拟合回放使用了不同数据集；非正模型曲线在对数轴静默消失；双轴三系列歧义。均已修复并做相应复验。

## 未完成、网络与最少人工步骤

第一阶段仍有GitHub Pages实际启用及大陆无VPN实体手机网络验证的外部步骤；30–60秒首次用户可用性目标尚未真人测试。没有将构建成功或其他GitHub站点可访问冒充这些结果。

第二阶段尚无PDF矢量导出、Excel原生Chart对象、MATLAB.m/.fig或Python脚本；现有数据XLSX导出只是数据，不冒充原生图表。也没有引入Pyodide/付费AI/会员/MATLAB服务。

不提供任意LaTeX排版、全套英文本地化、任意单系列样式独立编辑、复杂坐标或期刊专用合规保证。高级非核心图的部分数值轴配置会明确提示未应用。处理后表的记录索引不承诺对应原工作表物理行号。

站主只需：在GitHub仓库Settings/Pages选择GitHub Actions；若私有仓库计划不支持，告知页面提示，再决定是否公开源码，不必购买服务。待真实网址发布后，在关闭VPN的实体手机网络完成首页→上传→选区→调整→导出验证。发布前不需要域名或服务器付款。

## 交付文件与成本

D:/网站开发/ChartSnap-6.0-source.zip 为源码包，D:/网站开发/ChartSnap-6.0-static.zip 为可直接部署的静态产物，D:/网站开发/ChartSnap-6.0-examples.zip 为PNG/SVG/配置/8个CSV示例。源码目录D:/网站开发/chartsnap。

没有购买域名、服务器或计划，AI API费用0；静态版普通使用不需要额外专业软件许可。GitHub Pages有服务条款和额度限制，不能许诺长期商业SaaS免费托管；原Sites Worker/D1仍受原平台额度和计费规则约束。许可证及依赖选择见AUDIT_V6.md。
