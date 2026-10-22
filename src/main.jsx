import React, { useEffect, useState, useRef, useMemo } from "react";
import DataWorker from './worker.js?worker';
import * as echarts from "echarts";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  Upload,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  Download,
  Check,
  FileSpreadsheet,
  SlidersHorizontal,
  PanelLeftClose,
  PanelRightClose,
  Sparkles,
  LineChart,
  BarChart3,
  ScatterChart,
  AreaChart,
  ChartNoAxesColumn,
  ChartCandlestick,
  RotateCcw,
  X,
  Command,
  Table2,
  FlaskConical,
  Search,
  CheckCircle2,
  Info,
  LoaderCircle,
} from "lucide-react";
import {
  recommend,
  pairs,
  summary,
  number,
  FORMULA_REGISTRY,
  MODEL_REGISTRY,
  validatePlan,
} from "./engine.js";
import { chartOption, formatNumber, palettes } from "./chart.js";
import "@fontsource-variable/inter";
import "./style.css";
import {ALL_SELECTION,PROFESSIONAL_DEFAULTS,selectRecords} from './plot-spec.js';
import {sitePath} from './runtime.js';
import {SelectionPanel,ProfessionalControls} from './selection-controls.jsx';
import {withPngDensity,exportDimensions} from './png-density.js';
import './professional.css';
import {
  BrandMark,
  StudioWordmark,
  ConsentBanner,
  BrandInfo,
  AILauncher,
  AnonymousSurvey,
} from "./brand.jsx";
import {
  WorkflowPanel,
  ProMappings,
  ProStyle,
  AskBar,
} from "./pro-controls.jsx";
import {
  track,
  rowBucket,
  durationBucket,
  setConsent,
  consentState,
} from "./telemetry.js";
import "./v4.css";
import './workspace-layout.css';
const defaults = {
  type: "line",
  x: "",
  y: [],
  theme: "Modern",
  title: "",
  legend: true,
  grid: true,
  log: false,
  scientific: false,
  precision: 2,
  xMin: "",
  xMax: "",
  yMin: "",
  yMax: "",
  tick: "",
  axisX: "",
  axisY: "",
  lineWidth: 2,
  fontSize: 12,
  color: "",
  dateFormat: "auto",
  subtitle: "",
  lineType: "solid",
  pointSize: 6,
  symbol: "circle",
  opacity: 0.85,
  legendPosition: "top",
  dualY: false,
  showModel: true,
  z: "",
  categoryY: "",
  errorColumn: "",
  ...PROFESSIONAL_DEFAULTS,
};
const TYPES = [
  ["line", "折线图", LineChart],
  ["scatter", "散点图", ScatterChart],
  ["bar", "柱状图", BarChart3],
  ["area", "面积图", AreaChart],
  ["histogram", "直方图", ChartNoAxesColumn],
  ["box", "箱线图", ChartCandlestick],
  ["hbar", "横向柱状图", BarChart3],
  ["heatmap", "热力图", Table2],
  ["pie", "饼图", Activity],
  ["donut", "环形图", Activity],
  ["bubble", "气泡图", ScatterChart],
  ["multi", "多图布局", Table2],
  ["correlation", "相关矩阵", Table2],
  ["errorbar", "误差棒", ChartCandlestick],
];
const STATIC_BUILD = import.meta.env.VITE_STATIC_BUILD === "true";
const API = STATIC_BUILD ? "" : import.meta.env.VITE_API_URL || "/api";
const fmt = (v) =>
  v === null || v === undefined ? "—" : formatNumber(v, false, 3);
