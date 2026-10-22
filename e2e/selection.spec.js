import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
const base=process.env.STATIC_TEST?'http://127.0.0.1:5180/chartsnap/':null;
const rows=Array.from({length:500},(_,i)=>({X:(i+1)**1.3,Y:3*(i+1)**1.3-7}));
async function start(page,values=rows,name='experiment.csv'){
  await page.goto(base||'/');
  const deny=page.getByRole('button',{name:'拒绝可选统计'});if(await deny.isVisible())await deny.click();
  await page.getByLabel('上传数据文件').setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(Papa.unparse(values))});
  await expect(page.getByTestId('chart').locator('svg')).toBeVisible();
}
async function range(page,a,b,target='plot'){
  await page.getByRole('button',{name:'精确选区',exact:true}).first().click();
  if(target==='fit')await page.getByRole('button',{name:'Fit Selection · 拟合选区',exact:true}).click();
  await page.getByLabel('起始记录 Start').fill(String(a));await page.getByLabel('结束记录 End').fill(String(b));
  await page.getByRole('button',{name:target==='fit'?'应用拟合选区':'应用绘图选区',exact:true}).click();
}
async function download(page,click){const wait=page.waitForEvent('download');await click();const d=await wait;return fs.readFile(await d.path());}
test('A: exact 100–150 selected records retain all 51 physical X/Y coordinates',async({page})=>{
  await start(page);await range(page,100,150);await expect(page.getByLabel('绘图记录计数')).toHaveText('Original: 500 points · Selected: 51 points');
  const bytes=await download(page,()=>page.getByRole('button',{name:'导出选区CSV',exact:true}).click());const selected=Papa.parse(bytes.toString('utf8').replace(/^\uFEFF/,''),{header:true,dynamicTyping:true}).data;
  expect(selected).toEqual(rows.slice(99,150));
  await page.getByRole('button',{name:'图表',exact:true}).click();await page.getByRole('button',{name:'散点图',exact:true}).click();
  await page.getByRole("switch",{name:"显示图例",exact:true}).uncheck();
  await expect(page.getByTestId('chart').locator('path[fill="#24455f"]')).toHaveCount(51);
});
test('B/C: 2px markers, axes, font and physical PNG density plus real vector SVG',async({page})=>{
  await start(page,rows.slice(0,20));await page.getByRole('button',{name:'散点图',exact:true}).click();await page.getByRole('button',{name:'Advanced',exact:false}).click();
  await page.getByLabel('散点大小',{exact:true}).fill('2');await page.getByLabel('显示连接线',{exact:true}).uncheck();
  await page.getByLabel('X 最小值').fill('0');await page.getByLabel('X 最大值').fill('60');await page.getByLabel('Y 最小值').fill('-10');await page.getByLabel('Y 最大值').fill('150');
  await page.getByLabel('X主刻度步长').fill('10');await page.getByLabel('Y 刻度间隔').fill('20');await page.getByLabel('X单位',{exact:true}).fill('s');await page.getByLabel('Y单位',{exact:true}).fill('μm');
  await page.getByLabel('图表标题').fill('Experiment · μm');
  await page.getByRole('button',{name:'导出',exact:true}).click();await page.getByLabel('输出尺寸模式').selectOption('physical');await page.getByLabel('物理宽度 mm').fill('101.6');await page.getByLabel('物理高度 mm').fill('76.2');
  const png=await download(page,()=>page.getByRole('button',{name:'下载 PNG',exact:true}).click());expect(png.readUInt32BE(16)).toBe(1200);expect(png.readUInt32BE(20)).toBe(900);const phys=png.indexOf(Buffer.from('pHYs'));expect(phys).toBeGreaterThan(0);expect(png.readUInt32BE(phys+4)).toBe(11811);expect(png.readUInt32BE(phys+8)).toBe(11811);await fs.writeFile('artifacts/v6-scientific-300dpi.png',png);
  const svg=(await download(page,()=>page.getByRole('button',{name:'下载 SVG',exact:true}).click())).toString('utf8');expect(svg).toContain('width="101.6mm"');expect(svg).toContain('height="76.2mm"');expect(svg).toContain('<text');expect(svg).toContain('<path');expect(svg).toContain('X (s)');expect(svg).toContain('Y (μm)');expect(svg).not.toContain('<image');await fs.writeFile('artifacts/v6-scientific.svg',svg);
});
test('D: independent fit samples survive viewport zoom and plot selection changes',async({page})=>{
  await start(page);await range(page,100,150,'fit');await page.getByRole('button',{name:'专业分析',exact:true}).click();await page.getByLabel('拟合模型').selectOption('linear');await page.getByRole('button',{name:'运行分析',exact:true}).click();
  await expect(page.locator('.model-result')).toContainText('样本数 n = 51');await expect(page.locator('.model-result')).toContainText('RMSE');
  await page.getByRole('button',{name:'Advanced',exact:false}).click();await page.getByLabel('X 最小值').fill('1');await page.getByLabel('X 最大值').fill('1000');await expect(page.locator('.model-result')).toContainText('样本数 n = 51');
  await range(page,1,20);await page.getByRole('button',{name:'图表',exact:true}).click();await expect(page.locator('.model-result')).toContainText('样本数 n = 51');await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 20 points');
  await page.getByRole('button',{name:'记录',exact:true}).click();
  const config=await download(page,()=>page.getByRole('button',{name:'导出 JSON',exact:true}).click());
  await fs.writeFile('artifacts/v6-analysis.json',config);
  await page.getByLabel('导入分析配置文件').setInputFiles({name:'replay.json',mimeType:'application/json',buffer:config});await page.getByRole('button',{name:'确认重放配置',exact:true}).click();
  await expect(page.locator('.model-result')).toContainText('样本数 n = 51');await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 20 points');
});
test('table checkboxes, saved intervals, restoration and settings undo are real',async({page})=>{
  await start(page,rows.slice(0,20));await page.getByRole('button',{name:'数据预览',exact:true}).click();await page.getByLabel('选择记录 1',{exact:true}).uncheck();await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 19 points');
  await page.getByRole('button',{name:'全部数据',exact:true}).click();await page.getByRole('button',{name:'精确选区',exact:true}).first().click();await page.getByLabel('多个不连续区间').fill('1-3,10-12');await page.getByRole('button',{name:'应用绘图选区',exact:true}).click();await page.getByRole('button',{name:'保存当前选择',exact:true}).click();await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 6 points');
  await page.getByRole('button',{name:'恢复全部数据',exact:true}).click();await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 20 points');await page.getByRole('button',{name:'载入 我的选区',exact:true}).click();await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 6 points');await page.getByRole('button',{name:'撤销设置',exact:true}).click();await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 20 points');
});
test('mouse rectangle selects actual marker coordinates rather than viewport zoom',async({page})=>{
  await start(page,rows.slice(0,20));await page.getByRole('button',{name:'散点图',exact:true}).click();await page.getByRole('switch',{name:'显示图例',exact:true}).uncheck();
  const markers=page.getByTestId('chart').locator('path[fill="#24455f"]');await expect(markers).toHaveCount(20);
  const a=await markers.nth(5).boundingBox(),b=await markers.nth(10).boundingBox();
  await page.getByRole('button',{name:'图中框选',exact:true}).click();
  await page.mouse.move(a.x-1,b.y-1);await page.mouse.down();await page.mouse.move(b.x+b.width+1,a.y+a.height+1,{steps:12});await page.mouse.up();
  await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 6 points');
});
test('subpath static app has no external or API runtime requests and parses real XLS',async({page})=>{
  test.skip(!process.env.STATIC_TEST,'static deployment only');const external=[],api=[];
  await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith('http')&&!u.startsWith('http://127.0.0.1:5180/')){external.push(u);return route.abort();}if(u.includes('/api/'))api.push(u);return route.continue();});
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.slice(0,20)),'实验');await page.goto(base);await page.getByRole('link',{name:'隐私政策',exact:true}).click();await expect(page.getByRole('heading',{name:'ChartSnap 静态版隐私说明',exact:true})).toBeVisible();await page.getByRole('link',{name:'返回绘图工具',exact:true}).click();await page.getByLabel('上传数据文件').setInputFiles({name:'real.xls',mimeType:'application/vnd.ms-excel',buffer:Buffer.from(XLSX.write(wb,{bookType:'biff8',type:'array'}))});await expect(page.getByTestId('chart').locator('svg')).toBeVisible();await expect(page.getByLabel('绘图记录计数')).toContainText('Original: 20 points');await expect(page.getByRole('button',{name:'同意匿名统计'})).toHaveCount(0);expect(external).toEqual([]);expect(api).toEqual([]);await page.screenshot({path:'artifacts/v6-static-desktop.png',fullPage:true});
});
