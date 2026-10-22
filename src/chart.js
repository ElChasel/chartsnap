import {
  pairs,
  downsample,
  distribution,
  niceAxis,
  number,
  summary,
  dateValue,
} from "./engine.js";
import { professionalOption } from './plot-spec.js';
import { proChart } from "./pro-charts.js";
export const palettes = {
  Modern: ["#4f5be7", "#14a89a", "#e79a41", "#ab72d0"],
  Academic: ["#252d3b", "#b84343", "#517da2", "#6a8755"],
  Business: ["#335acb", "#10a7a0", "#e6ad4a", "#7d8fae"],
  Scientific: ["#24455f", "#be4e48", "#679969", "#aa8b50"],
  Journal: ["#202124", "#b8423a", "#397ca8", "#64864a"],
  Engineering: ["#155b8a", "#c05816", "#367547", "#834e9b"],
  Presentation: ["#4f5be7", "#087f8c", "#b45921", "#9154a2"],
  Dark: ["#a5a3ff", "#55ccba", "#ffc580", "#de9ee2"],
};
export function formatNumber(v, scientific = false, precision = 3) {
  if (!Number.isFinite(Number(v))) return String(v);
  if (scientific) return Number(v).toExponential(precision);
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: precision,
    notation: Math.abs(v) >= 1e6 ? "compact" : "standard",
  }).format(v);
}
export function chartOption(data, settings, model = null, figure = undefined) {
  const special = [
    "hbar",
    "pie",
    "donut",
    "heatmap",
    "correlation",
    "bubble",
    "errorbar",
    "multi",
  ];
  const adjusted = {
    ...settings,
    type:
      settings.type === "hbar"
        ? "bar"
        : special.includes(settings.type)
          ? "scatter"
          : settings.type,
  };
  const base = baseChartOption(
    data,
    adjusted,
    settings.showModel === false ? null : model,
  );
  return base.option?.series ? professionalOption(proChart(data, settings, base),data,settings,settings.showModel === false ? null : model,figure) : base;
}
function baseChartOption(data, settings, model = null) {
  const {
    type,
    x,
    y,
    theme,
    title,
    legend,
    grid,
    log,
    scientific,
    precision,
    xMin,
    xMax,
    yMin,
    yMax,
    tick,
    axisX,
    axisY,
    lineWidth,
    fontSize,
    color,
    dateFormat,
  } = settings;
  const columns = data.columns,
    xc = columns.find((c) => c.name === x),
    numeric = xc && xc.type !== "text",
    isTime = xc?.type === "date",
    colors = [color || palettes[theme][0], ...palettes[theme].slice(1)];
  let all = [],
    series = [],
    categories = [],
    xValues = [],
    warnings = [],
    sampled = false;
  if (!y.length || !x)
    return {
      option: {
        title: { text: "请选择 X 轴和数值字段", left: "center", top: "center" },
      },
      warnings: [],
      sampled: false,
    };
  const plottedY = type === "histogram" ? y.slice(0, 1) : y;
  if (type === "histogram" && y.length > 1)
    warnings.push("直方图仅展示第一个 Y 字段，避免不同分箱的频数混在一起。");
  for (const name of plottedY) {
    let p = pairs(data.rows, x, name, columns, dateFormat);
    if (p.length < data.rows.length)
      warnings.push(
        `${name}：${data.rows.length - p.length} 行缺失/无效值未参与此图，原始数据保留。`,
      );
    if (type === "histogram") {
      const dist = distribution(
        data.rows.map((r) => number(r[name])).filter((v) => v !== null),
      );
      categories = dist.bins.map(
        (b) => `${formatNumber(b.start)}–${formatNumber(b.end)}`,
      );
      series.push({
        name,
        type: "bar",
        data: dist.bins.map((b) => b.count),
        barMaxWidth: 60,
      });
      all.push(...dist.bins.map((b) => b.count));
    } else if (type === "box") {
      const values = data.rows
          .map((r) => number(r[name]))
          .filter((v) => v !== null),
        dist = distribution(values);
      categories.push(name);
      series.push({
        name,
        type: "boxplot",
        data: y.map((n) => (n === name ? dist.box : null)),
        itemStyle: { borderWidth: 1.5 },
      });
      if (dist.outliers.length)
        series.push({
          name: `${name} 离群点`,
          type: "scatter",
          data: dist.outliers.map((v) => [categories.length - 1, v]),
          symbolSize: 5,
        });
      for (const v of values) all.push(v);
    } else if (type === "bar" || !numeric) {
      const groups = new Map();
      for (const [a, b] of p) {
        const key = String(a);
        groups.set(key, (groups.get(key) || 0) + b);
      }
      categories = [...new Set([...categories, ...groups.keys()])];
      series.push({
        name,
        type: type === "scatter" ? "scatter" : type === "bar" ? "bar" : "line",
        _groups: groups,
        barMaxWidth: 36,
        ...(type === "area" ? { areaStyle: { opacity: 0.12 } } : {}),
      });
      all.push(...groups.values());
      if (groups.size < p.length)
        warnings.push(
          `${name}：重复类别已求和（${p.length} 行 → ${groups.size} 类）。`,
        );
    } else {
      p.sort((a, b) => a[0] - b[0]);
      for (const row of p) {
        all.push(row[1]);
        xValues.push(row[0]);
      }
      let points = downsample(p);
      sampled ||= points.length < p.length;
      if(type!=='scatter'){
        const gaps=data.rows.flatMap(row=>{const a=isTime?dateValue(row[x],dateFormat):number(row[x]);return a!==null&&number(row[name])===null?[[a,null]]:[];});
        if(gaps.length)points=[...points,...gaps].sort((a,b)=>a[0]-b[0]);
      }
      series.push({
        name,
        type: type === "scatter" ? "scatter" : "line",
        data: points,
        showSymbol: p.length < 100,
        symbolSize: 6,
        smooth: false,
        connectNulls: false,
        lineStyle: { width: lineWidth },
        ...(type === "area" ? { areaStyle: { opacity: 0.12 } } : {}),
        emphasis: { focus: "series" },
        sampling: undefined,
      });
    }
  }
  for (const s of series)
    if (s._groups) {
      s.data = categories.map((c) => s._groups.get(c) ?? null);
      delete s._groups;
    }
  if (log && all.some((v) => v <= 0))
    throw new Error(
      "对数轴遇到非正数，无法绘制。请关闭 Log Scale；没有删除任何数据。",
    );
  const extent = summary(all);
  if (!log && extent.min > 0 && extent.max / extent.min >= 1000)
    warnings.push("数值跨越至少三个数量级，可尝试 Log Scale；切换由你决定。");
  const axis = niceAxis(all, {
    zero: type === "bar" || type === "histogram",
    log,
  });
  if (model && numeric && !["box", "histogram", "bar"].includes(type)) {
    series.push({
      name: `${model.kind} · ${model.id}`,
      type: "line",
      data: downsample(model.curve),
      showSymbol: false,
      lineStyle: { type: "dashed", width: 2, color: "#ec994b" },
    });
  }
  const custom = (v, fallback) =>
    v !== "" && v !== undefined && Number.isFinite(Number(v))
      ? Number(v)
      : fallback;
  for (const [name, value] of Object.entries({ xMin, xMax, yMin, yMax, tick }))
    if (
      value !== "" &&
      value !== undefined &&
      !Number.isFinite(Number(value)) &&
      !(isTime && name.startsWith("x") && Number.isFinite(Date.parse(value)))
    )
      throw new Error(`${name} 不是有效的坐标值。`);
  if (tick !== "" && tick !== undefined && Number(tick) <= 0)
    throw new Error("刻度间隔必须大于 0。");
  const xAxis = {
    type:
      ["histogram", "box", "bar"].includes(type) || !numeric
        ? "category"
        : isTime
          ? "time"
          : "value",
    name: axisX || x,
    nameLocation: "middle",
    nameGap: 36,
    data: categories,
    boundaryGap: type === "bar" || type === "histogram",
    axisLine: { show: true, lineStyle: { color: "#dfe3eb" } },
    axisTick: { show: false },
    axisLabel: { color: "#8992a2", hideOverlap: true, fontSize: fontSize - 1 },
    splitLine: {
      show: grid && numeric && !isTime,
      lineStyle: { color: "#f0f2f6", type: "dashed" },
    },
  };
  if (xAxis.type === "value") {
    Object.assign(xAxis, niceAxis(xValues));
    xAxis.min = custom(xMin, xAxis.min);
    xAxis.max = custom(xMax, xAxis.max);
  }
  if (xAxis.type === "time") {
    if (xMin !== "") xAxis.min = Date.parse(xMin);
    if (xMax !== "") xAxis.max = Date.parse(xMax);
  }
  if (
    xAxis.min !== undefined &&
    xAxis.max !== undefined &&
    xAxis.min >= xAxis.max
  )
    throw new Error("X 坐标上限必须大于下限。");
  if (xAxis.type === "value")
    xAxis.axisLabel.formatter = (v) => formatNumber(v, scientific, precision);
  let min = custom(yMin, axis.min),
    max = custom(yMax, axis.max);
  if (min >= max) throw new Error("坐标上限必须大于下限。");
  if (log && min <= 0) throw new Error("对数轴下限必须大于 0。");
  const option = {
    animation: false,
    backgroundColor: "#fff",
    color: colors,
    textStyle: {
      fontFamily:
        theme === "Academic"
          ? "Georgia, SimSun, serif"
          : "Inter, Segoe UI, Microsoft YaHei, sans-serif",
      fontSize,
    },
    title: {
      text: title,
      subtext: "",
      left: 28,
      top: 20,
      textStyle: { fontSize: fontSize + 6, fontWeight: 600, color: "#263248" },
    },
    legend: {
      show: legend,
      top: 60,
      textStyle: { color: "#6b7689", fontSize: fontSize - 1 },
      icon: "roundRect",
      itemWidth: 14,
      itemHeight: 4,
    },
    tooltip: {
      trigger: type === "scatter" || type === "box" ? "item" : "axis",
      renderMode: "richText",
      confine: true,
    },
    grid: { left: 72, right: 32, top: 108, bottom: 92, containLabel: true },
    xAxis,
    yAxis: {
      type: log ? "log" : "value",
      name:
        axisY || (type === "histogram" ? "频数" : y.length === 1 ? y[0] : ""),
      nameGap: 22,
      min,
      max,
      ...(!log ? { interval: custom(tick, axis.interval) } : {}),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#8992a2",
        fontSize: fontSize - 1,
        formatter: (v) => formatNumber(v, scientific, precision),
      },
      splitLine: {
        show: grid,
        lineStyle: { color: "#edf0f5", type: "dashed" },
      },
    },
    dataZoom: [
      { type: "inside", filterMode: "none" },
      {
        type: "slider",
        height: 16,
        bottom: 16,
        borderColor: "transparent",
        fillerColor: "#eceefe",
        handleStyle: { color: "#6874dc" },
      },
    ],
    toolbox: {
      show: true,
      right: 20,
      top: 16,
      feature: {
        dataZoom: { yAxisIndex: "none" },
        brush: { type: ["rect", "clear"] },
        restore: {},
      },
    },
    brush: { xAxisIndex: 0, brushMode: "single" },
    series,
  };
  if (sampled)
    warnings.push("展示采用保留区间极值的降采样；统计和拟合使用全部有效数据。");
  return { option, warnings: [...new Set(warnings)], sampled };
}
