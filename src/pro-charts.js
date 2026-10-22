import {
  number,
  pairs,
  niceAxis,
  summary,
  downsample,
  dateValue,
  distribution,
} from "./engine.js";
import { pearson } from "./workflows.js";
export function proChart(data, s, base) {
  const { rows, columns } = data,
    y = s.y,
    x = s.x,
    type = s.type,
    option = base.option,
    warnings = [...base.warnings];
  const numeric = columns.filter((c) =>
    ["number", "percent", "currency"].includes(c.type),
  );
  const axisType = columns.find((c) => c.name === x)?.type;
  const commonAxis = {
    axisLabel: { hideOverlap: true, color: "#8e98aa" },
    axisLine: { lineStyle: { color: "#e0e4ed" } },
    splitLine: { show: s.grid, lineStyle: { color: "#edf0f5" } },
  };
  if(type==='box'){
    const distributions=y.map(name=>distribution(rows.map(r=>number(r[name])).filter(v=>v!==null)));
    option.series=[{name:'分布',type:'boxplot',data:distributions.map(d=>d.box.length?d.box:['-','-','-','-','-']),itemStyle:{borderWidth:1.5}},{name:'离群观测',type:'scatter',data:distributions.flatMap((d,i)=>d.outliers.map(v=>[i,v])),symbolSize:s.pointSize||5}];
  }
  if (["pie", "donut"].includes(type)) {
    const groups = new Map();
    for (const row of rows) {
      const value = number(row[y[0]]);
      if (value === null || row[x] === null || row[x] === undefined) continue;
      if (value < 0) throw new Error("饼图/环形图不支持负数，请使用柱状图。");
      const key = String(row[x]);
      groups.set(key, (groups.get(key) || 0) + value);
    }
    if (![...groups.values()].some((v) => v > 0))
      throw new Error("饼图需要至少一个正数值");
    Object.assign(option, {
      xAxis: undefined,
      yAxis: undefined,
      dataZoom: [],
      brush: undefined,
      grid: undefined,
      toolbox: { show: false },
      tooltip: { trigger: "item", renderMode: "richText" },
      legend: { show: s.legend, bottom: 10, type: "scroll" },
      series: [
        {
          name: y[0],
          type: "pie",
          radius: type === "donut" ? ["40%", "65%"] : "65%",
          center: ["50%", "53%"],
          avoidLabelOverlap: true,
          label: { show: true, formatter: "{b}: {d}%" },
          data: [...groups].map(([name, value]) => ({ name, value })),
        },
      ],
    });
    warnings.push("扇区按 X 类别对第一个 Y 字段求和；没有修改源表。");
  }
  if (type === "hbar") {
    const prior = option.xAxis;
    option.xAxis = {
      ...option.yAxis,
      name: s.axisY || y.join(" / "),
      ...commonAxis,
    };
    option.yAxis = { ...prior, inverse: true, name: s.axisX || x, nameGap: 25 };
    option.grid = {
      left: 55,
      right: 55,
      top: 110,
      bottom: 75,
      containLabel: true,
    };
    option.dataZoom = [
      { type: "inside", yAxisIndex: 0, filterMode: "none" },
      { type: "slider", yAxisIndex: 0, right: 8, width: 12 },
    ];
  }
  if (type === "heatmap") {
    if (!data.headers.includes(s.categoryY))
      throw new Error(
        "热力图需要选择“分类 Y 字段”。颜色值使用第一个数值 Y，重复网格按平均值计算。",
      );
    const xa = [],
      ya = [],
      cells = new Map();
    for (const r of rows) {
      const v = number(r[y[0]]);
      if (v === null || r[x] === null || r[s.categoryY] === null) continue;
      const a = String(r[x]),
        b = String(r[s.categoryY]);
      if (!xa.includes(a)) xa.push(a);
      if (!ya.includes(b)) ya.push(b);
      const key = JSON.stringify([a, b]),
        cell = cells.get(key) || { a, b, sum: 0, n: 0 };
      cell.sum += v;
      cell.n++;
      cells.set(key, cell);
    }
    const values = [...cells.values()].map((c) => [
        xa.indexOf(c.a),
        ya.indexOf(c.b),
        c.sum / c.n,
      ]),
      ext = summary(values.map((v) => v[2]));
    Object.assign(option, {
      xAxis: { ...commonAxis, type: "category", data: xa, name: x },
      yAxis: { ...commonAxis, type: "category", data: ya, name: s.categoryY },
      legend: { show: false },
      dataZoom: [],
      brush: undefined,
      toolbox: { show: false },
      visualMap: {
        min: ext.min ?? 0,
        max: ext.max === ext.min ? (ext.max ?? 0) + 1 : (ext.max ?? 1),
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 8,
        inRange: { color: ["#f0efff", "#aaa4e6", "#5044a8"] },
      },
      series: [
        {
          type: "heatmap",
          name: `${y[0]} · mean`,
          data: values,
          label: { show: values.length < 80 },
          emphasis: { itemStyle: { borderWidth: 1, borderColor: "#fff" } },
        },
      ],
    });
    warnings.push("热力图每格为有效数值均值，空格不填零。");
  }
  if (type === "correlation") {
    const names = y.length > 1 ? y : numeric.map((c) => c.name);
    if (names.length > 20 || names.length < 2)
      throw new Error("相关矩阵需要2–20个数值字段");
    const values = [];
    for (let i = 0; i < names.length; i++)
      for (let j = 0; j < names.length; j++) {
        const r = pearson(
          rows.map((v) => v[names[i]]),
          rows.map((v) => v[names[j]]),
        );
        if (r.r !== null) values.push([i, j, r.r, r.n]);
      }
    Object.assign(option, {
      xAxis: { ...commonAxis, type: "category", data: names },
      yAxis: { ...commonAxis, type: "category", data: names, inverse: true },
      legend: { show: false },
      dataZoom: [],
      brush: undefined,
      toolbox: { show: false },
      visualMap: {
        min: -1,
        max: 1,
        orient: "horizontal",
        left: "center",
        bottom: 8,
        inRange: { color: ["#5576b9", "#fbfbfd", "#c66a62"] },
      },
      series: [
        {
          name: "Pearson r",
          type: "heatmap",
          data: values,
          label: { show: true, formatter: (p) => p.value[2].toFixed(2) },
        },
      ],
    });
    warnings.push(
      "Pearson 相关系数按每对字段的共同有效样本计算，至少3点；常量列/样本不足留空。相关不表示因果。",
    );
  }
  if (type === "bubble") {
    if (!numeric.some((c) => c.name === s.z) || axisType === "text")
      throw new Error("气泡图需要数值/日期 X、数值 Y，以及数值大小字段 Z");
    const pp = rows
      .map((r) => [
        axisType === "date" ? dateValue(r[x], s.dateFormat) : number(r[x]),
        number(r[y[0]]),
        number(r[s.z]),
      ])
      .filter((v) => v.every((n) => n !== null));
    if (pp.some((p) => p[2] < 0)) throw new Error("气泡大小字段不能为负");
    const ext = summary(pp.map((v) => v[2]));
    const sampled = downsample(pp),
      zSample = downsample(pp.map((p, i) => [i, p[2]])).map((p) => pp[p[0]]),
      display = [...new Set([...sampled, ...zSample])].sort(
        (a, b) => a[0] - b[0],
      );
    option.series = [
      {
        name: `${y[0]} · size=${s.z}`,
        type: "scatter",
        data: display,
        symbolSize: (p) => 8 + 32 * Math.sqrt(ext.max ? p[2] / ext.max : 0),
        itemStyle: { opacity: s.opacity ?? 0.65 },
      },
    ];
    if (pp.length > display.length)
      warnings.push("气泡展示按Y及大小字段保留分桶极值；全量统计不受影响。");
  }
  if (type === "errorbar") {
    if (axisType === "text" || !numeric.some((c) => c.name === s.errorColumn))
      throw new Error("误差棒需要数值/日期 X，以及非负的误差半宽字段");
    const pp = rows
      .map((r) => [
        axisType === "date" ? dateValue(r[x], s.dateFormat) : number(r[x]),
        number(r[y[0]]),
        number(r[s.errorColumn]),
      ])
      .filter((v) => v.every((n) => n !== null));
    if (pp.some((p) => p[2] < 0)) throw new Error("误差半宽不能为负");
    const errorAxis=niceAxis(pp.flatMap(p=>[p[1]-p[2],p[1]+p[2]]),{log:s.log});
    const ds = downsample(pp);
    option.yAxis = {
      ...option.yAxis,
      ...errorAxis,
      min:s.yMin!==''&&s.yMin!==undefined?Number(s.yMin):errorAxis.min,
      max:s.yMax!==''&&s.yMax!==undefined?Number(s.yMax):errorAxis.max,
    };
    option.series = [
      {
        type: "scatter",
        name: y[0],
        data: ds.map((p) => p.slice(0, 2)),
        symbolSize: s.pointSize || 6,
      },
      {
        type: "custom",
        name: "± " + s.errorColumn,
        data: ds,
        renderItem: (params, api) => {
          const x = api.value(0),
            y = api.value(1),
            err = api.value(2),
            a = api.coord([x, y - err]),
            b = api.coord([x, y + err]);
          return {
            type: "group",
            children: [
              {
                type: "line",
                shape: { x1: a[0], x2: b[0], y1: a[1], y2: b[1] },
                style: { stroke: s.color || "#6c67b7", lineWidth: 1.5 },
              },
              ...[a, b].map((c) => ({
                type: "line",
                shape: { x1: c[0] - 4, x2: c[0] + 4, y1: c[1], y2: c[1] },
                style: { stroke: s.color || "#6c67b7", lineWidth: 1.5 },
              })),
            ],
          };
        },
      },
    ];
    warnings.push(
      "误差棒是用户提供的对称 ± 半宽；不会将其自行解释为置信区间。",
    );
  }
  if (type === "multi") {
    if (y.length > 6) throw new Error("多图布局最多选择6个Y字段");
    const grids = [],
      xa = [],
      ya = [],
      series = [];
    const nRows = Math.ceil(y.length / 2),
      height = 68 / nRows;
    y.forEach((name, i) => {
      const col = i % 2,
        row = Math.floor(i / 2);
      grids.push({
        left: col ? "56%" : "9%",
        right: col ? "3%" : "54%",
        top: `${18 + row * (height + 4)}%`,
        height: `${height - 3}%`,
        containLabel: true,
      });
      xa.push({
        type:
          axisType === "date"
            ? "time"
            : axisType === "text"
              ? "category"
              : "value",
        gridIndex: i,
        ...commonAxis,
        scale: true,
      });
      ya.push({
        type: "value",
        gridIndex: i,
        name,
        ...commonAxis,
        scale: true,
      });
      const p = pairs(rows, x, name, columns, s.dateFormat);
      series.push({
        type: "line",
        name,
        xAxisIndex: i,
        yAxisIndex: i,
        data: downsample(p),
        showSymbol: false,
        lineStyle: { width: s.lineWidth || 2 },
      });
    });
    Object.assign(option, {
      grid: grids,
      xAxis: xa,
      yAxis: ya,
      series,
      legend: { show: false },
      dataZoom: [],
      toolbox: { show: false },
      brush: undefined,
    });
  }
  if (s.dualY && y.length >= 2 && ["line", "scatter", "area"].includes(type)) {
    option.yAxis = y.slice(0, 2).map((name, i) => ({
      ...option.yAxis,
      ...niceAxis(
        rows.map((r) => number(r[name])).filter((v) => v !== null),
        { log: s.log },
      ),
      name,
      position: i ? "right" : "left",
      offset: 0,
    }));
    option.series.forEach((v, i) => (v.yAxisIndex = Math.min(i, 1)));
    warnings.push("双Y轴使用独立比例尺；请比较轴标签，不能直接比较线条高度。");
  }
  const dark = s.theme === "Dark",
    text = dark ? "#c1c8dc" : "#8992a2";
  option.backgroundColor = dark ? "#151c2c" : "#fff";
  option.textStyle={...option.textStyle,color:text};
  if(option.legend)option.legend.textStyle={...option.legend.textStyle,color:text};
  option.title.subtext = s.subtitle || "";
  option.title.textStyle = {
    ...option.title.textStyle,
    color: dark ? "#edf0fc" : "#263248",
  };
  option.title.subtextStyle = { color: text, fontSize: 11 };
  if(s.theme==='Scientific')option.textStyle={...option.textStyle,fontFamily:'Georgia, SimSun, serif'};
  if(s.legendPosition==='right'&&option.grid&&!Array.isArray(option.grid))option.grid.right=145;
  if (option.legend && s.legendPosition) {
    for (const k of ["left", "right", "top", "bottom"]) delete option.legend[k];
    Object.assign(
      option.legend,
      s.legendPosition === "bottom"
        ? { bottom: 38, left: "center" }
        : s.legendPosition === "right"
          ? { right: 6, top: 110, orient: "vertical" }
          : { top: 64, left: "center" },
    );
  }
  option.series?.forEach((series) => {
    series.itemStyle = { ...series.itemStyle, opacity: s.opacity ?? 0.85 };
    if (series.type === "line")
      series.lineStyle = {
        ...series.lineStyle,
        type: s.lineType || "solid",
        width: s.lineWidth || 2,
        opacity: s.opacity ?? 1,
      };
    if (series.type === "scatter" && typeof series.symbolSize!=='function')
      series.symbolSize = s.pointSize || series.symbolSize || 6;
    series.symbol = s.symbol || "circle";
  });
  for (const axis of [
    ...(Array.isArray(option.xAxis) ? option.xAxis : [option.xAxis]),
    ...(Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis]),
  ].filter(Boolean)) {
    axis.axisLabel = { ...axis.axisLabel, color: text };
    if (dark)
      axis.splitLine = {
        show: s.grid,
        lineStyle: { color: "#2b3449", type: "dashed" },
      };
  }
  if (
    (s.yMin !== "" && s.yMin !== undefined) ||
    (s.yMax !== "" && s.yMax !== undefined)
  )
    warnings.push("已使用自定义Y范围，视图可能截断观测；原始数据保留。");
  return { ...base, option, warnings: [...new Set(warnings)] };
}
