import {chromium} from '@playwright/test';
import {readFile,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
let executablePath='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';try{await access(executablePath);}catch{executablePath=undefined;}
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
for(const [size,name]of [[16,'favicon-16x16.png'],[32,'favicon-32x32.png'],[180,'apple-touch-icon.png'],[192,'icon-192.png'],[512,'icon-512.png']]){const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});const svg=await readFile('public/favicon.svg','utf8');await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px">${svg.replace('<svg ','<svg width="100%" height="100%" ')}</body></html>`);await page.screenshot({path:'public/'+name,omitBackground:true});await page.close();}
const page=await browser.newPage({viewport:{width:1200,height:630}});await page.setContent(await readFile('public/social-preview.svg','utf8'));await page.locator('body').evaluate(el=>el.style.margin='0');await page.screenshot({path:'public/social-preview.png'});await browser.close();
// ICO supports PNG image entries; generate a real multi-resolution icon container.
const images=await Promise.all([16,32].map(n=>readFile(`public/favicon-${n}x${n}.png`))),header=Buffer.alloc(6+16*images.length);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);let offset=header.length;
images.forEach((bytes,i)=>{const pos=6+i*16,size=[16,32][i];header[pos]=size;header[pos+1]=size;header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(bytes.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=bytes.length;});await writeFile('public/favicon.ico',Buffer.concat([header,...images]));console.log('Generated SVG, PNG, ICO and social preview brand assets.');
