// PNG pHYs encodes pixels per metre. CRC includes the chunk type and payload.
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function withPngDensity(bytes,dpi){
  if(![300,600].includes(Number(dpi)))throw new Error('DPI仅支持300或600');
  if(bytes[0]!==137||bytes[1]!==80)throw new Error('不是PNG文件');
  const chunk=new Uint8Array(21),v=new DataView(chunk.buffer),ppm=Math.round(Number(dpi)/0.0254);
  v.setUint32(0,9);chunk.set([112,72,89,115],4);v.setUint32(8,ppm);v.setUint32(12,ppm);chunk[16]=1;v.setUint32(17,crc32(chunk.slice(4,17)));
  let pos=8,parts=[bytes.slice(0,8)],inserted=false;
  while(pos<bytes.length){const n=new DataView(bytes.buffer,bytes.byteOffset+pos,4).getUint32(0)+12;if(pos+n>bytes.length)throw new Error('PNG区块损坏');const type=String.fromCharCode(...bytes.slice(pos+4,pos+8));if(type!=='pHYs')parts.push(bytes.slice(pos,pos+n));if(type==='IHDR'&&!inserted){parts.push(chunk);inserted=true;}pos+=n;}
  const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){result.set(p,offset);offset+=p.length;}return result;
}
export function exportDimensions({mode='pixels',width=1440,height=900,scale=2,widthMM=85,heightMM=60,dpi=300}){
  const pixelWidth=mode==='physical'?Math.round(widthMM/25.4*dpi):Math.round(width*scale),pixelHeight=mode==='physical'?Math.round(heightMM/25.4*dpi):Math.round(height*scale);
  if(!Number.isFinite(pixelWidth)||!Number.isFinite(pixelHeight)||pixelWidth<100||pixelHeight<100||pixelWidth>10000||pixelHeight>10000||pixelWidth*pixelHeight>30000000)throw new Error('输出须为100–10000像素且不超过3000万像素');
  const ratio=mode==='physical'?dpi/96:scale;
  return {pixelWidth,pixelHeight,width:pixelWidth/ratio,height:pixelHeight/ratio,ratio,widthMM:pixelWidth/dpi*25.4,heightMM:pixelHeight/dpi*25.4,dpi};
}
