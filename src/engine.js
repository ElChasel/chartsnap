import Papa from "papaparse";
import * as XLSX from "xlsx";
import { financial, exponential } from "./workflows.js";

export const isMissing = (v) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");
export function number(v) {
  if (isMissing(v) || v instanceof Date || typeof v === "boolean") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim(),
    percent = s.endsWith("%");
  s = s
    .replace(/^[¥￥$€£]/, "")
    .replace(/,/g, "")
    .replace(/%$/, "");
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) return null;
  let n = Number(s) / (percent ? 100 : 1);
  return Number.isFinite(n) ? n : null;
}
export function dateValue(v, format = "auto") {
  if (v instanceof Date) return Number.isFinite(+v) ? +v : null;
  if (typeof v !== "string") return null;
  let s = v.trim(),
    m;
  if (format !== "auto") {
    m = s.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
    if (!m) return null;
    let a = m.slice(1).map(Number),
      [y, mo, d] =
        format === "DMY"
          ? [a[2], a[1], a[0]]
          : format === "MDY"
            ? [a[2], a[0], a[1]]
            : a;
    let dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y &&
      dt.getUTCMonth() === mo - 1 &&
      dt.getUTCDate() === d
      ? +dt
      : null;
  }
  m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return dateValue(s, "YMD");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s)) return null;
  let n = Date.parse(s);
  return Number.isFinite(n) ? n : null;
}
export function summary(values) {
  let n = 0,
    mean = 0,
    m2 = 0,
    min = Infinity,
    max = -Infinity;
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) continue;
    n++;
    let d = v - mean;
    mean += d / n;
    m2 += d * (v - mean);
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return {
    count: n,
    min: n ? min : null,
    max: n ? max : null,
    mean: n ? mean : null,
    std: n > 1 ? Math.sqrt(m2 / (n - 1)) : null,
  };
}
export function infer(rows, headers, overrides = {}, dateFormat = "auto") {
  return headers.map((name) => {
    const values = rows.map((r) => r[name]),
      valid = values.filter((v) => !isMissing(v));
    const nums = valid.map(number),
      dates = valid.map((v) => dateValue(v, dateFormat));
    let type =
      valid.length && nums.every((v) => v !== null)
        ? "number"
        : valid.length && dates.every((v) => v !== null)
          ? "date"
          : "text";
    if (
      type === "number" &&
      valid.some((v) => typeof v === "string" && /%$/.test(v))
    )
      type = "percent";
    if (
      type === "number" &&
      valid.some((v) => typeof v === "string" && /^[¥￥$€£]/.test(v.trim()))
    )
      type = "currency";
    if(Object.hasOwn(overrides,name)){if(!['number','percent','currency','date','text'].includes(overrides[name]))throw new Error('字段类型无效');type=overrides[name];}
    const numeric = ["number", "percent", "currency"].includes(type);
    return {
      name,
      type,
      missing: values.length - valid.length,
      invalid: valid.filter((v) =>
        type === "date"
          ? dateValue(v, dateFormat) === null
          : numeric
            ? number(v) === null
            : false,
      ).length,
      ...(numeric ? summary(nums) : summary([])),
    };
  });
}
function table(matrix) {
  if (!matrix.length) throw new Error("文件为空：没有可读取的数据。");
  const used = new Set();
  const headers = matrix[0].map((v, i) => {
    let name = isMissing(v) ? `字段 ${i + 1}` : String(v).trim(),
      base = name,
      n = 2;
    while (used.has(name)) name = `${base} (${n++})`;
    used.add(name);
    return name;
  });
  const rows = matrix
    .slice(1)
    .filter((r) => r.some((v) => !isMissing(v)))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null])));
  if (!headers.length || !rows.length)
    throw new Error("文件中没有数据行（首行作为字段名）。");
  return { headers, rows };
}
export function validateZip(buffer) {
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("XLSX ZIP 目录损坏。");
  const count = view.getUint16(end + 10, true),
    offset = view.getUint32(end + 16, true);
  if (count === 65535 || count > 10000)
    throw new Error("工作簿包含过多 ZIP 条目或使用不支持的 ZIP64。");
  let cursor = offset,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (
      cursor + 46 > bytes.length ||
      view.getUint32(cursor, true) !== 0x02014b50
    )
      throw new Error("XLSX ZIP 目录无效。");
    const compressed = view.getUint32(cursor + 20, true),
      size = view.getUint32(cursor + 24, true);
    total += size;
    if (
      total > 200 * 1024 * 1024 ||
      size > 100 * 1024 * 1024 ||
      size > Math.max(1, compressed) * 1000
    )
      throw new Error("工作簿解压后过大或压缩比异常，请拆分数据。");
    cursor +=
      46 +
      view.getUint16(cursor + 28, true) +
      view.getUint16(cursor + 30, true) +
      view.getUint16(cursor + 32, true);
  }
}
export function parseFile(buffer, name, options = {}) {
  if (!buffer.byteLength) throw new Error("文件为空。");
  if (buffer.byteLength > 40 * 1024 * 1024)
    throw new Error("文件超过 40 MB，请拆分后重试。");
  const b = new Uint8Array(buffer),
    zip = b[0] === 80 && b[1] === 75;
  if (/\.xlsx?$/i.test(name)) {
    if (/\.xlsx$/i.test(name) && !zip) throw new Error("文件内容不是有效的 XLSX（ZIP）格式。");
    if (/\.xls$/i.test(name) && !(zip || (b[0]===0xd0 && b[1]===0xcf))) throw new Error("文件内容不是有效的XLS格式。");
    if(zip) validateZip(buffer);
    let book;
    try {
      book = XLSX.read(buffer, {
        type: "array",
        cellDates: true,
        bookVBA: false,
        sheetRows: 1000002,
      });
    } catch {
      throw new Error("Excel 已损坏或不能读取。");
    }
    const sheets = book.SheetNames.flatMap((sheet) => {
      const ws = book.Sheets[sheet];
      if (
        ws["!fullref"] &&
        XLSX.utils.decode_range(ws["!fullref"]).e.r > 1000000
      )
        throw new Error("工作表超过 1,000,000 行，请拆分；没有静默截断。");
      const matrix = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: null,
        raw: true,
        blankrows: false,
      });
      return matrix.length > 1 ? [{ name: sheet, ...table(matrix) }] : [];
    });
    if (!sheets.length) throw new Error("工作簿没有包含数据行的工作表。");
    return { sheets };
  }
  if (!/\.csv$/i.test(name)) throw new Error("仅支持 .xlsx、.xls 和 .csv 文件。");
  if (zip || b.includes(0)) throw new Error("文件内容不是文本 CSV。");
  let text;
  try {
    text = new TextDecoder(options.encoding || "utf-8", { fatal: true }).decode(
      buffer,
    );
  } catch {
    throw new Error("编码不匹配，请尝试 GB18030。");
  }
  const result = Papa.parse(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    delimiter: options.delimiter || "",
    dynamicTyping: false,
  });
  if (result.errors.some((e) => e.code === "MissingQuotes"))
    throw new Error("CSV 引号不完整。");
  if (result.data.length > 1000001)
    throw new Error("CSV 超过 1,000,000 行，请拆分后导入。");
  if (result.data.slice(1).some((r) => r.length !== result.data[0].length))
    throw new Error("CSV 行列数不一致，请检查分隔符或缺失的引号。");
  return { sheets: [{ name: "CSV", ...table(result.data) }] };
}
export function duplicateCount(rows, headers) {
  let s = new Set(),
    n = 0;
  for (const r of rows) {
    let k = JSON.stringify(headers.map((h) => r[h]));
    if (s.has(k)) n++;
    else s.add(k);
  }
  return n;
}
export function clean(rows, headers, action) {
  if (action === "deduplicate") {
    let s = new Set();
    return rows.filter((r) => {
      let k = JSON.stringify(headers.map((h) => r[h]));
      if (s.has(k)) return false;
      s.add(k);
      return true;
    });
  }
  if (action === "dropMissing")
    return rows.filter((r) => headers.every((h) => !isMissing(r[h])));
  if (action === "trim")
    return rows.map((r) =>
      Object.fromEntries(
        headers.map((h) => [h, typeof r[h] === "string" ? r[h].trim() : r[h]]),
      ),
    );
  throw new Error("未知清洗操作");
}
export function niceAxis(values, { zero = false, log = false } = {}) {
  const { min: lo, max: hi, count } = summary(values);
  if (!count) return {};
  if (log) {
    if (lo <= 0)
      throw new Error(
        "对数轴需要全部数值大于 0。请改用线性轴，原始数据没有被删除。",
      );
    const min = 10 ** Math.floor(Math.log10(lo)),
      max = 10 ** Math.ceil(Math.log10(hi));
    return { min, max: max === min ? max * 10 : max };
  }
  let min = zero ? Math.min(0, lo) : lo,
    max = zero ? Math.max(0, hi) : hi;
  let range = max - min || Math.abs(max) * 0.2 || 1;
  if (!zero) {
    min -= range * 0.06;
    max += range * 0.06;
  } else {
    if (min < 0) min -= range * 0.06;
    if (max > 0) max += range * 0.06;
  }
  const rough = (max - min) / 6 || 1,
    mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].find((x) => x * mag >= rough) * mag;
  return {
    min: Math.floor(min / step) * step,
    max: Math.ceil(max / step) * step,
    interval: step,
  };
}
export function recommend(columns) {
  const nums = columns.filter((c) =>
      ["number", "percent", "currency"].includes(c.type),
    ),
    date = columns.find((c) => c.type === "date"),
    text = columns.find((c) => c.type === "text");
  return date && nums.length
    ? {
        type: "line",
        x: date.name,
        y: [nums[0].name],
        reason: "日期 + 数值字段：折线图适合观察趋势。",
      }
    : nums.length >= 2
      ? {
          type: "scatter",
          x: nums[0].name,
          y: [nums[1].name],
          reason: "两个连续变量：散点图保留真实 X 坐标，便于分析关系。",
        }
      : text && nums.length
        ? {
            type: "bar",
            x: text.name,
            y: [nums[0].name],
            reason: "类别 + 数值字段：柱状图适合比较。重复类别默认求和。",
          }
        : nums.length
          ? {
              type: "histogram",
              x: nums[0].name,
              y: [nums[0].name],
              reason: "单一数值变量：直方图展示频数分布。",
            }
          : {
              type: "bar",
              x: columns[0]?.name,
              y: [],
              reason: "需要至少一个数值字段才能绘图。",
            };
}
export function pairs(rows, x, y, columns, dateFormat = "auto") {
  let col = columns.find((c) => c.name === x),
    numeric = col?.type !== "text";
  return rows
    .map((r) => [
      col?.type === "date"
        ? dateValue(r[x], dateFormat)
        : numeric
          ? number(r[x])
          : r[x],
      number(r[y]),
    ])
    .filter((p) => p[0] !== null && !isMissing(p[0]) && p[1] !== null);
}
export function downsample(data, limit = 3000) {
  if (data.length <= limit) return data;
  // Envelope sampling: preserve first/last and both extrema within each bucket.
  const out = [data[0]],
    width = Math.ceil((data.length - 2) / Math.floor((limit - 2) / 2));
  for (let i = 1; i < data.length - 1; i += width) {
    let min = i,
      max = i;
    for (let j = i; j < Math.min(i + width, data.length - 1); j++) {
      if (data[j][1] < data[min][1]) min = j;
      if (data[j][1] > data[max][1]) max = j;
    }
    for (const j of [...new Set([min, max])].sort((a, b) => a - b))
      out.push(data[j]);
  }
  out.push(data.at(-1));
  return out;
}
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q,
    i = Math.floor(pos);
  return sorted[i] + (sorted[Math.ceil(pos)] - sorted[i]) * (pos - i);
}
export function distribution(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { bins: [], box: [], outliers: [] };
  const [min, max] = [v[0], v.at(-1)],
    binsN = Math.min(50, Math.ceil(Math.sqrt(v.length))),
    width = (max - min) / binsN || 1;
  const bins = Array.from({ length: max === min ? 1 : binsN }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }));
  for (const x of v)
    bins[Math.min(bins.length - 1, Math.floor((x - min) / width))].count++;
  const q1 = quantile(v, 0.25),
    q3 = quantile(v, 0.75),
    iqr = q3 - q1,
    inliers = v.filter((x) => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
  return {
    bins,
    box: [inliers[0], q1, quantile(v, 0.5), q3, inliers.at(-1)],
    outliers: v.filter((x) => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr),
  };
}
export const MODEL_REGISTRY = {
  exponential: {
    name: "指数拟合（对数线性）",
    kind: "Regression",
    condition: "至少3个点；Y>0；乘性误差假设",
  },
  linear: {
    name: "线性回归",
    kind: "Regression",
    degree: 1,
    condition: "≥3 个有效数值点；X 有变异",
  },
  polynomial: {
    name: "二次多项式",
    kind: "Regression",
    degree: 2,
    condition: "≥4 个有效点；至少3个不同 X",
  },
  piecewise: {
    name: "分段线性插值",
    kind: "Interpolation",
    condition: "≥2 个不同 X；不外推",
  },
  pchip: {
    name: "PCHIP 保形插值",
    kind: "Interpolation",
    condition: "≥2 个不同 X；不外推",
  },
  moving: {
    name: "移动平均",
    kind: "Smoothing",
    condition: "完整窗口；按 X 排序，重复 X 拒绝",
  },
};
export function regression(data, degree = 1) {
  if (![1, 2, 3].includes(degree) || data.length < degree + 2)
    throw new Error("低阶拟合仅支持 1–3 阶，且样本数必须大于参数数。");
  if (data.some((p) => p.some((v) => !Number.isFinite(v))))
    throw new Error("拟合只接受有效数值。");
  const xs = data.map((p) => p[0]),
    stats = summary(xs),
    center = stats.mean,
    scale = Math.max(
      Math.abs(stats.min - center),
      Math.abs(stats.max - center),
      1e-100,
    );
  // Modified Gram-Schmidt QR in a centered/scaled basis, no normal equation inversion.
  const n = data.length,
    m = degree + 1,
    Q = [],
    R = Array.from({ length: m }, () => Array(m).fill(0));
  for (let j = 0; j < m; j++) {
    let v = xs.map((x) => ((x - center) / scale) ** j);
    for (let k = 0; k < j; k++) {
      R[k][j] = v.reduce((s, a, i) => s + a * Q[k][i], 0);
      v = v.map((a, i) => a - R[k][j] * Q[k][i]);
    }
    R[j][j] = Math.hypot(...v.slice(0, 5000));
    if (n > 5000) R[j][j] = Math.sqrt(v.reduce((s, a) => s + a * a, 0));
    if (R[j][j] < 1e-10) throw new Error("X 值重复或矩阵退化，无法可靠拟合。");
    Q.push(v.map((a) => a / R[j][j]));
  }
  const b = Q.map((q) => q.reduce((s, a, i) => s + a * data[i][1], 0)),
    coefficients = Array(m).fill(0);
  for (let j = m - 1; j >= 0; j--)
    coefficients[j] =
      (b[j] -
        R[j]
          .slice(j + 1)
          .reduce((s, a, k) => s + a * coefficients[j + k + 1], 0)) /
      R[j][j];
  const predict = (x) =>
      coefficients.reduce((s, c, i) => s + c * ((x - center) / scale) ** i, 0),
    mean = summary(data.map((p) => p[1])).mean;
  const residuals = data.map(([x, y]) => [x, y - predict(x)]),
    sse = residuals.reduce((s, p) => s + p[1] ** 2, 0),
    sst = data.reduce((s, p) => s + (p[1] - mean) ** 2, 0);
  return {
    coefficients,
    center,
    scale,
    predict,
    residuals,
    r2: sst === 0 ? null : 1 - sse / sst,
    rmse: Math.sqrt(sse / n),
    mae: residuals.reduce((s, p) => s + Math.abs(p[1]), 0) / n,
    formula: `ŷ = ${coefficients.map((c, i) => `${c.toPrecision(6)}${i ? `·z${i > 1 ? `^${i}` : ""}` : ""}`).join(" + ")}; z = (x − ${center.toPrecision(6)}) / ${scale.toPrecision(6)}`,
  };
}
export function fit(data, id, window = 5) {
  if (id === "exponential") return exponential(data);
  if (!Object.hasOwn(MODEL_REGISTRY, id)) throw new Error("模型未注册。");
  const sorted = data.slice().sort((a, b) => a[0] - b[0]);
  if (sorted.length < 2) throw new Error("至少需要两个有效点。");
  if (id === "linear" || id === "polynomial") {
    const reg = regression(sorted, id === "linear" ? 1 : 2),
      min = sorted[0][0],
      max = sorted.at(-1)[0];
    return {
      ...reg,
      id,
      kind: "Regression",
      curve: Array.from({ length: 201 }, (_, i) => {
        let x = min + ((max - min) * i) / 200;
        return [x, reg.predict(x)];
      }),
      warning: "描述性拟合，不构成预测或因果证据。",
    };
  }
  if (sorted.some((p, i) => i && p[0] === sorted[i - 1][0]))
    throw new Error("插值/平滑需要唯一 X。请先按业务语义处理重复 X。");
  if (id === "moving") {
    if (!Number.isInteger(window) || window < 2 || window > sorted.length)
      throw new Error("窗口应为 2 到样本数之间的整数。");
    let sum = 0;
    return {
      id,
      kind: "Smoothing",
      curve: sorted.flatMap(([x, y], i) => {
        sum += y;
        if (i >= window) sum -= sorted[i - window][1];
        return i >= window - 1 ? [[x, sum / window]] : [];
      }),
      formula: `尾随移动平均，窗口 ${window}`,
      warning: "平滑结果不是原始观测；按 X 排序，窗口以样本数计。",
    };
  }
  const n = sorted.length,
    h = [],
    d = [],
    s = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(sorted[i + 1][0] - sorted[i][0]);
    d.push((sorted[i + 1][1] - sorted[i][1]) / h[i]);
  }
  s[0] = d[0];
  s[n - 1] = d[n - 2];
  if (n > 2) {
    const edge = (h0, h1, d0, d1) => {
      let t = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
      if (Math.sign(t) !== Math.sign(d0)) return 0;
      if (Math.sign(d0) !== Math.sign(d1) && Math.abs(t) > 3 * Math.abs(d0))
        return 3 * d0;
      return t;
    };
    s[0] = edge(h[0], h[1], d[0], d[1]);
    s[n - 1] = edge(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }
  for (let i = 1; i < n - 1; i++) {
    const w1 = 2 * h[i] + h[i - 1],
      w2 = h[i] + 2 * h[i - 1];
    s[i] = d[i - 1] * d[i] <= 0 ? 0 : (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  }
  const curve = [];
  for (let i = 0; i < n - 1; i++) {
    const steps = Math.max(1, Math.ceil(200 / (n - 1)));
    for (let k = 0; k < steps; k++) {
      let t = k / steps,
        x = sorted[i][0] + t * h[i],
        y =
          id === "piecewise"
            ? sorted[i][1] + t * (sorted[i + 1][1] - sorted[i][1])
            : (2 * t ** 3 - 3 * t * t + 1) * sorted[i][1] +
              (t ** 3 - 2 * t * t + t) * h[i] * s[i] +
              (-2 * t ** 3 + 3 * t * t) * sorted[i + 1][1] +
              (t ** 3 - t * t) * h[i] * s[i + 1];
      curve.push([x, y]);
    }
  }
  curve.push(sorted.at(-1));
  return {
    id,
    kind: "Interpolation",
    curve,
    formula: id === "pchip" ? "分段三次 Hermite 保形插值" : "相邻点间线性插值",
    warning: "插值通过观测点；仅限观测范围内，不用于推断预测质量。",
  };
}
export function compareModels(data) {
  if (data.length < 10) throw new Error("模型比较至少需要 10 个点。");
  // Contiguous held-out blocks; avoids random leakage on ordered series.
  return [1, 2]
    .map((degree) => {
      const errors = [];
      for (let fold = 0; fold < 5; fold++) {
        const a = Math.floor((data.length * fold) / 5),
          b = Math.floor((data.length * (fold + 1)) / 5),
          train = data.filter((_, i) => i < a || i >= b),
          test = data.slice(a, b),
          model = regression(train, degree);
        errors.push(...test.map(([x, y]) => (y - model.predict(x)) ** 2));
      }
      const result = regression(data, degree);
      return {
        id: degree === 1 ? "linear" : "polynomial",
        parameters: degree + 1,
        cvRmse: Math.sqrt(errors.reduce((s, e) => s + e, 0) / errors.length),
        rmse: result.rmse,
        r2: result.r2,
      };
    })
    .sort((a, b) => a.cvRmse - b.cvRmse || a.parameters - b.parameters);
}
export const FORMULA_REGISTRY = {
  cumulativeReturn: {
    name: "累计收益率",
    domain: "金融",
    definition: "P[t] / P[0] − 1",
    units: "比率",
    condition: "正价格、有效首值，确认口径与频率",
    missing: "缺失位置为空；不改动基准",
  },
  volatility: {
    name: "年化波动率",
    domain: "金融",
    definition: "s(simple returns) × sqrt(periodsPerYear)",
    units: "年化比率",
    condition: "明确每年期数、价格口径及频率",
    missing: "仅使用有效相邻收益率；全列估计重复展示",
  },
  maximumDrawdown: {
    name: "历史最大回撤",
    domain: "金融",
    definition: "min(s≤t) [ P[s] / max(u≤s) P[u] − 1 ]",
    units: "非正比率",
    condition: "正价格、按时间排序，确认口径",
    missing: "缺失位置为空；已有峰值保留",
  },
  cagr: {
    name: "复合年增长率 CAGR",
    domain: "金融",
    definition: "(P[end] / P[start])^(1 / years) − 1",
    units: "年化比率",
    condition: "明确年数；有效首尾正价格",
    missing: "首尾缺失时拒绝；全列估计重复展示",
  },
  difference: {
    name: "一阶差分",
    domain: "通用",
    definition: "y[t] − y[t−1]",
    units: "同输入",
    condition: "相邻两项有效",
    missing: "缺失或前值缺失输出空值",
  },
  percentChange: {
    name: "变化率 / 简单收益率",
    domain: "通用 / 金融",
    definition: "P[t] / P[t−1] − 1",
    units: "比率",
    condition: "前值非零；金融价格须为正",
    missing: "首项及无效相邻项为空",
  },
  logReturn: {
    name: "对数收益率",
    domain: "金融",
    definition: "ln(P[t] / P[t−1])",
    units: "无量纲",
    condition: "价格均为正；用户确认口径和频率",
    missing: "首项及无效相邻项为空",
  },
  cumulative: {
    name: "累计求和",
    domain: "通用",
    definition: "Σ y[i], i≤t",
    units: "同输入",
    condition: "有效数值",
    missing: "缺失位置为空；后续继续累计",
  },
  movingAverage: {
    name: "移动平均",
    domain: "通用",
    definition: "Σ y[t−i] / n",
    units: "同输入",
    condition: "完整 n 项窗口",
    missing: "不完整窗口为空",
  },
  standardDeviation: {
    name: "样本标准差",
    domain: "统计",
    definition: "sqrt(Σ(y−mean)²/(n−1))",
    units: "同输入",
    condition: "≥2 个有效数值",
    missing: "忽略空值；每行返回全列标准差",
  },
  normalize: {
    name: "Min–Max 归一化",
    domain: "统计",
    definition: "(y−min)/(max−min)",
    units: "无量纲",
    condition: "非常量数值列",
    missing: "缺失位置为空",
  },
  zscore: {
    name: "Z-Score",
    domain: "统计",
    definition: "(y−mean)/s",
    units: "无量纲",
    condition: "样本标准差非零",
    missing: "缺失位置为空",
  },
};
export function calculate(values, id, params = {}) {
  if (!Object.hasOwn(FORMULA_REGISTRY, id)) throw new Error("公式未注册。");
  if (
    ["cumulativeReturn", "volatility", "maximumDrawdown", "cagr"].includes(id)
  )
    return financial(values, id, params);
  const nums = values.map(number),
    stats = summary(nums),
    window = Number(params.window || 5);
  if (
    (id === "normalize" && stats.max === stats.min) ||
    (id === "zscore" && !stats.std)
  )
    throw new Error("常量列或样本不足，不能归一化/标准化。");
  if (
    id === "movingAverage" &&
    (!Number.isInteger(window) || window < 2 || window > nums.length)
  )
    throw new Error("移动平均窗口无效。");
  if (id === "logReturn" && nums.some((v) => v !== null && v <= 0))
    throw new Error("对数收益率要求价格严格大于 0。");
  let sum = 0;
  return nums.map((v, i) => {
    if (v === null) return null;
    const prev = nums[i - 1];
    switch (id) {
      case "difference":
        return i && prev !== null ? v - prev : null;
      case "percentChange":
        return i && prev !== null && prev !== 0 ? v / prev - 1 : null;
      case "logReturn":
        return i && prev !== null ? Math.log(v / prev) : null;
      case "cumulative":
        sum += v;
        return sum;
      case "standardDeviation":
        return stats.std;
      case "normalize":
        return (v - stats.min) / (stats.max - stats.min);
      case "zscore":
        return (v - stats.mean) / stats.std;
      case "movingAverage": {
        const chunk = nums.slice(i - window + 1, i + 1);
        return i >= window - 1 && chunk.every((x) => x !== null)
          ? chunk.reduce((s, x) => s + x, 0) / window
          : null;
      }
      default:
        return null;
    }
  });
}
export function validatePlan(plan, headers) {
  if (
    !plan ||
    typeof plan !== "object" ||
    Object.keys(plan).some(
      (k) =>
        ![
          "chart",
          "x",
          "y",
          "formula",
          "model",
          "explanation",
          "assumptions",
          "questions",
        ].includes(k),
    )
  )
    throw new Error("非法分析计划结构。");
  if (
    ![
      "line",
      "scatter",
      "bar",
      "area",
      "histogram",
      "box",
      "hbar",
      "heatmap",
      "pie",
      "donut",
      "bubble",
      "multi",
      "correlation",
      "errorbar",
    ].includes(plan.chart) ||
    !headers.includes(plan.x) ||
    !Array.isArray(plan.y) ||
    !plan.y.length ||
    !plan.y.every((y) => headers.includes(y))
  )
    throw new Error("非法图表或字段。");
  if (
    (plan.formula !== null && !Object.hasOwn(FORMULA_REGISTRY, plan.formula)) ||
    (plan.model !== null && !Object.hasOwn(MODEL_REGISTRY, plan.model))
  )
    throw new Error("计划包含未注册公式或模型。");
  if (typeof plan.explanation !== "string" || plan.explanation.length > 2000)
    throw new Error("说明无效。");
  for (const k of ["assumptions", "questions"])
    if (
      plan[k] !== undefined &&
      (!Array.isArray(plan[k]) ||
        plan[k].length > 10 ||
        plan[k].some((s) => typeof s !== "string" || s.length > 400))
    )
      throw new Error("计划假设或待确认信息无效");
  return plan;
}
