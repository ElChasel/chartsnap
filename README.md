# ChartSnap 6.0 · Professional Plotting for Everyone

611 Studio。延续原ChartSnap：Upload → Select → Customize → Export。无需注册，本地解析xlsx/xls/CSV、专业图表和真实PNG/SVG导出；不启用AI、会员或商业MATLAB服务。

## 本次第一阶段

- 记录起止/步长/X-Y范围/不连续区间/鼠标框选/表格勾选；绘图、拟合、可见范围互相独立。
- 专业默认点径和Scientific/Journal/Engineering/Presentation配色；线点、字体、单位、范围、主次刻度、对数、反向与物理等比例。
- 同一Plot Specification驱动预览与按输出尺寸重新绘制；指定像素或mm，300/600 DPI PNG（含pHYs），真实矢量SVG。
- 原有14图类、处理流程、6类确定性模型与公式保留。PDF、MATLAB/Python脚本、Excel原生Chart是后续阶段，当前不提供。

## 静态构建（GitHub Pages测试版）

```sh
npm ci
npm test
npm run build:static
node scripts/serve-static.mjs
```

子路径预览：http://127.0.0.1:5180/chartsnap/ 。产物dist-static含index.html、库、CSS、图标和Inter字体，资源为相对路径。静态版没有API、统计、管理后台或模型调用；Excel无需服务器。`.github/workflows/pages.yml`准备Actions部署，站主已在Settings/Pages选择GitHub Actions。正式网址https://elchasel.github.io/chartsnap/已发布、HTTPS匿名可用，最终15项公网测试通过；用户本人确认大陆实体手机关闭VPN完整流程可用。

## 原Sites部署与开发

原站https://chartsnap-studio.super-ash-1449.chatgpt.site/保留；Worker/D1统计和/admin仍只在原站提供。不能将静态版看作后台迁移。开发/迁移/环境变量继续见docs/DEPLOYMENT.md；无需API密钥。`npm run dev`、`npm run build`生成原Sites Worker版本。生产AI_BILLING_AUTHORIZED保持false。

首版30–60秒制图是待真人验证的设计目标，未假称可用性测试已完成。用户已完成此次大陆无VPN手机流程实测；不保证所有地区/运营商未来均可达。

审计与开源选择见docs/AUDIT_V6.md，历史4.0交付见docs/DELIVERY_V4.md。更新前恢复标签chartsnap-v4-before-v6，父目录ChartSnap-v4-backup.zip。
