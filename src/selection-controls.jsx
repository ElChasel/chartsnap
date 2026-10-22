import React,{useState} from 'react';
import {ALL_SELECTION,selectRecords} from './plot-spec.js';
export function SelectionPanel({data,settings,update,onError}){
  const [target,setTarget]=useState('plotSelection'),[draft,setDraft]=useState({...ALL_SELECTION,...settings.plotSelection}),[name,setName]=useState('我的选区');
  let count=0,error='';try{count=selectRecords(data,draft,settings).rows.length}catch(e){error=e.message}
  const choose=(k)=>{setTarget(k);setDraft({...ALL_SELECTION,...settings[k]});};
  return <section className="analysis-card selection-panel"><span className="section-label">SELECT · 数据选择</span><h3>每一个点，由你决定。</h3>
    <p>记录索引从1开始，表头不计入。空白行在导入时跳过，因此记录索引不等于Excel工作表行号。处理工作流改变记录后，选区恢复全部。</p>
    <div className="selection-target"><button className={target==='plotSelection'?'btn primary':'btn'} onClick={()=>choose('plotSelection')}>Plot Selection · 绘图选区</button><button className={target==='fitSelection'?'btn primary':'btn'} onClick={()=>choose('fitSelection')}>Fit Selection · 拟合选区</button></div>
    <div className="form-grid">{[['start','起始记录 Start'],['end','结束记录 End'],['stride','每N行取一点'],['xMin','选区X下限'],['xMax','选区X上限'],['yMin','选区Y下限'],['yMax','选区Y上限']].map(([k,l])=><label className="field" key={k}><span>{l}</span><input aria-label={l} type="number" step="any" placeholder={k==='end'?String(data.rows.length):'不限'} value={draft[k]} onChange={e=>setDraft(v=>({...v,[k]:e.target.value}))}/></label>)}</div>
    <label className="field"><span>多个不连续区间（取并集后与其他条件相交）</span><input aria-label="多个不连续区间" placeholder="1-20,100-150,300" value={draft.intervals} onChange={e=>setDraft(v=>({...v,intervals:e.target.value}))}/></label>
    <p>值范围包含边界；Y范围使用首个Y系列，日期X用Unix毫秒。步长以起始记录为锚点。所有筛选条件取交集。</p>
    <output aria-label="选择预览">Original: {data.rows.length} points · Selected: {count} points</output>{error&&<p role="alert">{error}</p>}
    <div className="button-row"><button className="btn primary" disabled={!!error} onClick={()=>{update(target,draft);}}>应用{target==='plotSelection'?'绘图':'拟合'}选区</button><button className="btn" onClick={()=>{setDraft({...ALL_SELECTION});update(target,{...ALL_SELECTION})}}>恢复全部数据</button></div>
    <p>图中矩形框选及表格勾选仅修改Plot Selection，不改变Fit Selection。缩放仅改变Axis Visible Range。</p>
    <div className="form-grid"><label className="field"><span>选区名称</span><input aria-label="选区名称" maxLength={40} value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn" disabled={!!error||!name.trim()} onClick={()=>{update('savedSelections',[...(settings.savedSelections||[]).filter(v=>v.name!==name),{name,selection:draft}].slice(-10));}}>保存当前选择</button></div>
    {(settings.savedSelections||[]).map(v=><button className="btn small" key={v.name} onClick={()=>{try{selectRecords(data,v.selection,settings);setDraft(v.selection);update(target,v.selection)}catch(e){onError(e.message)}}}>载入 {v.name}</button>)}
  </section>;
}
export function ProfessionalControls({settings:s,update}){
  const num=(key,label,min,max,step=1)=><label className="field" key={key}><span>{label}</span><input aria-label={label} type="number" min={min} max={max} step={step} value={s[key]??''} onChange={e=>update(key,e.target.value===''?'':Number(e.target.value))}/></label>;
  const toggle=(k,label)=><label className="checkbox-label" key={k}><input type="checkbox" checked={!!s[k]} onChange={e=>update(k,e.target.checked)}/>{label}</label>;
  return <section className="professional-controls"><span className="section-label">AXES & FIGURE</span>
    {num('xTick','X主刻度步长',0.000000001,undefined,'any')}
    <div className="form-grid">{num('xRotate','X刻度旋转',-90,90)}{num('yRotate','Y刻度旋转',-90,90)}</div>
    {toggle('xLog','X对数轴')}{toggle('minorTicks','显示次刻度')}{toggle('xInverse','X轴反向')}{toggle('yInverse','Y轴反向')}{toggle('equalAspect','X/Y物理等比例')}
    {toggle('showLine','显示连接线')}{toggle('showMarkers','显示数据标记')}
    <label className="field"><span>字体 Font</span><select aria-label="图表字体" value={s.fontFamily} onChange={e=>update('fontFamily',e.target.value)}>{['Inter Variable, Arial, Microsoft YaHei, sans-serif','Arial, Microsoft YaHei, sans-serif','Georgia, SimSun, serif','Times New Roman, SimSun, serif','Consolas, monospace'].map(v=><option key={v}>{v}</option>)}</select></label>
    <label className="field"><span>刻度精度口径</span><select aria-label="刻度精度口径" value={s.precisionMode} onChange={e=>update('precisionMode',e.target.value)}><option value="decimal">小数位数</option><option value="significant">有效数字（至少1）</option></select></label>
    {['xUnit','yUnit'].map((k,i)=><label className="field" key={k}><span>{i?'Y':'X'}单位（支持μ、°、⁻¹、₂）</span><input aria-label={i?'Y单位':'X单位'} value={s[k]} maxLength={50} onChange={e=>update(k,e.target.value)}/></label>)}
    <label className="field"><span>画布背景</span><input aria-label="画布背景" type="color" value={s.background} onChange={e=>update('background',e.target.value)}/></label>
    <small>主刻度步长仅用于线性数值轴；对数以10为底。物理等比例用于单Y线性数值图。公式文本支持Unicode数学符号；不解析LaTeX。</small>
  </section>;
}
