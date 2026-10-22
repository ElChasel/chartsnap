# ChartSnap · 611 Studio

产品与工作室分工：ChartSnap 是数据分析与可视化产品；611工作室 / 611 Studio 是独立创作工作室品牌，不表示已注册公司、团队规模或客户资质。

## 原创标识评估

`public/brand-concepts.svg` 保存三个实际矢量草案：

1. **C + 采样轨迹（采用）**：开放 C 外轮廓表达探索边界，内部折线与方形样本表达数据到洞察。40 单位网格、两档笔画、单色底；16/32 像素仍能区分外轮廓与数据节点。
2. **折叠 S**：辨识简洁，但缩小后内部折叠容易混在一起，数据语义较弱。
3. **611 采样柱**：工作室关联明确，但小尺寸更像数字与普通柱形图，产品独立识别较弱。

611 Studio 使用简洁字标，强对比的 611 与轻字重 Studio 区分品牌层级。矢量源 `public/611-studio.svg`。使用主色 #5754d6，浅背景白底，深背景可使用白字标。ChartSnap 图形自带靛蓝底，在浅/深背景均有边界。

## 资源

favicon.svg、favicon.ico（真实 PNG 16/32 双分辨率容器）、favicon-16x16.png、favicon-32x32.png、apple-touch-icon.png（180）、icon-192.png、icon-512.png、social-preview.png（1200×630）均为实际文件，源为手工原创 SVG。`node scripts/brand-assets.mjs` 可重建位图。没有使用第三方品牌图标替代 Logo。

Title、Description 与 OG/Twitter 元数据由 app/layout.tsx 服务端输出。社交预览仅展示品牌和示意线条，不展示用户数据或虚构运营成绩。微信、小红书的实际抓取与缓存需平台支持，不能承诺展示效果。PWA manifest 只提供安装品牌元数据，没有声明离线可用。

名称调查发现 chartsnap.ai、chartsnaps.com、chartsnap.co.kr 等相近/同名产品；这不是商标法律清查，也不能得出可注册商标或无冲突的结论。按用户要求保留当前产品名；购买域名或扩大商业推广前应进一步做目标市场名称与商标核查。
