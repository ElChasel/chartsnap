import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
const root=path.resolve('dist-static'),port=Number(process.env.PORT||5180);
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.json':'application/json'};
http.createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url==='/'){res.writeHead(302,{Location:'/chartsnap/'}).end();return;}if(!url.startsWith('/chartsnap/')){res.writeHead(404).end();return;}url=url.slice('/chartsnap/'.length)||'index.html';const target=path.resolve(root,url);if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}}).listen(port,'127.0.0.1',()=>console.log(`Static subpath preview: http://127.0.0.1:${port}/chartsnap/`));
