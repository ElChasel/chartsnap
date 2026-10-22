import {number,dateValue} from './engine.js';

export const ALL_SELECTION = Object.freeze({start:1,end:'',stride:1,intervals:'',xMin:'',xMax:'',yMin:'',yMax:'',records:null});
export const PROFESSIONAL_DEFAULTS = {
  theme:'Scientific',pointSize:'',opacity:0.85,lineWidth:1.4,fontSize:12,
  fontFamily:'Inter Variable, Arial, Microsoft YaHei, sans-serif',showMarkers:true,showLine:true,
  xTick:'',xLog:false,minorTicks:false,minorSplit:5,xRotate:0,yRotate:0,
  xInverse:false,yInverse:false,xUnit:'',yUnit:'',equalAspect:false,
  precisionMode:'decimal',background:'#ffffff',
  plotSelection:{...ALL_SELECTION},fitSelection:{...ALL_SELECTION},viewZoom:null,
};
export function selectRecords(data,selection={},mapping={}) {
  const s={...ALL_SELECTION,...selection},count=data.rows.length;
  const start=Number(s.start),end=s.end===''?count:Number(s.end),stride=Number(s.stride);
  if(!Number.isInteger(start)||start<1||!Number.isInteger(end)||end<start||end>count||!Number.isInteger(stride)||stride<1)
    throw new Error(`记录范围须为1–${count}的整数，结束不小于开始；步长须为正整数。`);
  let intervals=null;
  if(s.intervals.trim()){
    intervals=s.intervals.split(/[,，;]/).map(part=>{
      const m=part.trim().match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/);
      if(!m)throw new Error('不连续区间格式示例：1-20,100-150,300');
      const a=Number(m[1]),b=Number(m[2]||m[1]);
      if(a<1||b<a||b>count)throw new Error('不连续区间超出当前数据记录范围');
      return [a,b];
    });
  }
  const chosen=s.records===null?null:new Set(s.records);
  if(chosen&&(!Array.isArray(s.records)||s.records.some(n=>!Number.isInteger(n)||n<1||n>count)))throw new Error('勾选记录超出数据范围');
  const bounds={};for(const k of ['xMin','xMax','yMin','yMax']){bounds[k]=s[k]===''?null:Number(s[k]);if(s[k]!==''&&!Number.isFinite(bounds[k]))throw new Error('选区值范围必须为有限数值');}
  for(const a of ['x','y'])if(bounds[a+'Min']!==null&&bounds[a+'Max']!==null&&bounds[a+'Min']>bounds[a+'Max'])throw new Error('选区值上限不能小于下限');
  const xType=data.columns.find(c=>c.name===mapping.x)?.type;
  const indices=[];
  data.rows.forEach((row,i)=>{
    const n=i+1;if(n<start||n>end||(n-start)%stride!==0||chosen&&!chosen.has(n)||intervals&&!intervals.some(([a,b])=>n>=a&&n<=b))return;
    const vals={x:xType==='date'?dateValue(row[mapping.x],mapping.dateFormat):number(row[mapping.x]),y:number(row[mapping.y?.[0]])};
    for(const a of ['x','y'])if((bounds[a+'Min']!==null||bounds[a+'Max']!==null)&&(vals[a]===null||(bounds[a+'Min']!==null&&vals[a]<bounds[a+'Min'])||(bounds[a+'Max']!==null&&vals[a]>bounds[a+'Max'])))return;
    indices.push(i);
  });
  return {...data,rows:indices.map(i=>data.rows[i]),recordIndices:indices.map(i=>i+1)};
}
export function automaticMarkerSize(count,width=800,height=500){
  return Math.max(1.2,Math.min(count<40?5:3.5,Math.sqrt(width*height/Math.max(count,1))*0.16));
}
export function validateProfessionalSettings(s){
  for(const [key,min,max]of [['pointSize',0.2,30],['fontSize',8,32],['lineWidth',0,10],['opacity',0.05,1],['xRotate',-90,90],['yRotate',-90,90]]){
    if(s[key]!==''&&s[key]!==undefined&&(!Number.isFinite(Number(s[key]))||Number(s[key])<min||Number(s[key])>max))throw new Error(`${key} 必须在 ${min}–${max} 之间`);
  }
}
export function professionalOption(base,data,s,model=null,figure={width:800,height:500}){
  if(!base.option?.series)return base;
  validateProfessionalSettings(s);
  const o=base.option,w=[...base.warnings],cartesian=['line','scatter','area','errorbar','bubble'].includes(s.type),dark=s.theme==='Dark';
  o.backgroundColor=dark?'#151c2c':s.background||'#ffffff';
  o.textStyle={...o.textStyle,fontFamily:s.fontFamily||'Arial, Microsoft YaHei, sans-serif',fontSize:s.fontSize};
  if(!cartesian){if(s.xLog||s.xTick||s.equalAspect||s.xUnit||s.yUnit)w.push('当前图类不应用专业数值X轴/物理等比例设置；请使用散点或折线图。');return {...base,option:o,warnings:w};}
  const label=(v)=>s.scientific?Number(v).toExponential(s.precision):s.precisionMode==='significant'?Number(v).toPrecision(Math.max(1,s.precision)):new Intl.NumberFormat('en',{maximumFractionDigits:s.precision,useGrouping:false}).format(v);
  const xa=Array.isArray(o.xAxis)?o.xAxis:[o.xAxis],ya=Array.isArray(o.yAxis)?o.yAxis:[o.yAxis];
  for(const [axes,axis]of [[xa,'x'],[ya,'y']])axes.forEach((a,i)=>{
    if(!a)return;
    const log=axis==='x'?s.xLog:s.log;
    if(log&&a.type==='time')throw new Error('日期轴不支持对数，请使用数值X字段');
    if(log&&a.type==='category')throw new Error('类别轴不支持对数，请选择数值字段');
    if(log){
      const fields=axis==='x'?[s.x]:s.dualY?[s.y[Math.min(i,1)]]:s.y;
      if(data.rows.some(r=>fields.some(f=>{const n=number(r[f]);return n!==null&&n<=0})))throw new Error(`${axis.toUpperCase()}对数轴要求全部有效观测严格大于0；未删除数据。`);
      a.type='log';a.logBase=10;delete a.interval;
      if(axis==='x'&&s.xMin==='')a.min=data.rows.reduce((m,r)=>number(r[s.x])===null?m:Math.min(m,number(r[s.x])),Infinity);
      if(a.min<=0)throw new Error('对数轴下限须大于0');
    }
    const minKey=axis+'Min',maxKey=axis+'Max';
    if(i===0&&a.type!=='time'&&a.type!=='category')for(const [k,p]of [[minKey,'min'],[maxKey,'max']])if(s[k]!==''&&s[k]!==undefined)a[p]=Number(s[k]);
    const step=axis==='x'?s.xTick:s.tick;
    if(step!==''&&step!==undefined){if(log)throw new Error('对数轴按10的幂刻度，请清空线性主刻度步长');if(a.type==='category'||a.type==='time')throw new Error('手动主刻度步长仅支持线性数值轴');if(!Number.isFinite(Number(step))||Number(step)<=0)throw new Error('主刻度步长必须大于0');if((a.max-a.min)/Number(step)>300)throw new Error('主刻度超过300个，请增大步长');a.interval=Number(step);}
    a.inverse=axis==='x'?!!s.xInverse:!!s.yInverse;
    a.axisLine={show:true,onZero:false,lineStyle:{color:dark?'#ced4e2':'#303844',width:1}};
    a.axisTick={show:true,inside:true,length:5,lineStyle:{color:dark?'#ced4e2':'#303844'}};
    a.minorTick={show:!!s.minorTicks,splitNumber:Number(s.minorSplit)||5,length:3};
    a.minorSplitLine={show:false};
    a.axisLabel={...a.axisLabel,color:dark?'#d5dceb':'#303844',fontSize:s.fontSize,rotate:axis==='x'?s.xRotate||0:s.yRotate||0,hideOverlap:true,...(!['category','time'].includes(a.type)?{formatter:label}:{})};
    a.nameTextStyle={fontFamily:o.textStyle.fontFamily,fontSize:s.fontSize+1,color:dark?'#d5dceb':'#303844'};
    a.nameLocation='middle';a.nameGap=axis==='x'?42:52;
    const unit=axis==='x'?s.xUnit:s.yUnit;if(unit&&i===0)a.name=`${axis==='x'?(s.axisX||s.x):(s.axisY||s.y.join(' / '))} (${unit})`;
    a.splitLine={show:!!s.grid,lineStyle:{color:dark?'#354052':'#e0e3e8',width:0.6,type:'dotted'}};
  });
  const modelIndex=model?o.series.length-1:-1;
  o.series.forEach((series,i)=>{
    if(i===modelIndex&&series.type==='line'&&series.name===`${model.kind} · ${model.id}`)return;
    if(series.type==='line'||series.type==='scatter'){
      if(s.type==='scatter'&&s.showLine)series.type='line';
      if(s.type==='scatter'&&!s.showLine)series.type='scatter';
      series.showSymbol=s.showMarkers!==false;
      if(s.type==='bubble'){}else series.symbolSize=s.showMarkers===false?0:s.pointSize===''||s.pointSize===undefined?automaticMarkerSize(data.rows.length,figure.width,figure.height):Number(s.pointSize);
      series.lineStyle={...series.lineStyle,width:s.showLine===false?0:Number(s.lineWidth),type:s.lineType||'solid'};
      series.itemStyle={...series.itemStyle,opacity:s.opacity??0.85};
      series.symbol=s.symbol||'circle';series.smooth=false;
    }
  });
  o.title={...o.title,left:'center',top:12,textStyle:{...o.title.textStyle,fontFamily:o.textStyle.fontFamily,fontSize:s.fontSize+3}};
  o.legend={...o.legend,type:'scroll',textStyle:{...o.legend?.textStyle,fontFamily:o.textStyle.fontFamily,fontSize:s.fontSize},itemWidth:20,itemHeight:3};
  if(s.type==='scatter'&&!s.showLine){o.legend.icon=s.symbol||'circle';o.legend.itemWidth=7;o.legend.itemHeight=7;}
  if(!Array.isArray(o.grid))o.grid={left:76,right:s.dualY?80:s.legendPosition==='right'?150:28,top:s.title||s.subtitle?90:60,bottom:s.legendPosition==='bottom'?100:76,containLabel:true};
  if(s.equalAspect){
    if(xa[0]?.type!=='value'||ya[0]?.type!=='value'||s.dualY)throw new Error('物理等比例仅适用于单Y线性数值轴');
    // Explicit pixel-sized plotting rectangle makes one X unit equal one Y unit.
    const xr=xa[0].max-xa[0].min,yr=ya[0].max-ya[0].min;
    let width=Math.max(30,figure.width-180),height=width*yr/xr,maxH=Math.max(30,figure.height-160);
    if(height>maxH){height=maxH;width=height*xr/yr;}
    o.grid={left:90,top:80,width,height,containLabel:false};
  }
  if(s.viewZoom&&o.dataZoom)o.dataZoom=o.dataZoom.map(z=>({...z,start:s.viewZoom.start,end:s.viewZoom.end}));
  w.push('缩放仅改变可见范围；绘图选区和拟合选区独立保存。');
  return {...base,option:o,warnings:[...new Set(w)]};
}
