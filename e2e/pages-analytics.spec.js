import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const base='https://elchasel.github.io/chartsnap/';
for(const blocked of [false,true])test(`private analytics transport ${blocked?'unreachable':'accepted'} preserves real upload/export`,async({page})=>{
 const bodies=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://elchasel.github.io/chartsnap/**',async route=>{
  const pathname=new URL(route.request().url()).pathname.slice('/chartsnap/'.length)||'index.html';
  const bytes=await fs.readFile('dist-static/'+pathname);
  const ext=pathname.split('.').pop(),types={html:'text/html',js:'application/javascript',json:'application/json',css:'text/css',svg:'image/svg+xml',woff2:'font/woff2'};
  await route.fulfill({body:bytes,contentType:types[ext]||'application/octet-stream'});
 });
 await page.route('https://gateway.umami.is/**',async route=>{bodies.push(route.request().postDataJSON());if(blocked)await route.abort();else await route.fulfill({status:200,contentType:'application/json',body:'{}'});});
 await page.goto(base+'?utm_source=xiaohongshu&private=SECRET_URL');
 await expect(page.getByRole('button',{name:'同意匿名统计'})).toBeVisible();expect(bodies).toHaveLength(0);
 await page.getByRole('button',{name:'同意匿名统计'}).click();
 await page.getByLabel('上传数据文件').setInputFiles({name:'SECRET_FILENAME.csv',mimeType:'text/csv',buffer:Buffer.from('SECRET_X,SECRET_Y\n1,3\n2,5\n3,7')});
 await expect(page.getByTestId('chart').locator('svg')).toBeVisible();
 await page.getByLabel('图表标题').fill('SECRET_CHART');
 await page.getByRole('button',{name:'精确选区',exact:true}).first().click();
 await page.getByLabel('起始记录 Start').fill('1');await page.getByLabel('结束记录 End').fill('2');
 await page.getByRole('button',{name:'应用绘图选区',exact:true}).click();
 await expect(page.getByLabel('绘图记录计数')).toContainText('Selected: 2 points');
 await page.getByRole('button',{name:'图表',exact:true}).click();
 await expect(page.getByTestId('chart').locator('svg')).toBeVisible();
 await page.getByRole('button',{name:'导出',exact:false}).first().click();
 for(const format of ['PNG','SVG']){const download=page.waitForEvent('download');await page.getByRole('button',{name:`下载 ${format}`}).click();expect((await download).suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));}
 if(!blocked){await expect.poll(()=>bodies.filter(b=>b.payload.name==='chart_exported').length).toBe(2);await expect.poll(()=>bodies.some(b=>b.payload.name==='data_range_adjusted')).toBe(true);expect(bodies.map(b=>b.payload.name)).toEqual(expect.arrayContaining(['studio_opened','file_upload_succeeded','chart_generated','chart_exported']));}
 await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
 await page.getByRole('button',{name:'隐私设置',exact:true}).click();
 await page.getByRole('button',{name:'拒绝可选统计'}).click();const count=bodies.length;
 await page.getByRole('button',{name:'导出',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载 SVG'}).click();await download;
 expect(bodies).toHaveLength(count);
 expect(JSON.stringify(bodies)).not.toContain('SECRET');expect(errors).toEqual([]);
});