function Logo() {
  return (
    <span className="logo">
      <BrandMark />
      ChartSnap<span className="version">6.0</span>
    </span>
  );
}
function download(url, name) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}
function App() {
  const [studio, setStudio] = useState(location.hash === "#studio"),
    [data, setData] = useState(null),
    [fileName, setFileName] = useState(""),
    [settings, setSettings] = useState(defaults),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [active, setActive] = useState("chart"),
    [advanced, setAdvanced] = useState(false),
    [left, setLeft] = useState(true),
    [right, setRight] = useState(true),
    [modal, setModal] = useState(null),
    [audit, setAudit] = useState([]),
    [model, setModel] = useState(null),
    [comparison, setComparison] = useState(null),
    [windowSize, setWindowSize] = useState(5),
    [formula, setFormula] = useState("difference"),
    [formulaCol, setFormulaCol] = useState(""),
    [fitId, setFitId] = useState("linear"),
    [encoding, setEncoding] = useState("utf-8"),
    [delimiter, setDelimiter] = useState(""),
    [dateFormat, setDateFormat] = useState("auto"),
    [prompt, setPrompt] = useState(""),
    [ai, setAi] = useState(false),
    [plan, setPlan] = useState(null),
    [scroll, setScroll] = useState(0),
    [exportScale, setExportScale] = useState(2),
    [exportMode,setExportMode]=useState('pixels'),
    [dpi,setDpi]=useState(300),
    [widthMM,setWidthMM]=useState(85),
    [heightMM,setHeightMM]=useState(60),
    [figureSize,setFigureSize]=useState({width:800,height:500}),
    [transparent, setTransparent] = useState(false),
    [exportWidth, setExportWidth] = useState(1440),
    [exportHeight, setExportHeight] = useState(900),
    [finance, setFinance] = useState(false),
    [frequency, setFrequency] = useState("daily"),
    [priceBasis, setPriceBasis] = useState("adjusted"),
    [years, setYears] = useState(""),
    [periods, setPeriods] = useState(""),
    [about, setAbout] = useState(false);
  const settingsHistory=useRef({past:[],future:[]}),selectionContext=useRef(null);
  const fileInput = useRef(),
    worker = useRef(),
    pending = useRef(new Map()),
    seq = useRef(0),
    chartRef = useRef(),
    chart = useRef(),
    fileCache = useRef(null),
    workerReady = useRef(false);
  const loadStart = useRef(0),
    dataRev = useRef(0),
    drawn = useRef(""),
    axisTimer = useRef(),
    studioWas = useRef(studio);
  useEffect(() => {
    if (studio && !studioWas.current) track("studio_opened");
    studioWas.current = studio;
  }, [studio]);
  const update = (k, v) => {
    if (k === "type" && v !== settings.type)
      track("chart_type_changed", { chart_type: v });
    if (
      [
        "x",
        "y",
        "log",
        "xMin",
        "xMax",
        "yMin",
        "yMax",
        "tick",
        "scientific",
        "axisX",
        "axisY",
      ].includes(k)
    ) {
      clearTimeout(axisTimer.current);
      axisTimer.current = setTimeout(() => track("axis_adjusted"), 450);
    }
    setSettings((s) => {settingsHistory.current.past.push(s);if(settingsHistory.current.past.length>25)settingsHistory.current.past.shift();settingsHistory.current.future=[];return {...s,[k]:v,...(k==="type"?{showLine:v!=="scatter"}:{})};});
    if(k==='fitSelection')setModel(null);
    if (["x", "y", "type", "dateFormat"].includes(k)) {
      setModel(null);
      setComparison(null);
    }
  };
  function undoStyle(redo=false){const h=settingsHistory.current,from=redo?h.future:h.past,to=redo?h.past:h.future;if(!from.length)return;to.push(settings);const next=from.pop();setSettings(next);if(['fitSelection','x','y','type','dateFormat'].some(k=>JSON.stringify(next[k])!==JSON.stringify(settings[k])))setModel(null);}
  function createWorker() {
    worker.current = new DataWorker();
    worker.current.onmessage = ({ data: m }) => {
      if (m.progress) {
        setBusy(m.progress);
        return;
      }
      const p = pending.current.get(m.id);
      if (!p) return;
      pending.current.delete(m.id);
      if (m.error) p.reject(new Error(m.error));
      else p.resolve(m.result);
    };
    worker.current.onerror = () => {
      for (const p of pending.current.values())
        p.reject(new Error("数据工作线程失败，请重新上传。"));
      pending.current.clear();
      setBusy("");
    };
  }
  useEffect(() => {
    createWorker();
    const onhash = () => setStudio(location.hash === "#studio");
    window.addEventListener("hashchange", onhash);
    if (API)
      fetch(`${API}/health`, { signal: AbortSignal.timeout(6000) })
        .then((r) => r.json())
        .then((r) => setAi(r.ai_configured === true))
        .catch(() => {});
    return () => {
      worker.current.terminate();
      window.removeEventListener("hashchange", onhash);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const run = (type, args = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq.current;
      pending.current.set(id, { resolve, reject });
      worker.current.postMessage({ type, id, ...args });
    });
  const task = async (label, fn) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
      const category =
        label.includes("文件") || label.includes("解析")
          ? "parse"
          : label.includes("导出")
            ? "export"
            : label.includes("分析计划")
              ? "network"
              : "compute";
      track("processing_error", { error_category: category });
      if (label === "正在读取文件…")
        track("file_upload_failed", { error_category: "parse" });
      if (label === "生成结构化分析计划…")
        track("ai_analysis_failed", { error_category: "network" });
    } finally {
      setBusy("");
    }
  };
  function cancel() {
    worker.current.terminate();
    for (const p of pending.current.values())
      p.reject(new Error("处理已取消；请重新上传文件以继续。"));
    pending.current.clear();
    createWorker();
    setData(null);
    setModel(null);
    setBusy("");
    workerReady.current = false;
  }
  const record = (text) =>
    setAudit((a) => [...a, { time: new Date().toISOString(), text }]);
  function accept(result, { auto = false } = {}) {
    settingsHistory.current={past:[],future:[]};
    setData(result);
    dataRev.current++;
    setSettings((v) => {
      const validY = v.y.filter((y) => result.headers.includes(y));
      return !auto && (!result.headers.includes(v.x) || !validY.length)
        ? { ...v, ...recommend(result.columns) }
        : { ...v, y: validY,plotSelection:{...ALL_SELECTION},fitSelection:{...ALL_SELECTION},viewZoom:null };
    });
    setModel(null);
    setComparison(null);
    setScroll(0);
    if (auto) {
      const rec = recommend(result.columns);
      setSettings({
        ...defaults,
        ...rec,
        showLine:rec.type!=="scatter",
        title: rec.y[0]
          ? `${rec.y[0]} · ${rec.type === "scatter" ? "变量关系" : "数据概览"}`
          : "数据概览",
        dateFormat,
      });
      setFormulaCol(rec.y[0] || "");
      setNotice(rec.reason);
    }
    workerReady.current = true;
  }
  async function upload(file) {
    if (!file) return;
    loadStart.current = performance.now();
    track("file_upload_started", {
      file_type: file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv",
    });
    if (file.size > 40 * 1024 * 1024) {
      setError("文件超过 40 MB，请拆分后重试。");
      track("file_upload_failed", { error_category: "validation" });
      return;
    }
    location.hash = "studio";
    setStudio(true);
    await task("正在读取文件…", async () => {
      const buffer = await file.arrayBuffer();
      fileCache.current = { buffer, name: file.name };
      const result = await run("parse", {
        buffer,
        name: file.name,
        options: { encoding, delimiter },
        dateFormat,
      });
      accept(result, { auto: true });
      const elapsed = performance.now() - loadStart.current;
      track(
        "file_upload_succeeded",
        {
          file_type: file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv",
          row_bucket: rowBucket(result.rows.length),
          duration_bucket: durationBucket(elapsed),
        },
        elapsed,
      );
      setFileName(file.name);
      setAudit([
        {
          time: new Date().toISOString(),
          text: `导入 ${file.name}；${result.rows.length} 行；本地解析，未上传。`,
        },
      ]);
    });
  }
  async function demo() {
    const csv =
      "日期,营收,目标,订单\n" +
      Array.from({ length: 48 }, (_, i) => {
        const d = new Date(Date.UTC(2025, 0, i * 7 + 1))
            .toISOString()
            .slice(0, 10),
          v = Math.round(
            46000 +
              i * 1100 +
              Math.sin(i * 0.65) * 7000 +
              Math.cos(i * 0.21) * 4000,
          );
        return `${d},${v},${48000 + i * 1000},${Math.round(v / 320)}`;
      }).join("\n");
    await upload(new File([csv], "Revenue overview.csv", { type: "text/csv" }));
    setSettings((s) => ({
      ...s,
      y: ["营收", "目标"],
      title: "营收增长趋势",
      axisY: "营收 / CNY",
    }));
  }
  const rec = useMemo(() => (data ? recommend(data.columns) : null), [data]);
  const nums =
    data?.columns.filter((c) =>
      ["number", "percent", "currency"].includes(c.type),
    ) || [];
  const plotDataResult=useMemo(()=>{if(!data)return {};try{return {data:selectRecords(data,settings.plotSelection,settings)}}catch(e){return {error:e.message}}},[data,settings.plotSelection,settings.x,settings.y,settings.dateFormat]);
  const plotData=plotDataResult.data;
  selectionContext.current={data,plotData,settings};
  const selectedStats = useMemo(
    () =>
      plotData ? summary(plotData.rows.map((r) => number(r[settings.y[0]]))) : null,
    [plotData, settings.y],
  );
  const result = useMemo(() => {
    if (!data) return null;
    try {
      if(plotDataResult.error)throw new Error(plotDataResult.error);
      if(!plotData?.rows.length)throw new Error('当前绘图选区没有记录，请修改条件或恢复全部。');
      return chartOption(plotData, settings, model,figureSize);
    } catch (e) {
      return { error: e.message };
    }
  }, [data,plotDataResult, settings, model,figureSize]);
  useEffect(() => {
    if (!studio || !data || active !== "chart" || !chartRef.current) return;
    chart.current = echarts.init(chartRef.current, null, { renderer: "svg" });
    chart.current.on("datazoom", () => {
      const z = chart.current?.getOption().dataZoom?.[0];
      if(z)setSettings(s=>s.viewZoom?.start===z.start&&s.viewZoom?.end===z.end?s:{...s,viewZoom:{start:z.start,end:z.end}});
      if (z && chartRef.current) {
        chartRef.current.dataset.zoomStart = String(z.start);
        chartRef.current.dataset.zoomEnd = String(z.end);
        chartRef.current.setAttribute(
          "aria-label",
          `交互图表，显示范围 ${Math.round(z.start)}% 至 ${Math.round(z.end)}%`,
        );
      }
    });
    chart.current.on('brushEnd',event=>{
      const area=event.areas?.[0];if(!area||area.brushType!=='rect')return;
      const ctx=selectionContext.current;if(!ctx?.plotData)return;
      let r=area.coordRange;
      if(!r&&area.range){const a=chart.current.convertFromPixel({gridIndex:0},[area.range[0][0],area.range[1][0]]),b=chart.current.convertFromPixel({gridIndex:0},[area.range[0][1],area.range[1][1]]);r=[[Math.min(a[0],b[0]),Math.max(a[0],b[0])],[Math.min(a[1],b[1]),Math.max(a[1],b[1])]];}
      if(!r)return;
      const records=ctx.plotData.rows.flatMap((row,i)=>{const p=pairs([row],ctx.settings.x,ctx.settings.y[0],ctx.data.columns,ctx.settings.dateFormat)[0];return p&&p[0]>=r[0][0]&&p[0]<=r[0][1]&&p[1]>=r[1][0]&&p[1]<=r[1][1]?[ctx.plotData.recordIndices[i]]:[];});
      update('plotSelection',{...ALL_SELECTION,records});setNotice(`框选${records.length}条记录；拟合选区未改变。`);
    });
    const observer = new ResizeObserver(() => {chart.current?.resize();if(chartRef.current){const {clientWidth:width,clientHeight:height}=chartRef.current;setFigureSize(v=>v.width===width&&v.height===height?v:{width,height});}});
    observer.observe(chartRef.current);
    return () => {
      observer.disconnect();
      chart.current?.dispose();
      chart.current = null;
    };
  }, [studio, !!data, active, result?.error]);
  useEffect(() => {
    if (!chart.current || !result?.option) return;
    const t = setTimeout(() => {
      const start = performance.now();
      chart.current?.setOption(result.option, { notMerge: true });
      const key = JSON.stringify([
        dataRev.current,
        settings.type,
        settings.x,
        settings.y,
        settings.z,
        settings.categoryY,
        settings.errorColumn,
        model?.id,
      ]);
      if (drawn.current !== key) {
        const elapsed = loadStart.current
          ? performance.now() - loadStart.current
          : performance.now() - start;
        track(
          "chart_generated",
          {
            chart_type: settings.type,
            row_bucket: rowBucket(data.rows.length),
            duration_bucket: durationBucket(elapsed),
          },
          elapsed,
        );
        drawn.current = key;
        loadStart.current = 0;
      }
    }, 70);
    return () => clearTimeout(t);
  }, [result, studio, active, !!data]);
  async function cleanPreview(action) {
    await task("计算清洗影响…", async () => {
      const preview = await run("cleanPreview", { action });
      setModal({ kind: "clean", action, ...preview });
    });
  }
  async function applyClean() {
    await task("应用到派生数据…", async () => {
      const r = await run("clean", { action: modal.action, dateFormat });
      accept(r);
      record(
        `清洗 ${modal.action}：${modal.before} → ${r.rows.length} 行，原始文件保留。`,
      );
      setModal(null);
      setNotice("已应用清洗，可恢复原始数据。");
    });
  }
  async function applyFormula() {
    if (!formulaCol) return;
    await task("计算派生字段…", async () => {
      if (
        formula === "logReturn" &&
        (!finance ||
          data.rows.some(
            (r) => number(r[formulaCol]) !== null && number(r[formulaCol]) <= 0,
          ))
      )
        throw new Error("请确认价格口径与频率，且价格必须为正。");
      const r = await run("formula", {
        column: formulaCol,
        formula,
        params: {
          window: windowSize,
          confirmed: finance,
          years,
          periods,
          frequency,
          priceBasis,
        },
        dateFormat,
      });
      accept(r);
      track("formula_applied", { formula_id: formula });
      const name = r.headers.at(-1);
      update("y", [name]);
      record(
        `公式 ${formula}(${formulaCol})，窗口 ${windowSize}${formula === "logReturn" ? `；${priceBasis}，${frequency}` : ""}；${FORMULA_REGISTRY[formula].definition}`,
      );
      setNotice("派生列已创建，原始字段保留。");
    });
  }
  const currentPairs = () => {
    if (
      !data ||
      (!nums.some((c) => c.name === settings.x) &&
        data.columns.find((c) => c.name === settings.x)?.type !== "date")
    )
      throw new Error("拟合需要数值或日期 X 轴。");
    return pairs(
      selectRecords(data,settings.fitSelection,settings).rows,
      settings.x,
      settings.y[0],
      data.columns,
      dateFormat,
    );
  };
  async function fitModel(id = fitId) {
    await task("使用完整有效数据计算模型…", async () => {
      if (!["line", "scatter", "area"].includes(settings.type))
        throw new Error("请先切换至散点、折线或面积图查看拟合。");
      const started = performance.now(),
        p = currentPairs(),
        m = await run("fit", { pairs: p, model: id, window: windowSize });
      setModel({...m,window:windowSize,sampleCount:p.length,fitRange:[p.reduce((m,v)=>Math.min(m,v[0]),Infinity),p.reduce((m,v)=>Math.max(m,v[0]),-Infinity)],selection:settings.fitSelection});
      track("fit_completed", { model_id: id }, performance.now() - started);
      record(
        `${m.kind} / ${id}：${p.length} 个有效点；${m.formula}；RMSE ${m.rmse ?? "不适用"}`,
      );
      setActive("chart");
    });
  }
  async function compare() {
    await task("运行五折连续区块交叉验证…", async () => {
      const p = currentPairs();
      setComparison(await run("compare", { pairs: p }));
    });
  }
  async function exportChart(type) {
    if (!plotData || result?.error) return;
    await task("正在生成导出文件…", async () => {
      await document.fonts.ready;
      const d=exportDimensions({mode:exportMode,width:exportWidth,height:exportHeight,scale:exportScale,widthMM,heightMM,dpi});
      const el=document.createElement('div');el.style.cssText=`position:fixed;left:-20000px;width:${d.width}px;height:${d.height}px`;document.body.append(el);
      let instance;
      try{
        instance=echarts.init(el,null,{renderer:type==='svg'?'svg':'canvas',width:d.width,height:d.height});
        const spec=chartOption(plotData,settings,model,{width:d.width,height:d.height});
        if(spec.error)throw new Error(spec.error);
        const option={...spec.option,animation:false,backgroundColor:transparent?'transparent':settings.theme==='Dark'?'#151c2c':settings.background,toolbox:{show:false},brush:undefined,dataZoom:spec.option.dataZoom?.filter(z=>z.type==='inside')};
        instance.setOption(option);
        let blob;
        if(type==='png'){
          const url=instance.getDataURL({type:'png',pixelRatio:d.ratio,backgroundColor:option.backgroundColor});
          const bytes=Uint8Array.from(atob(url.slice(url.indexOf(',')+1)),ch=>ch.charCodeAt(0));blob=new Blob([withPngDensity(bytes,dpi)],{type:'image/png'});
        }else{
          let svg=instance.renderToSVGString();
          if(exportMode==='physical')svg=svg.replace(/(<svg[^>]*?)width="[^"]*"/,'$1width="'+widthMM+'mm"').replace(/(<svg[^>]*?)height="[^"]*"/,'$1height="'+heightMM+'mm"');
          blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
        }
        const url=URL.createObjectURL(blob);download(url,`ChartSnap-${Date.now()}.${type}`);setTimeout(()=>URL.revokeObjectURL(url),3000);
        setNotice(`${type.toUpperCase()} 已导出 · ${dpi} DPI`);track(type==='png'?'export_png':'export_svg',{chart_type:settings.type});
      }finally{instance?.dispose();el.remove();}
    });
  }
  async function requestAI() {
    if (!ai) return;
    setModal({ kind: "aiConsent" });
  }
  async function confirmedAI() {
    setModal(null);
    track("ai_analysis_requested");
    await task("生成结构化分析计划…", async () => {
      const r = await fetch(`${API}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, columns: data.columns, consent: true }),
        signal: AbortSignal.timeout(25000),
      });
      const body = await r.json();
      if (!r.ok)
        throw new Error(
          typeof body.detail === "string" ? body.detail : "AI 服务暂时不可用",
        );
      setPlan(validatePlan(body, data.headers));
      track("ai_analysis_succeeded");
    });
  }
  async function usePlan() {
    if (!plan) return;
    await task("执行已确认的分析计划…", async () => {
      if (plan.questions?.length)
        throw new Error("请先明确这些条件：" + plan.questions.join("；"));
      if (plan.model && !["line", "scatter", "area"].includes(plan.chart))
        throw new Error("模型曲线需要折线、散点或面积图。");
      let working = data,
        chosenY = plan.y;
      if (plan.formula) {
        const started = performance.now();
        working = await run("formula", {
          column: plan.y[0],
          formula: plan.formula,
          params: {
            window: windowSize,
            confirmed: finance,
            years,
            periods,
            frequency,
            priceBasis,
          },
          dateFormat,
        });
        accept(working);
        chosenY = [working.headers.at(-1)];
        track(
          "formula_applied",
          { formula_id: plan.formula },
          performance.now() - started,
        );
        record("AI 已确认方案实际执行公式 " + plan.formula);
      }
      setSettings((s) => ({ ...s, type: plan.chart, x: plan.x, y: chosenY }));
      if (plan.model) {
        const started = performance.now(),
          pp = pairs(
            working.rows,
            plan.x,
            chosenY[0],
            working.columns,
            dateFormat,
          ),
          m = await run("fit", {
            pairs: pp,
            model: plan.model,
            window: windowSize,
          });
        setModel(m);
        track(
          "fit_completed",
          { model_id: plan.model },
          performance.now() - started,
        );
        record("AI 已确认方案实际执行模型 " + plan.model + "；" + m.formula);
      }
      record("确认 AI 建议：" + plan.explanation);
      setActive("chart");
      setPlan(null);
      setNotice("注册公式/模型已由本地确定性引擎执行，结果与建议分开展示。");
    });
  }
  async function workflowPreview(operation, params) {
    await task("预览数据处理…", async () =>
      setModal({
        kind: "transform",
        operation,
        params,
        ...(await run("transformPreview", { operation, params:{...params,dateFormat} })),
      }),
    );
  }
  async function applyTransform() {
    await task("应用数据处理…", async () => {
      const started = performance.now(),
        r = await run("transform", {
          operation: modal.operation,
          params: { ...modal.params, dateFormat },
          dateFormat,
        });
      accept(r);
      record(
        "数据处理 " +
          modal.operation +
          "；参数 " +
          JSON.stringify(modal.params) +
          "；" +
          modal.before +
          " → " +
          r.rows.length +
          " 行",
      );
      setModal(null);
      setNotice("已应用处理，可撤销或重做。");
    });
  }
  async function history(action) {
    await task("恢复处理步骤…", async () => {
      accept(await run(action, { dateFormat }));
      record(action === "undo" ? "撤销最近数据处理" : "重做数据处理");
    });
  }
  async function exportData(type, source="processed") {
    if (!data) return;
    await task("导出派生数据…", async () => {
      const exportSet=source==="selected"?plotData:data;
      if(!exportSet)throw new Error("没有可导出的数据");
      let bytes, mime;
      if (type === "csv") {
        const Papa = await import("papaparse");
        const safe = exportSet.rows.map((r) =>
          Object.fromEntries(
            exportSet.headers.map((h) => {
              const v = r[h];
              return [
                h,
                typeof v === "string" &&
                number(v) === null &&
                /^[=+@\-\t\r]/.test(v)
                  ? "'" + v
                  : v instanceof Date
                    ? v.toISOString()
                    : v,
              ];
            }),
          ),
        );
        bytes =
          "\uFEFF" + Papa.default.unparse(safe, { columns: exportSet.headers });
        mime = "text/csv;charset=utf-8";
      } else {
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          wb,
          XLSX.utils.json_to_sheet(exportSet.rows.map(r=>Object.fromEntries(exportSet.columns.map(c=>[c.name,['number','percent'].includes(c.type)&&number(r[c.name])!==null?number(r[c.name]):r[c.name]]))), { header: exportSet.headers }),
          "Derived Data",
        );
        bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        mime =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      download(url, "ChartSnap-"+source+"." + type);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        type === "csv"
          ? "派生 CSV 已导出；潜在公式文本前缀已转义。"
          : "派生 XLSX 已导出，文本不作为公式执行。",
      );
    });
  }
  async function readConfig(file) {
    if (!file || !data) return;
    await task("读取可复现分析配置…", async () => {
      if (file.size > 500000) throw new Error("分析配置超过500KB");
      const config = JSON.parse(await file.text());
      if (
        !Array.isArray(config.steps) ||
        config.steps.length > 50 ||
        !config.settings ||
        !TYPES.some((t) => t[0] === config.settings.type) ||
        !Object.hasOwn(palettes, config.settings.theme)
      )
        throw new Error("配置格式或图表/主题无效");
      const fingerprint = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", fileCache.current.buffer),
        ),
      )
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      if (
        config.fingerprint !== fingerprint ||
        config.currentSheet !== data.currentSheet
      )
        throw new Error(
          "原始文件指纹或工作表不同，请先导入相同原文件并选择对应工作表",
        );
      setModal({ kind: "config", config });
    });
  }
  async function applyConfig() {
    await task("重放已确认分析步骤…", async () => {
      const config = modal.config;
      const r = await run("replay", {
        steps: config.steps,
        settings:config.settings,
        overrides:Object.fromEntries((config.columns||[]).map(c=>[c.name,c.type])),
        currentSheet: config.currentSheet,
        dateFormat: config.settings.dateFormat,
      });
      if (
        !r.headers.includes(config.settings.x) ||
        !config.settings.y.every((y) => r.headers.includes(y))
      )
        throw new Error("重放后的字段与图表不匹配");
      accept(r);
      setSettings({ ...defaults, ...config.settings });
      if(config.exportSettings){const e=config.exportSettings;setExportMode(e.mode==='physical'?'physical':'pixels');setDpi(e.dpi===600?600:300);setWidthMM(Number(e.widthMM)||85);setHeightMM(Number(e.heightMM)||60);setExportWidth(Number(e.width)||1440);setExportHeight(Number(e.height)||900);setExportScale([1,2,3].includes(e.scale)?e.scale:2);setTransparent(e.transparent===true);}
      record("从原始文件重放 " + config.steps.length + " 个处理步骤，指纹匹配");
      setModal(null);
      if (config.model?.id && Object.hasOwn(MODEL_REGISTRY, config.model.id)) {
        const pp = pairs(
          selectRecords(r,config.settings.fitSelection,config.settings).rows,
          config.settings.x,
          config.settings.y[0],
          r.columns,
          config.settings.dateFormat,
        );
        const restored=await run("fit", {
            pairs: pp,
            model: config.model.id,
            window: config.model.window || windowSize,
          });
        setModel({...restored,sampleCount:pp.length,selection:config.settings.fitSelection,fitRange:[pp.reduce((m,p)=>Math.min(m,p[0]),Infinity),pp.reduce((m,p)=>Math.max(m,p[0]),-Infinity)]});
      }
      setActive("chart");
    });
  }
  async function exportTrace() {
    const fingerprint = fileCache.current
      ? Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", fileCache.current.buffer),
          ),
        )
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")
      : null;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            product: "ChartSnap 6.0 · 611 Studio",
            fingerprint,
            steps: data.steps || [],
            currentSheet: data.currentSheet || 0,
            file: fileName,
            rows: data.rows.length,
            columns: data.columns,
            settings,
            exportSettings:{mode:exportMode,width:exportWidth,height:exportHeight,scale:exportScale,widthMM,heightMM,dpi,transparent},
            model: model
              ? { ...model, curve: undefined, residuals: undefined }
              : null,
            audit,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    download(url, "ChartSnap-analysis.json");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <ConsentBanner />
      {about && <BrandInfo onClose={() => setAbout(false)} />}
      <input
        type="file"
        accept=".json"
        aria-label="导入分析配置文件"
        hidden
        onChange={(e) => {
          readConfig(e.target.files[0]);
          e.target.value = "";
        }}
        id="analysis-config-file"
      />
      <input
        ref={fileInput}
        aria-label="上传数据文件"
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => {
          upload(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {!studio ? (
        <div className="landing">
          <nav>
            <Logo />
            <div className="nav-links">
              <a href="#features">Features</a>
              <button onClick={demo}>Examples</button>
              <button onClick={() => setAbout(true)}>611 Studio</button>
            </div>
            <button
              className="btn dark"
              onClick={() => {
                location.hash = "studio";
                setStudio(true);
              }}
            >
              Launch Studio <ArrowUpRight size={15} />
            </button>
          </nav>
          <main className="hero">
            <div className="eyebrow">
              <span /> THE CLARITY YOUR DATA DESERVES
            </div>
            <h1>
              Your Data.
              <br />
              <span>Beautifully Understood.</span>
            </h1>
            <p>
              Upload your spreadsheet, select precise data,
              <br className="desktop" /> and customize professional scientific charts.
            </p>
            <div className="hero-actions">
              <button
                className="btn primary large"
                onClick={() => fileInput.current.click()}
              >
                <Upload size={17} /> Upload &amp; Visualize{" "}
                <ArrowRight size={16} />
              </button>
              <button
                className="btn ai-launch large"
                onClick={() => {
                  location.hash = "studio";
                  setStudio(true);
                }}
              >
                <SlidersHorizontal size={17} /> Customize Your Plot
              </button>
              <button className="btn large" onClick={demo}>
                Try Demo <ArrowUpRight size={16} />
              </button>
            </div>
            <p className="local-promise">Professional plotting for everyone · 无需注册 · 本地计算 · 零 AI API 调用</p>
            <div className="trust">
              <ShieldCheck size={14} /> 本地解析，数据由你掌控 <i /> Excel & CSV{" "}
              <i /> 无需注册
            </div>
            <div
              className="hero-preview"
              onClick={demo}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && demo()}
              aria-label="打开演示工作台"
            >
              <div className="preview-top">
                <div className="dots">
                  <b />
                  <b />
                  <b />
                </div>
                <span>ChartSnap Studio</span>
                <span className="pill">
                  <span /> Your files stay on your device
                </span>
              </div>
              <div className="preview-content">
                <aside>
                  <span className="section-label">WORKSPACE</span>
                  <div className="mini-file">
                    <FileSpreadsheet size={15} /> Revenue overview.csv
                  </div>
                  <span className="section-label">YOUR FIELDS</span>
                  {["日期", "营收", "目标", "订单"].map((n, i) => (
                    <div className="mini-row" key={n}>
                      <span>{i ? "#" : "◷"}</span>
                      {n}
                    </div>
                  ))}
                  <div className="mini-note">
                    <Sparkles size={16} /> 从一张表格
                    <br />
                    到一个好故事。
                  </div>
                </aside>
                <div className="mini-chart">
                  <div className="mini-heading">
                    <div>
                      <span className="section-label">BUSINESS OVERVIEW</span>
                      <h3>Revenue, moving forward.</h3>
                    </div>
                    <span className="growth">+84.6% ↗</span>
                  </div>
                  <svg viewBox="0 0 780 230" aria-hidden="true">
                    <defs>
                      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#6664e8"
                          stopOpacity=".13"
                        />
                        <stop
                          offset="100%"
                          stopColor="#6664e8"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    {[30, 80, 130, 180].map((y) => (
                      <line
                        key={y}
                        x1="30"
                        x2="760"
                        y1={y}
                        y2={y}
                        stroke="#eceef5"
                        strokeDasharray="4 5"
                      />
                    ))}
                    <path
                      d="M30 185 L70 170 L110 180 L150 130 L190 145 L230 120 L270 140 L310 105 L350 115 L390 75 L430 90 L470 65 L510 88 L550 48 L590 65 L630 35 L670 45 L710 20 L750 30 L750 220 L30 220Z"
                      fill="url(#fill)"
                    />
                    <path
                      d="M30 185 L70 170 L110 180 L150 130 L190 145 L230 120 L270 140 L310 105 L350 115 L390 75 L430 90 L470 65 L510 88 L550 48 L590 65 L630 35 L670 45 L710 20 L750 30"
                      fill="none"
                      stroke="#6265df"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M30 200 L750 50"
                      fill="none"
                      stroke="#b9becb"
                      strokeWidth="1.5"
                      strokeDasharray="6 5"
                    />
                  </svg>
                  <div className="mini-axis">
                    <span>JAN 2025</span>
                    <span>APR</span>
                    <span>JUL</span>
                    <span>OCT</span>
                    <span>DEC 2025</span>
                  </div>
                  <div className="mini-bottom">
                    <span>
                      <i /> Revenue
                    </span>
                    <span>
                      <i /> Target
                    </span>
                    <span>Illustrative preview · 点击体验真实绘图</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <section id="features" className="features">
            <div>
              <span className="section-label">
                LESS FRICTION. MORE INSIGHT.
              </span>
              <h2>让数据说清楚。</h2>
            </div>
            {[
              [
                FileSpreadsheet,
                "从表格开始",
                "支持 Excel 多工作表与 CSV，自动识别字段与数据质量。",
              ],
              [
                FlaskConical,
                "每一步，有据可查",
                "独立公式和模型引擎，展示适用条件、计算指标与处理记录。",
              ],
              [
                Download,
                "为分享而生",
                "交互探索，实时调整。导出高清 PNG 与可编辑 SVG。",
              ],
            ].map(([I, h, p]) => (
              <article key={h}>
                <I size={21} />
                <h3>{h}</h3>
                <p>{p}</p>
              </article>
            ))}
          </section>
          <footer>
            <Logo />
            <span>Fast. Accurate. Beautiful. Intelligent.</span>
            <button onClick={() => setAbout(true)}>
              Made by <StudioWordmark />
            </button>
            <button onClick={() => setConsent("unset")}>隐私设置</button>
            <a href={sitePath('/privacy')}>隐私政策</a>
            <span>© 2026 611 Studio. ChartSnap.</span>
          </footer>
        </div>
      ) : (
        <div
          className={`studio ${!left ? "left-closed" : ""} ${!right ? "right-closed" : ""}`}
        >
          <header className="studio-header">
            <a href="#" aria-label="返回首页">
              <Logo />
            </a>
            <div className="breadcrumb">
              <span>/</span>
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>{fileName || "Untitled analysis"}</strong>
            </div>
            <div className="header-right">
              <span className="local-badge">
                <ShieldCheck size={13} /> Local & private
              </span>
              <button
                className="btn small"
                onClick={() => fileInput.current.click()}
              >
                <Plus size={14} /> 导入数据
              </button>
              <button
                className="btn primary small"
                disabled={!data || active !== "chart" || !!result?.error}
                onClick={() => setModal({ kind: "export" })}
              >
                <Download size={14} /> 导出 <ChevronDown size={12} />
              </button>
            </div>
          </header>
          <div className="workspace-bar">
            <div>
              <button
                className="icon-btn"
                aria-label="切换数据面板"
                onClick={() => setLeft(!left)}
              >
                <PanelLeftClose size={17} />
              </button>
              <span>数据工作台</span>
              <span className="workspace-tag">STUDIO</span>
            </div>
            <div className="workspace-status">
              <span className="status-dot" />
              {data
                ? `${data.rows.length.toLocaleString()} 行数据已就绪`
                : "等待导入数据"}
              <button
                className="icon-btn"
                aria-label="切换设置面板"
                onClick={() => setRight(!right)}
              >
                <PanelRightClose size={17} />
              </button>
            </div>
          </div>
          {left && (
            <aside className="left-panel">
              <div className="panel-title">
                数据源{" "}
                <button
                  className="icon-btn"
                  aria-label="添加文件"
                  onClick={() => fileInput.current.click()}
                >
                  <Plus size={15} />
                </button>
              </div>
              <button
                className="file-card"
                onClick={() => fileInput.current.click()}
              >
                <span className="file-icon">
                  <FileSpreadsheet size={19} />
                </span>
                <span>
                  <strong>{fileName || "导入你的第一份数据"}</strong>
                  <small>
                    {data
                      ? `${data.rows.length.toLocaleString()} rows · ${data.headers.length} columns`
                      : "Excel / CSV · 最大 40 MB"}
                  </small>
                </span>
              </button>
              {data && (
                <>
                  <label className="sheet-select">
                    <Table2 size={14} />
                    <select
                      aria-label="工作表"
                      onChange={(e) =>
                        task("读取工作表…", async () => {
                          accept(
                            await run("sheet", {
                              index: Number(e.target.value),
                              dateFormat,
                            }),
                            { auto: true },
                          );
                          record(`切换工作表 ${data.sheets[e.target.value]}`);
                        })
                      }
                    >
                      {data.sheets.map((s, i) => (
                        <option value={i} key={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} />
                  </label>
                  <div className="section-heading">
                    <span>字段</span>
                    <span>{data.headers.length}</span>
                  </div>
                  <div className="field-list">
                    {data.columns.map((c) => (
                      <div className="column-row" key={c.name}>
                        <span className={`type-icon ${c.type}`}>
                          {c.type === "date"
                            ? "◷"
                            : c.type === "text"
                              ? "Aa"
                              : "#"}
                        </span>
                        <span className="col-name" title={c.name}>
                          {c.name}
                        </span>
                        <select
                          aria-label={`${c.name} 类型`}
                          title="手动修改类型"
                          value={c.type}
                          onChange={(e) =>
                            task("重新识别字段…", async () => {
                              const overrides = Object.fromEntries(
                                data.columns.map((v) => [
                                  v.name,
                                  v.name === c.name ? e.target.value : v.type,
                                ]),
                              );
                              accept(
                                await run("infer", { overrides, dateFormat }),
                              );
                              record(
                                `字段 ${c.name} 类型修改为 ${e.target.value}`,
                              );
                            })
                          }
                        >
                          <option value="number">数值</option>
                          <option value="text">文本</option>
                          <option value="date">日期</option>
                          <option value="percent">百分比</option>
                          <option value="currency">货币</option>
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="quality-card">
                    <div>
                      <span className="section-label">DATA QUALITY</span>
                      <CheckCircle2 size={14} />
                    </div>
                    <h4>
                      {data.columns.reduce((s, c) => s + c.missing, 0)}{" "}
                      <small>个缺失单元格</small>
                    </h4>
                    <p>
                      {data.duplicates} 条重复记录 ·{" "}
                      {data.columns.reduce((s, c) => s + c.invalid, 0)}{" "}
                      个类型异常
                    </p>
                    <button onClick={() => setActive("data")}>
                      检查数据 <ArrowRight size={12} />
                    </button>
                  </div>
                </>
              )}
              <div className="section-heading">
                <span>数据处理</span>
                <SlidersHorizontal size={13} />
              </div>
              <button
                className="side-action"
                disabled={!data}
                onClick={() => setModal({ kind: "cleanMenu" })}
              >
                <Sparkles size={15} /> 数据清洗 <ChevronRight size={13} />
              </button>
              <button
                className="side-action"
                disabled={!data}
                onClick={() => setActive("analysis")}
              >
                <FlaskConical size={15} /> 公式与模型 <ChevronRight size={13} />
              </button>
              <button
                className="side-action"
                disabled={!data}
                onClick={() => setActive("trace")}
              >
                <Activity size={15} /> 计算记录{" "}
                <span className="count">{audit.length}</span>
              </button>
              <div className="side-bottom">
                <ShieldCheck size={17} />
                <div>
                  <strong>你的数据，留在你的设备</strong>
                  <p>基础绘图和计算均在浏览器内运行。</p>
                </div>
              </div>
            </aside>
          )}
          <main className="main-panel">
            <div className="plot-journey"><span>01 Upload 上传</span><span>02 Select 选区</span><span>03 Customize 定制</span><span>04 Export 导出</span></div>
            <div className="main-title">
              <div>
                <span className="section-label">YOUR ANALYSIS SPACE</span>
                <h2>
                  {data ? "让洞察，自然呈现。" : "每一个洞察，都从数据开始。"}
                </h2>
              </div>
              <button className="btn small" onClick={demo}>
                <Activity size={14} /> 加载示例
              </button>
            </div>
            <div className="view-toolbar">
              <div className="tabs">
                {[
                  ["chart", "图表", LineChart],
                  ["data", "数据预览", Table2],
                  ["select", "精确选区", SlidersHorizontal],
                  ["analysis", "专业分析", FlaskConical],
                  ["trace", "记录", Activity],
                ].map(([id, label, I]) => (
                  <button
                    key={id}
                    className={active === id ? "selected" : ""}
                    onClick={() => setActive(id)}
                  >
                    <I size={14} />
                    {label}
                  </button>
                ))}
              </div>
              {data && (
                <button
                  className="text-btn"
                  onClick={() => {
                    update("xMin", "");
                    update("xMax", "");
                    update("yMin", "");
                    update("yMax", "");
                    update("tick", "");
                    update("xTick", "");
                    update("viewZoom", null);
                    chart.current?.dispatchAction({ type: "restore" });
                  }}
                >
                  <RotateCcw size={12} /> 重置视图
                </button>
              )}
            </div>
            {data&&<div className="selection-status"><output aria-label="绘图记录计数">Original: {data.rows.length} points · Selected: {plotData?.rows.length||0} points</output><button className="text-btn" onClick={()=>setActive('select')}>精确选区</button><button className="text-btn" disabled={!['line','scatter','area'].includes(settings.type)} onClick={()=>{setActive('chart');chart.current?.dispatchAction({type:'takeGlobalCursor',key:'brush',brushOption:{brushType:'rect',brushMode:'single'}});}}>图中框选</button><button className="text-btn" onClick={()=>update('plotSelection',{...ALL_SELECTION})}>全部数据</button><button className="text-btn" onClick={()=>exportData("csv","selected")}>导出选区CSV</button><button className="text-btn" disabled={!settingsHistory.current.past.length} onClick={()=>undoStyle()}>撤销设置</button><button className="text-btn" disabled={!settingsHistory.current.future.length} onClick={()=>undoStyle(true)}>重做设置</button></div>}
            {!data ? (
              <div
                className="empty-drop"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  upload(e.dataTransfer.files[0]);
                }}
              >
                <div className="upload-graphic">
                  <FileSpreadsheet size={34} />
                  <span>
                    <Plus size={13} />
                  </span>
                </div>
                <h3>把原始数据，变成清晰的故事。</h3>
                <p>拖入 Excel 或 CSV 文件，或从示例开始探索。</p>
                <button
                  className="btn primary"
                  onClick={() => fileInput.current.click()}
                >
                  <Upload size={16} /> 选择数据文件
                </button>
                <small>.xlsx / .csv · 本地处理 · 最大 40 MB</small>
                <details className="import-options">
                  <summary>CSV 导入选项</summary>
                  <ImportOptions
                    encoding={encoding}
                    setEncoding={setEncoding}
                    delimiter={delimiter}
                    setDelimiter={setDelimiter}
                    dateFormat={dateFormat}
                    setDateFormat={setDateFormat}
                  />
                </details>
              </div>
            ) : (
              <>
                {active === "chart" && (
                  <>
                    <div className="chart-card">
                      {result?.error ? (
                        <div className="chart-error" key="chart-error">
                          <Info />
                          <h3>检查坐标设置</h3>
                          <p>{result.error}</p>
                          <button
                            className="btn"
                            onClick={() =>
                              setSettings((s) => ({
                                ...s,
                                log: false,
                                yMin: "",
                                yMax: "",
                                xMin: "",
                                xMax: "",
                                tick: "",
                              }))
                            }
                          >
                            恢复自动坐标
                          </button>
                        </div>
                      ) : (
                        <div
                          className="chart-container"
                          key="chart-canvas"
                          ref={chartRef}
                          data-testid="chart"
                        />
                      )}
                      <div className="chart-footer">
                        <span>
                          <span className="status-dot" />{" "}
                          {model ? "原始观测 + " + model.kind : "原始观测"}{" "}
                          {result?.sampled ? "· 展示已降采样" : ""}
                        </span>
                        <span>Apache ECharts · 拖动缩放条探索</span>
                      </div>
                    </div>
                    <div className="stat-strip">
                      <div>
                        <span>有效观测</span>
                        <strong>{selectedStats?.count.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span>均值</span>
                        <strong>{fmt(selectedStats?.mean)}</strong>
                      </div>
                      <div>
                        <span>样本标准差</span>
                        <strong>{fmt(selectedStats?.std)}</strong>
                      </div>
                      <div>
                        <span>数据范围</span>
                        <strong>
                          {fmt(selectedStats?.min)} <em>—</em>{" "}
                          {fmt(selectedStats?.max)}
                        </strong>
                      </div>
                    </div>
                    {result?.warnings?.length > 0 && (
                      <div className="warnings">
                        {result.warnings.map((w) => (
                          <p key={w}>
                            <Info size={13} />
                            {w}
                          </p>
                        ))}
                      </div>
                    )}
                    {model && <ModelResult model={model} />}
                  </>
                )}
                {active === "select" && <SelectionPanel key={dataRev.current} data={data} settings={settings} update={update} onError={setError}/>}
                {active === "data" && (
                  <div className="data-card">
                    <div className="data-card-head">
                      <strong>数据预览</strong>
                      <span>
                        {data.rows.length.toLocaleString()} 行 · 虚拟滚动
                      </span>
                    </div>
                    <div
                      className="table-scroll"
                      onScroll={(e) => setScroll(e.target.scrollTop)}
                    >
                      <table>
                        <thead>
                          <tr>
                            <th>绘图选择 / 记录 #</th>
                            {data.headers.map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ height: Math.floor(scroll / 34) * 34 }}>
                            <td
                              colSpan={data.headers.length + 1}
                              style={{ padding: 0, border: 0 }}
                            />
                          </tr>
                          {data.rows
                            .slice(
                              Math.floor(scroll / 34),
                              Math.floor(scroll / 34) + 18,
                            )
                            .map((r, i) => (
                              <tr key={i}>
                                <td><input type="checkbox" aria-label={`选择记录 ${Math.floor(scroll/34)+i+1}`} checked={plotData?.recordIndices.includes(Math.floor(scroll/34)+i+1)||false} onChange={e=>{const n=Math.floor(scroll/34)+i+1,records=plotData?.recordIndices||[];update('plotSelection',{...ALL_SELECTION,records:e.target.checked?[...records,n]:records.filter(v=>v!==n)});}}/>{Math.floor(scroll/34)+i+1}</td>
                                {data.headers.map((h) => (
                                  <td key={h}>
                                    {r[h] === null ? (
                                      <em>空值</em>
                                    ) : r[h] instanceof Date ? (
                                      r[h].toISOString().slice(0, 10)
                                    ) : (
                                      String(r[h])
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          <tr
                            style={{
                              height:
                                Math.max(
                                  0,
                                  data.rows.length -
                                    Math.floor(scroll / 34) -
                                    18,
                                ) * 34,
                            }}
                          >
                            <td
                              colSpan={data.headers.length + 1}
                              style={{ padding: 0, border: 0 }}
                            />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="summary-table">
                      <h4>全量数据统计</h4>
                      <div className="horizontal-scroll">
                        <table>
                          <thead>
                            <tr>
                              {[
                                "字段",
                                "类型",
                                "缺失",
                                "最小值",
                                "最大值",
                                "均值",
                                "样本标准差",
                              ].map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.columns.map((c) => (
                              <tr key={c.name}>
                                <td>{c.name}</td>
                                <td>{c.type}</td>
                                <td>{c.missing}</td>
                                <td>{fmt(c.min)}</td>
                                <td>{fmt(c.max)}</td>
                                <td>{fmt(c.mean)}</td>
                                <td>{fmt(c.std)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {active === "analysis" && (
                  <div className="analysis-content">
                    <WorkflowPanel
                      key={data.headers.join('|')}
                      data={data}
                      onPreview={workflowPreview}
                      onHistory={history}
                      busy={!!busy}
                    />
                    <div className="button-row">
                      <button
                        className="btn small"
                        onClick={() => exportData("csv")}
                      >
                        导出处理后 CSV
                      </button>
                      <button
                        className="btn small"
                        onClick={() => exportData("xlsx")}
                      >
                        导出处理后 XLSX
                      </button>
                      <button className="btn small" onClick={exportTrace}>
                        导出分析配置 JSON
                      </button>
                      <button
                        className="btn small"
                        onClick={() =>
                          document
                            .getElementById("analysis-config-file")
                            .click()
                        }
                      >
                        导入分析配置 JSON
                      </button>
                    </div>
                    <section className="analysis-card">
                      <div className="section-label">FORMULA REGISTRY</div>
                      <h3>可验证的计算，透明的依据。</h3>
                      <p>
                        公式按当前行顺序计算。时间相关公式请先确认数据已按时间排序；不会自动填补缺失值。
                      </p>
                      <div className="form-grid">
                        <Field label="输入字段">
                          <select
                            value={formulaCol}
                            onChange={(e) => setFormulaCol(e.target.value)}
                          >
                            {nums.map((c) => (
                              <option key={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="注册公式">
                          <select
                            value={formula}
                            onChange={(e) => setFormula(e.target.value)}
                          >
                            {Object.entries(FORMULA_REGISTRY).map(([id, f]) => (
                              <option value={id} key={id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="formula-definition">
                        <code>{FORMULA_REGISTRY[formula].definition}</code>
                        <p>
                          {FORMULA_REGISTRY[formula].condition} ·{" "}
                          {FORMULA_REGISTRY[formula].missing}
                        </p>
                      </div>
                      {formula === "movingAverage" && (
                        <Field label="窗口（样本数）">
                          <input
                            type="number"
                            min="2"
                            value={windowSize}
                            onChange={(e) =>
                              setWindowSize(Number(e.target.value))
                            }
                          />
                        </Field>
                      )}
                      {[
                        "logReturn",
                        "cumulativeReturn",
                        "volatility",
                        "maximumDrawdown",
                        "cagr",
                      ].includes(formula) && (
                        <div className="finance-options">
                          <Field label="价格口径">
                            <select
                              value={priceBasis}
                              onChange={(e) => setPriceBasis(e.target.value)}
                            >
                              <option value="adjusted">复权价格</option>
                              <option value="unadjusted">未复权价格</option>
                            </select>
                          </Field>
                          <Field label="数据频率">
                            <select
                              value={frequency}
                              onChange={(e) => setFrequency(e.target.value)}
                            >
                              <option value="daily">日频</option>
                              <option value="weekly">周频</option>
                              <option value="monthly">月频</option>
                              <option value="irregular">不规则</option>
                            </select>
                          </Field>
                          {formula === "volatility" && (
                            <Field label="每年期数（不自动猜测）">
                              <input
                                aria-label="每年期数"
                                type="number"
                                min="1"
                                value={periods}
                                onChange={(e) => setPeriods(e.target.value)}
                              />
                            </Field>
                          )}
                          {formula === "cagr" && (
                            <Field label="实际跨越年数">
                              <input
                                aria-label="实际跨越年数"
                                type="number"
                                min="0.001"
                                step="any"
                                value={years}
                                onChange={(e) => setYears(e.target.value)}
                              />
                            </Field>
                          )}
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={finance}
                              onChange={(e) => setFinance(e.target.checked)}
                            />{" "}
                            确认价格口径、频率和行顺序正确
                          </label>
                        </div>
                      )}
                      <button
                        className="btn primary"
                        onClick={applyFormula}
                        disabled={!!busy}
                      >
                        创建派生列 <Plus size={14} />
                      </button>
                    </section>
                    <section className="analysis-card">
                      <div className="section-label">MODEL REGISTRY</div>
                      <h3>选择合适的方法。</h3>
                      <p>
                        对第一个Y字段使用独立Fit Selection中的全部有效数据；视图缩放不改变样本。日期X以Unix
                        毫秒计算。
                      </p>
                      <div className="form-grid">
                        <Field label="分析方法">
                          <select
                            aria-label="拟合模型"
                            value={fitId}
                            onChange={(e) => {
                              setFitId(e.target.value);
                              track("fit_model_selected", {
                                model_id: e.target.value,
                              });
                            }}
                          >
                            {Object.entries(MODEL_REGISTRY).map(([id, m]) => (
                              <option key={id} value={id}>
                                {m.kind} · {m.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        {fitId === "moving" && (
                          <Field label="窗口大小">
                            <input
                              type="number"
                              min="2"
                              value={windowSize}
                              onChange={(e) =>
                                setWindowSize(Number(e.target.value))
                              }
                            />
                          </Field>
                        )}
                      </div>
                      <div className="method-note">
                        {MODEL_REGISTRY[fitId].condition}
                      </div>
                      <div className="button-row">
                        <button
                          className="btn primary"
                          onClick={() => fitModel()}
                          disabled={!!busy}
                        >
                          运行分析 <ArrowRight size={14} />
                        </button>
                        <button
                          className="btn"
                          onClick={compare}
                          disabled={!!busy}
                        >
                          比较候选回归模型
                        </button>
                        <button
                          className="text-btn"
                          onClick={() => {
                            setModel(null);
                            setComparison(null);
                          }}
                        >
                          移除模型
                        </button>
                      </div>
                      {comparison && (
                        <div className="comparison">
                          <p>
                            五折连续区块验证，按验证 RMSE
                            排序；这是描述性比较，不能替代时间序列预测回测。
                          </p>
                          <table>
                            <thead>
                              <tr>
                                <th>模型</th>
                                <th>验证 RMSE</th>
                                <th>训练 RMSE</th>
                                <th>参数数</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comparison.map((c) => (
                                <tr key={c.id}>
                                  <td>{MODEL_REGISTRY[c.id].name}</td>
                                  <td>{fmt(c.cvRmse)}</td>
                                  <td>{fmt(c.rmse)}</td>
                                  <td>{c.parameters}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {model && <ModelResult model={model} />}
                    </section>
                  </div>
                )}
                {active === "trace" && (
                  <div className="analysis-card">
                    <div className="trace-head">
                      <h3>分析记录</h3>
                      <button className="btn small" onClick={exportTrace}>
                        <Download size={13} /> 导出 JSON
                      </button>
                    </div>
                    <p>
                      记录本次会话的处理步骤、参数与模型依据。关闭页面后不保留数据。
                    </p>
                    {audit.map((a, i) => (
                      <div className="trace-row" key={i}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <small>{new Date(a.time).toLocaleString()}</small>
                          <p>{a.text}</p>
                        </div>
                        <Check size={14} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="insight-bar">
                  <span className="insight-icon">
                    <Sparkles size={17} />
                  </span>
                  <div>
                    <strong>智能建议</strong>
                    <p>{rec?.reason}</p>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => {
                      setSettings((s) => ({ ...s, ...rec }));
                      setModel(null);
                      setNotice("已应用确定性图表推荐。");
                    }}
                  >
                    应用 <ArrowUpRight size={13} />
                  </button>
                </div>
                {!STATIC_BUILD&&<AnonymousSurvey />}
              </>
            )}
            <div className="main-foot">
              <button onClick={() => setAbout(true)}>
                Made by <StudioWordmark />
              </button>
              <button onClick={() => setConsent("unset")}>隐私设置</button>
              <span>从原始数据到专业洞察，一步完成。</span>
              <span>v6.0 · 611 Studio</span>
            </div>
          </main>
          {right && (
            <aside className="right-panel">
              <div className="panel-title">
                图表设置 <SlidersHorizontal size={15} />
              </div>
              <div className="settings-section">
                <label className="control-label">图表类型</label>
                <ProMappings data={data} settings={settings} update={update} />
                <div className="chart-types">
                  {TYPES.map(([id, n, I]) => (
                    <button
                      disabled={!data}
                      key={id}
                      className={settings.type === id ? "selected" : ""}
                      onClick={() => update("type", id)}
                    >
                      <I size={20} />
                      <span>{n}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-section">
                <label className="control-label">
                  数据映射 <span>AXES</span>
                </label>
                <Field label="X 轴">
                  <select
                    aria-label="X 轴"
                    value={settings.x}
                    onChange={(e) => update("x", e.target.value)}
                  >
                    <option value="">选择字段</option>
                    {data?.headers.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Y 轴">
                  <div className="y-options">
                    {nums.map((c) => (
                      <label
                        key={c.name}
                        className={
                          settings.y.includes(c.name) ? "selected" : ""
                        }
                      >
                        <input
                          type="checkbox"
                          checked={settings.y.includes(c.name)}
                          onChange={(e) =>
                            update(
                              "y",
                              e.target.checked
                                ? [...settings.y, c.name]
                                : settings.y.filter((y) => y !== c.name),
                            )
                          }
                        />
                        <span className="series-dot" />
                        {c.name}
                      </label>
                    ))}
                    {!nums.length && (
                      <span className="muted">导入数据后选择</span>
                    )}
                  </div>
                </Field>
                <button
                  className="auto-scale"
                  disabled={!data}
                  onClick={() => {
                    setSettings((s) => ({
                      ...s,
                      xMin: "",
                      xMax: "",
                      yMin: "",
                      yMax: "",
                      tick: "",
                      log: false,
                    }));
                    setNotice("已根据完整数据自动设置坐标。");
                  }}
                >
                  <Sparkles size={13} /> Auto Scale <span>自动坐标</span>
                </button>
                <Toggle
                  label="Log Scale"
                  checked={settings.log}
                  onChange={(v) => update("log", v)}
                />
              </div>
              <div className="settings-section">
                <label className="control-label">
                  视觉风格 <span>STYLE</span>
                </label>
                <div className="theme-tabs">
                  {Object.keys(palettes).map((t) => (
                    <button
                      className={settings.theme === t ? "selected" : ""}
                      key={t}
                      onClick={() => {
                        update("theme", t);
                        update("fontFamily",t==='Journal'?'Times New Roman, SimSun, serif':'Inter Variable, Arial, Microsoft YaHei, sans-serif');
                        update("fontSize",t==='Presentation'?16:12);
                        update("color", "");
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="color-row">
                  {palettes[settings.theme].map((c) => (
                    <button
                      key={c}
                      aria-label={`颜色 ${c}`}
                      style={{ background: c }}
                      className={
                        (settings.color || palettes[settings.theme][0]) === c
                          ? "selected"
                          : ""
                      }
                      onClick={() => update("color", c)}
                    />
                  ))}
                  <label className="custom-color" title="自定义颜色">
                    <Plus size={13} />
                    <input
                      aria-label="自定义图表颜色"
                      type="color"
                      value={settings.color || palettes[settings.theme][0]}
                      onChange={(e) => update("color", e.target.value)}
                    />
                  </label>
                </div>
                <Field label="图表标题">
                  <input
                    aria-label="图表标题"
                    value={settings.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="为你的图表命名"
                  />
                </Field>
                <Toggle
                  label="显示图例"
                  checked={settings.legend}
                  onChange={(v) => update("legend", v)}
                />
                <Toggle
                  label="显示网格"
                  checked={settings.grid}
                  onChange={(v) => update("grid", v)}
                />
              </div>
              <button
                className="advanced-toggle"
                onClick={() => setAdvanced(!advanced)}
              >
                <SlidersHorizontal size={14} /> Advanced{" "}
                <ChevronDown
                  size={14}
                  style={{ transform: advanced ? "rotate(180deg)" : "" }}
                />
              </button>
              {advanced && (
                <div className="settings-section advanced">
                  <ProStyle settings={settings} update={update} />
                  <ProfessionalControls settings={settings} update={update}/>
                  <button className="btn small" onClick={()=>setSettings(s=>({...s,...PROFESSIONAL_DEFAULTS,plotSelection:s.plotSelection,fitSelection:s.fitSelection}))}>恢复专业默认样式</button>
                  <Field label="X 轴标签">
                    <input
                      value={settings.axisX}
                      onChange={(e) => update("axisX", e.target.value)}
                    />
                  </Field>
                  <Field label="Y 轴标签">
                    <input
                      value={settings.axisY}
                      onChange={(e) => update("axisY", e.target.value)}
                    />
                  </Field>
                  {[
                    ["xMin", "X 最小值"],
                    ["xMax", "X 最大值"],
                    ["yMin", "Y 最小值"],
                    ["yMax", "Y 最大值"],
                    ["tick", "Y 刻度间隔"],
                  ].map(([k, l]) => (
                    <Field key={k} label={l}>
                      <input
                        aria-label={l}
                        placeholder="自动"
                        value={settings[k]}
                        onChange={(e) => update(k, e.target.value)}
                      />
                    </Field>
                  ))}
                  <Field label="字号">
                    <input
                      type="number"
                      min="8"
                      max="32"
                      value={settings.fontSize}
                      onChange={(e) =>
                        update(
                          "fontSize",
                          Math.min(32, Math.max(8, Number(e.target.value))),
                        )
                      }
                    />
                  </Field>
                  <Field label="线宽">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={settings.lineWidth}
                      onChange={(e) =>
                        update("lineWidth", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="小数位">
                    <input
                      type="number"
                      min="0"
                      max="8"
                      value={settings.precision}
                      onChange={(e) =>
                        update(
                          "precision",
                          Math.min(8, Math.max(0, Number(e.target.value))),
                        )
                      }
                    />
                  </Field>
                  <Toggle
                    label="Scientific Notation"
                    checked={settings.scientific}
                    onChange={(v) => update("scientific", v)}
                  />
                </div>
              )}
              <div className="export-note">
                <Download size={17} />
                <p>
                  准备好分享了吗？<span>高清 PNG · 矢量 SVG</span>
                </p>
              </div>
            </aside>
          )}
        </div>
      )}
      {error && (
        <div className="error-toast" role="alert">
          <Info size={17} />
          <span>{error}</span>
          <button aria-label="关闭错误" onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {notice && (
        <div className="notice-toast" role="status">
          <CheckCircle2 size={16} />
          {notice}
        </div>
      )}
      {busy && (
        <div className="busy-toast" role="status">
          <LoaderCircle className="spin" size={17} />
          <span>{busy}</span>
          <button onClick={cancel}>取消处理</button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="操作设置"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-btn"
              aria-label="关闭弹窗"
              onClick={() => setModal(null)}
            >
              <X size={18} />
            </button>
            {modal.kind === "cleanMenu" && (
              <>
                <span className="section-label">DATA PREPARATION</span>
                <h2>让数据准备就绪。</h2>
                <p>清洗只作用于派生数据，确认前先预览影响。</p>
                {[
                  ["deduplicate", "删除完全重复的行"],
                  ["dropMissing", "删除含缺失值的行"],
                  ["trim", "去除文本前后空格"],
                ].map(([id, n]) => (
                  <button
                    className="clean-option"
                    key={id}
                    onClick={() => cleanPreview(id)}
                  >
                    {n}
                    <ArrowRight size={15} />
                  </button>
                ))}
                <button
                  className="btn"
                  onClick={() =>
                    task("恢复原始数据…", async () => {
                      accept(await run("reset", { dateFormat }), {
                        auto: true,
                      });
                      record("恢复原始工作表；移除全部派生变换。");
                      setModal(null);
                    })
                  }
                >
                  <RotateCcw size={14} /> 恢复原始数据
                </button>
                <details className="import-options">
                  <summary>重新解析 CSV</summary>
                  <ImportOptions
                    {...{
                      encoding,
                      setEncoding,
                      delimiter,
                      setDelimiter,
                      dateFormat,
                      setDateFormat,
                    }}
                  />
                  <button
                    className="btn small"
                    disabled={!fileCache.current}
                    onClick={() => {
                      const f = fileCache.current;
                      upload(new File([f.buffer], f.name));
                      setModal(null);
                    }}
                  >
                    按新选项重新导入
                  </button>
                </details>
              </>
            )}
            {modal.kind === "clean" && (
              <>
                <span className="section-label">PREVIEW CHANGES</span>
                <h2>确认数据变换</h2>
                <div className="clean-impact">
                  <strong>{modal.before.toLocaleString()}</strong>
                  <ArrowRight />
                  <strong>{modal.after.toLocaleString()}</strong>
                  <span>处理前 / 处理后行数</span>
                </div>
                <p>
                  受影响或重排的行位置：{modal.changed}
                  。不会覆盖原始数据；处理记录将保留本次操作。
                </p>
                <div className="button-row">
                  <button className="btn primary" onClick={applyClean}>
                    确认应用
                  </button>
                  <button className="btn" onClick={() => setModal(null)}>
                    取消
                  </button>
                </div>
              </>
            )}
            {modal.kind === "config" && (
              <>
                <span className="section-label">REPRODUCIBLE ANALYSIS</span>
                <h2>确认重放分析配置</h2>
                <p>
                  将恢复当前原始工作表，并重放 {modal.config.steps.length}{" "}
                  个本地数据处理步骤。文件指纹已匹配；现有处理可撤销。
                </p>
                <button className="btn primary" onClick={applyConfig}>
                  确认重放配置
                </button>
              </>
            )}
            {modal.kind === "transform" && (
              <>
                <span className="section-label">PREVIEW DERIVED DATA</span>
                <h2>确认处理影响</h2>
                <p>
                  {modal.operation} · {modal.before} → {modal.after} 行 ·{" "}
                  {modal.columns.length} 列
                </p>
                <pre className="transform-preview">
                  {JSON.stringify(modal.preview, null, 2)}
                </pre>
                <p>原始数据保留；确认后可撤销或重做。</p>
                <div className="button-row">
                  <button className="btn primary" onClick={applyTransform}>
                    确认应用数据处理
                  </button>
                  <button className="btn" onClick={() => setModal(null)}>
                    取消
                  </button>
                </div>
              </>
            )}
            {modal.kind === "export" && (
              <>
                <span className="section-label">PUBLICATION READY</span>
                <h2>把洞察带走。</h2>
                <p>按同一Plot Specification重新排版，保留选区、轴、样式与可见范围；移除操作工具。论文建议SVG或300/600 DPI PNG，PPT建议PNG。PDF/Excel原生图表/脚本为第二阶段，当前未提供。</p>
                <Field label="输出尺寸模式"><select aria-label="输出尺寸模式" value={exportMode} onChange={e=>setExportMode(e.target.value)}><option value="pixels">指定像素尺寸</option><option value="physical">指定物理尺寸 mm</option></select></Field>
                <Field label="DPI"><select aria-label="DPI" value={dpi} onChange={e=>setDpi(Number(e.target.value))}><option value="300">300 DPI</option><option value="600">600 DPI</option></select></Field>
                {exportMode==='physical'&&<div className="form-grid"><Field label="物理宽度 mm"><input aria-label="物理宽度 mm" type="number" step="0.1" min="20" max="500" value={widthMM} onChange={e=>setWidthMM(Number(e.target.value))}/></Field><Field label="物理高度 mm"><input aria-label="物理高度 mm" type="number" step="0.1" min="20" max="500" value={heightMM} onChange={e=>setHeightMM(Number(e.target.value))}/></Field></div>}
                <div className="form-grid">
                  <Field label="画布宽度">
                    <input
                      type="number"
                      min="600"
                      max="3000"
                      value={exportWidth}
                      onChange={(e) =>
                        setExportWidth(
                          Math.min(3000, Math.max(600, Number(e.target.value))),
                        )
                      }
                    />
                  </Field>
                  <Field label="画布高度">
                    <input
                      type="number"
                      min="400"
                      max="2000"
                      value={exportHeight}
                      onChange={(e) =>
                        setExportHeight(
                          Math.min(2000, Math.max(400, Number(e.target.value))),
                        )
                      }
                    />
                  </Field>
                </div>
                <Field label="PNG 分辨率">
                  <select
                    value={exportScale}
                    onChange={(e) => setExportScale(Number(e.target.value))}
                  >
                    <option value="1">1× · 标准</option>
                    <option value="2">2× · 高清</option>
                    <option value="3">3× · 印刷</option>
                  </select>
                </Field>
                <Toggle
                  label="透明背景"
                  checked={transparent}
                  onChange={setTransparent}
                />
                <div className="button-row">
                  <button
                    className="btn primary"
                    onClick={() => exportChart("png")}
                  >
                    <Download size={15} /> 下载 PNG
                  </button>
                  <button className="btn" onClick={() => exportChart("svg")}>
                    <Download size={15} /> 下载 SVG
                  </button>
                </div>
                <small className="muted">
                  PNG {exportMode==='physical'?Math.round(widthMM/25.4*dpi):exportWidth*exportScale} × {exportMode==='physical'?Math.round(heightMM/25.4*dpi):exportHeight*exportScale} px · {dpi} DPI（含pHYs元数据）· SVG真实矢量文字和路径
                </small>
              </>
            )}
            {modal.kind === "aiConsent" && (
              <>
                <span className="section-label">YOUR DATA, YOUR CHOICE</span>
                <h2>允许发送分析摘要？</h2>
                <p>
                  将向配置的模型服务发送：你的问题、字段名称、类型、缺失数量、均值、范围、标准差。不会发送原始行或整个文件。字段名称和统计摘要仍可能包含敏感信息。
                </p>
                <div className="button-row">
                  <button className="btn primary" onClick={confirmedAI}>
                    同意并生成计划
                  </button>
                  <button className="btn" onClick={() => setModal(null)}>
                    取消
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-track" />
    </label>
  );
}
function ImportOptions({
  encoding,
  setEncoding,
  delimiter,
  setDelimiter,
  dateFormat,
  setDateFormat,
}) {
  return (
    <div className="import-grid">
      <label>
        编码
        <select value={encoding} onChange={(e) => setEncoding(e.target.value)}>
          <option value="utf-8">UTF-8</option>
          <option value="gb18030">GB18030 / GBK</option>
          <option value="windows-1252">Windows-1252</option>
        </select>
      </label>
      <label>
        分隔符
        <select
          value={delimiter}
          onChange={(e) => setDelimiter(e.target.value)}
        >
          <option value="">自动识别</option>
          <option value=",">逗号</option>
          <option value=";">分号</option>
          <option value={"\t"}>Tab</option>
        </select>
      </label>
      <label>
        日期格式
        <select
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value)}
        >
          <option value="auto">ISO 自动</option>
          <option value="YMD">年/月/日</option>
          <option value="DMY">日/月/年</option>
          <option value="MDY">月/日/年</option>
        </select>
      </label>
    </div>
  );
}
function ModelResult({ model }) {
  return (
    <div className="model-result">
      <div className="section-label">{model.kind.toUpperCase()} RESULTS</div>
      <code>{model.formula}</code>
      <p>样本数 n = {model.sampleCount??model.residuals?.length??'—'} · 拟合X区间 {model.fitRange?.map(v=>fmt(v)).join(' — ')||'完整有效选区'} · 参数 {model.coefficients?JSON.stringify(model.coefficients):'见表达式'}。拟合/插值/平滑与原始观测分别标记；R²不代表模型优劣。</p>
      {model.kind === "Regression" && (
        <>
          <div className="model-metrics">
            <span>
              R² <b>{fmt(model.r2)}</b>
            </span>
            <span>
              RMSE <b>{fmt(model.rmse)}</b>
            </span>
            <span>
              MAE <b>{fmt(model.mae)}</b>
            </span>
          </div>
          <ResidualPlot points={model.residuals} />
        </>
      )}
      <p>
        <Info size={13} />
        {model.warning}
      </p>
    </div>
  );
}
function ResidualPlot({ points }) {
  const ref = useRef();
  useEffect(() => {
    const c = echarts.init(ref.current, null, { renderer: "svg" });
    c.setOption({
      animation: false,
      title: {
        text: "残差 · 观测值 − 拟合值",
        textStyle: { fontSize: 11, color: "#718096" },
      },
      grid: { left: 55, right: 20, top: 30, bottom: 30 },
      tooltip: { renderMode: "richText" },
      xAxis: {
        type: "value",
        scale: true,
        axisLabel: { hideOverlap: true, fontSize: 9 },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 9 },
        splitLine: { lineStyle: { color: "#edf0f5" } },
      },
      series: [
        {
          type: "scatter",
          data:
            points.length > 3000
              ? points.filter(
                  (_, i) => i % Math.ceil(points.length / 3000) === 0,
                )
              : points,
          symbolSize: 4,
          itemStyle: { color: "#6570d4" },
          markLine: {
            silent: true,
            symbol: "none",
            data: [{ yAxis: 0 }],
            lineStyle: { color: "#b7bdcc" },
          },
        },
      ],
    });
    const o = new ResizeObserver(() => c.resize());
    o.observe(ref.current);
    return () => {
      o.disconnect();
      c.dispose();
    };
  }, [points]);
  return <div className="residual-plot" ref={ref} />;
}
class StudioBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    track("processing_error", { error_category: "render" });
  }
  render() {
    return this.state.failed ? (
      <main className="empty-drop">
        <h2>工作台遇到了显示错误</h2>
        <p>请刷新页面并重新导入文件。原始文件没有被修改。</p>
        <button className="btn" onClick={() => location.reload()}>
          重新加载
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function ChartSnapStudio(){return <StudioBoundary><App/></StudioBoundary>}
