import {
  number,
  isMissing,
  dateValue,
  summary,
  quantile,
  regression,
} from "./engine.js";
export function transform(rows, headers, operation, p = {}) {
  const column = p.column,
    newName = p.name?.trim();
  if (!headers.includes(column) && !["merge"].includes(operation))
    throw new Error("请选择有效字段");
  const add = (name) => {
    if (!name || headers.includes(name) || name === "__proto__")
      throw new Error("新字段名为空或已存在");
  };
  if (operation === "filter") {
    const fn = (r) => {
      const v = r[column],
        n = number(v),
        a = number(p.value),
        b = number(p.end);
      switch (p.operator) {
        case "eq":
          return String(v ?? "") === String(p.value);
        case "contains":
          return String(v ?? "").includes(String(p.value));
        case "gt":
          return n !== null && a !== null && n > a;
        case "lt":
          return n !== null && a !== null && n < a;
        case "between":
          if (a === null || b === null || a > b)
            throw new Error("筛选区间无效");
          return n !== null && n >= a && n <= b;
        case "missing":
          return isMissing(v);
        case "present":
          return !isMissing(v);
        default:
          throw new Error("筛选条件无效");
      }
    };
    return { rows: rows.filter(fn), headers };
  }
  if (operation === "sort") {
    const direction = p.direction === "desc" ? -1 : 1,
      type = p.type || "text";
    return {
      rows: rows
        .map((r, i) => ({ r, i }))
        .sort((a, b) => {
          const av =
              type === "date"
                ? dateValue(a.r[column], p.dateFormat)
                : type === "text"
                  ? a.r[column]
                  : number(a.r[column]),
            bv =
              type === "date"
                ? dateValue(b.r[column], p.dateFormat)
                : type === "text"
                  ? b.r[column]
                  : number(b.r[column]);
          if (isMissing(av) && isMissing(bv)) return a.i - b.i;
          if (isMissing(av)) return 1;
          if (isMissing(bv)) return -1;
          return (
            direction *
              (type === "text"
                ? String(av).localeCompare(String(bv), "zh-CN")
                : av - bv) || a.i - b.i
          );
        })
        .map((v) => v.r),
      headers,
    };
  }
  if (operation === "merge") {
    add(newName);
    if (
      !Array.isArray(p.columns) ||
      p.columns.length < 2 ||
      !p.columns.every((c) => headers.includes(c))
    )
      throw new Error("请选择至少两个待合并字段");
    return {
      headers: [...headers, newName],
      rows: rows.map((r) => ({
        ...r,
        [newName]: p.columns
          .map((c) =>
            r[c] instanceof Date ? r[c].toISOString() : String(r[c] ?? ""),
          )
          .join(p.separator ?? " "),
      })),
    };
  }
  if (operation === "split") {
    if (!p.separator || p.separator.length > 20)
      throw new Error("拆分需要 1–20 字符的分隔符");
    const parts = rows.map((r) =>
      isMissing(r[column]) ? [] : String(r[column]).split(p.separator),
    );
    const size = parts.reduce((n, v) => Math.max(n, v.length), 0);
    if (size > 20 || !size) throw new Error("拆分结果为空或超过20列");
    const names = Array.from(
      { length: size },
      (_, i) => `${newName || column}_${i + 1}`,
    );
    names.forEach(add);
    return {
      headers: [...headers, ...names],
      rows: rows.map((r, i) => ({
        ...r,
        ...Object.fromEntries(names.map((n, j) => [n, parts[i][j] ?? null])),
      })),
    };
  }
  if (operation === "group") {
    if (
      !headers.includes(p.valueColumn) ||
      !["sum", "mean", "min", "max", "std", "count"].includes(p.aggregate)
    )
      throw new Error("分组参数无效");
    const groups = new Map();
    for (const r of rows) {
      const key = JSON.stringify(r[column] ?? null);
      if (!groups.has(key))
        groups.set(key, { group: r[column] ?? null, values: [] });
      const v = number(r[p.valueColumn]);
      if (v !== null) groups.get(key).values.push(v);
    }
    const output = `${p.valueColumn} · ${p.aggregate}`;
    return {
      headers: [column, output],
      rows: [...groups.values()].map((g) => {
        const s = summary(g.values),
          value =
            p.aggregate === "sum"
              ? g.values.length
                ? g.values.reduce((a, b) => a + b, 0)
                : null
              : p.aggregate === "count"
                ? s.count
                : s[p.aggregate];
        return { [column]: g.group, [output]: value };
      }),
    };
  }
  if (operation === "outliers") {
    const vals = rows
      .map((r) => number(r[column]))
      .filter((v) => v !== null)
      .sort((a, b) => a - b);
    if (vals.length < 4) throw new Error("异常值标记至少需要4个有效数值");
    const q1 = quantile(vals, 0.25),
      q3 = quantile(vals, 0.75),
      iqr = q3 - q1;
    const name = newName || `${column} · IQR异常`;
    add(name);
    return {
      headers: [...headers, name],
      rows: rows.map((r) => {
        const v = number(r[column]);
        return {
          ...r,
          [name]:
            v === null
              ? null
              : v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr
                ? "异常"
                : "正常",
        };
      }),
    };
  }
  throw new Error("未注册的数据操作");
}
export function pearson(a, b) {
  const p = a
    .map((v, i) => [number(v), number(b[i])])
    .filter((v) => v.every((x) => x !== null));
  if (p.length < 3) return { r: null, n: p.length };
  const sx = summary(p.map((v) => v[0])),
    sy = summary(p.map((v) => v[1]));
  if (!sx.std || !sy.std) return { r: null, n: p.length };
  const cov =
    p.reduce((s, [x, y]) => s + (x - sx.mean) * (y - sy.mean), 0) /
    (p.length - 1);
  return { r: Math.max(-1, Math.min(1, cov / (sx.std * sy.std))), n: p.length };
}
export function financial(values, id, p = {}) {
  const v = values.map(number);
  if (v.some((x) => x !== null && x <= 0))
    throw new Error("价格口径要求所有有效价格大于0");
  if (!p.confirmed) throw new Error("请先确认价格口径、频率和行顺序");
  if (id === "cumulativeReturn") {
    if (v[0] === null) throw new Error("累计收益率要求首项基准价格有效");
    return v.map((x) => (x === null ? null : x / v[0] - 1));
  }
  if (id === "maximumDrawdown") {
    let peak = -Infinity,
      worst = 0;
    return v.map((x) => {
      if (x === null) return null;
      peak = Math.max(peak, x);
      worst = Math.min(worst, x / peak - 1);
      return worst;
    });
  }
  if (id === "cagr") {
    const years = Number(p.years);
    if (
      !Number.isFinite(years) ||
      years <= 0 ||
      v[0] === null ||
      v.at(-1) === null
    )
      throw new Error("CAGR 需要有效首尾价格与明确的正数年数");
    const result = (v.at(-1) / v[0]) ** (1 / years) - 1;
    return v.map((x) => (x === null ? null : result));
  }
  if (id === "volatility") {
    const factor = Number(p.periods);
    if (!Number.isFinite(factor) || factor <= 0)
      throw new Error("年化波动率需要明确的每年期数");
    const returns = v.map((x, i) =>
      i && x !== null && v[i - 1] !== null ? x / v[i - 1] - 1 : null,
    );
    const s = summary(returns);
    if (!s.std && s.std !== 0)
      throw new Error("波动率至少需要两个相邻有效收益率样本");
    return v.map((x) => (x === null ? null : s.std * Math.sqrt(factor)));
  }
  throw new Error("未注册金融公式");
}
export function exponential(data) {
  if (data.length < 3 || data.some((p) => p[1] <= 0))
    throw new Error("指数拟合需要至少3个点，且Y严格为正");
  const log = regression(data.map(([x, y]) => [x, Math.log(y)])),
    predict = (x) => Math.exp(log.predict(x)),
    residuals = data.map(([x, y]) => [x, y - predict(x)]),
    ss = residuals.reduce((s, p) => s + p[1] ** 2, 0),
    mean = summary(data.map((p) => p[1])).mean,
    sst = data.reduce((s, p) => s + (p[1] - mean) ** 2, 0),
    xs = summary(data.map((p) => p[0]));
  return {
    id: "exponential",
    kind: "Regression",
    coefficients: log.coefficients,
    center: log.center,
    scale: log.scale,
    formula: `ŷ = exp(${log.coefficients[0].toPrecision(6)} + ${log.coefficients[1].toPrecision(6)}·z); z = (x − ${log.center.toPrecision(6)}) / ${log.scale.toPrecision(6)}`,
    curve: Array.from({ length: 201 }, (_, i) => {
      const x = xs.min + ((xs.max - xs.min) * i) / 200;
      return [x, predict(x)];
    }),
    residuals,
    r2: sst ? 1 - ss / sst : null,
    rmse: Math.sqrt(ss / data.length),
    mae: residuals.reduce((s, p) => s + Math.abs(p[1]), 0) / data.length,
    warning:
      "对数线性拟合，假设乘性误差；指标在原始Y空间计算。描述性结果，不外推。",
  };
}
