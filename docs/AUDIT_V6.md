# 6.0第一阶段审计与决策（2026-10-22）

## 原有代码与恢复点

保留原D:/网站开发/chartsnap项目及Sites项目身份。基线提交8f15f916c3bb307c3fe18c2e4b1c3d480c1da365，恢复标签chartsnap-v4-before-v6，父目录ChartSnap-v4-backup.zip；已发布Sites版本6是4.0恢复点。未删除D1或后台。

| 模块 | 实际现状及本次处理 |
|---|---|
| 框架 | React19.3.1、Vinext1.3.0、Vite8.3.5，原Sites Worker保留；另加纯静态Vite构建 |
| 绘图 | ECharts6.1.0，SVG预览与离屏SVG/Canvas重新排版；保留原14图类 |
| 解析 | SheetJS0.20.3、PapaParse5.5.3，本地Worker；本次增加真实BIFF .xls格式识别 |
| 数学 | 经过独立参考值和注册表测试的JS模块，原可选SciPy服务保留；没有从零重写新绘图算法 |
| 状态 | React设置、Worker处理快照；Plot/Fit Selection与viewZoom分别保存在同一Plot Specification |
| 图表设置 | 原轴范围与样式不足，本次加入X对数/主次刻度/反向/单位/物理等比例/字体和精确点径 |
| 导出 | 旧PNG只有倍数，SVG复制当前图；现在同一chartOption生成目标尺寸图、PNG pHYs及SVG物理宽高 |
| 外部网络 | 移除Google Fonts @import，Inter OFL字体本地打包、中文系统字体回退；库和图标随包，不依赖运行时CDN |
| 手机 | 保留已有面板切换、上传/下载与移动布局；新增控件采用自适应网格 |
| GitHub | 用户授权后可读写ElChasel/chartsnap，初始为空且private；Pages管理不在当前连接工具能力中，需站主在Settings启用 |

## 开源项目适用性与许可

核查的是官方项目和许可，不安装整套外部skill或Python浏览器运行时。没有宣称其所有传递依赖许可证均已完成法务审计。

- Plotly.js：MIT（https://github.com/plotly/plotly.js/blob/master/LICENSE）。适合科研坐标、误差和交互，但WebGL静态输出可能包含栅格层；第二套引擎会增加包体与双状态一致性负担。当前ECharts满足本阶段数值轴、框选、SVG/PNG，继续单引擎，不因名气替换。
- SciPy：BSD-3-Clause（https://github.com/scipy/scipy/blob/main/LICENSE.txt）。依赖NumPy等Python数值栈；适合离线参考验证和未来按需扩展，当前浏览器核心不依赖在线Python服务。
- Matplotlib：其官方Matplotlib许可证（https://github.com/matplotlib/matplotlib/blob/main/LICENSE/LICENSE），允许在保留声明等条件下使用，另有字体/依赖许可。未来Python脚本导出适用；本阶段没有声称已交付脚本或FIG。
- Pyodide：MPL-2.0核心（https://github.com/pyodide/pyodide/blob/main/LICENSE），浏览器WASM Python及各包有各自依赖/许可/体积。无需为已覆盖的计算下载大型运行环境，暂不引入。
- K-Dense Scientific Visualization：仓库MIT、具体skill也标MIT，已阅读公开说明（https://github.com/K-Dense-AI/scientific-agent-skills/blob/main/skills/scientific-visualization/SKILL.md）。可用于制图审查参考，不是浏览器绘图运行库；本次不安装整库或执行其网络环境脚本。实际代码落实数据选区、物理尺寸和元数据检验；预设不等于期刊合规，未指定具体期刊。
- 新增Inter Variable5.3.0：OFL-1.1，字体与许可随静态产物打包，public/licenses/Inter-OFL.txt；中文等未覆盖字符使用本机系统字体。

## GitHub Pages与大陆访问

官方 https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits 不允许将Pages当作在线商业/e-commerce/SaaS免费主机；本次只准备无账号、无付费、无后端的公开本地绘图工具测试站，不据此保证长期商业SaaS可用。

官方 https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site 说明私有仓库Pages取决于账户计划。没有购买计划或自动公开私有仓库。

GitHub Pages预期网址https://elchasel.github.io/chartsnap/ 不等于已经发布，也不能从作者其他站点可访问推断本站所有地区可达。静态子路径/离线资源验收与真实大陆无VPN手机网络验收分开记录。

## 最终状态补充

GitHub授权已生效、仓库由用户设置为public并启用Pages，https://elchasel.github.io/chartsnap/ 已HTTP200，最新main工作流成功发布；最终15项实际Pages浏览器验收通过。用户本人确认大陆实体手机关闭VPN后完整流程可用，不将其推广为所有网络保证。未购买域名、服务器、Pro或AI。
