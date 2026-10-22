import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  parseFile,
  infer,
  number,
  dateValue,
  summary,
  duplicateCount,
  clean,
  niceAxis,
  recommend,
  pairs,
  downsample,
  distribution,
  regression,
  fit,
  calculate,
  compareModels,
  validatePlan,
  validateZip,
} from "../src/engine.js";
import { chartOption } from "../src/chart.js";
const buffer = (s) => new TextEncoder().encode(s).buffer;
describe("file parsing and inference", () => {
  it("rejects oversized decompressed workbook before parsing", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([["X"], [1]]),
      "Sheet1",
    );
    const ab = XLSX.write(wb, { type: "array", bookType: "xlsx" }),
      v = new DataView(ab);
    for (let i = 0; i < ab.byteLength - 46; i++)
      if (v.getUint32(i, true) === 0x02014b50) {
        v.setUint32(i + 24, 101 * 1024 * 1024, true);
        break;
      }
    expect(() => validateZip(ab)).toThrow(/解压/);
  });
  it("parses real multi-sheet XLSX, Chinese fields and dates", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["日期", "收入"],
        [new Date("2025-12-31"), 100],
        [new Date("2026-01-01"), 120],
      ]),
      "销售",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["X", "Y"],
        [1, 2],
        [3, 6],
      ]),
      "实验",
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), "空表");
    const r = parseFile(
      XLSX.write(wb, { type: "array", bookType: "xlsx" }),
      "data.xlsx",
    );
    expect(r.sheets).toHaveLength(2);
    expect(infer(r.sheets[0].rows, r.sheets[0].headers)[0].type).toBe("date");
    expect(r.sheets[1].rows[1].Y).toBe(6);
  });
  it("CSV currency, percent, missing and duplicates", () => {
    const { rows, headers } = parseFile(
      buffer(
        '日期,价格,占比,组\n2025-12-31,"$1,200",12%,A\n2026-01-01,,15%,B\n2026-01-01,,15%,B',
      ),
      "a.csv",
    ).sheets[0];
    const cols = infer(rows, headers);
    expect(cols.map((c) => c.type)).toEqual([
      "date",
      "currency",
      "percent",
      "text",
    ]);
    expect(cols[1].missing).toBe(2);
    expect(duplicateCount(rows, headers)).toBe(1);
    expect(number("$1,200")).toBe(1200);
    expect(number("12%")).toBe(0.12);
  });
  it("supports separator and duplicate headers", () => {
    const r = parseFile(buffer("A;A\n1;2"), "a.csv", { delimiter: ";" })
      .sheets[0];
    expect(r.headers).toEqual(["A", "A (2)"]);
  });
  it("rejects empty, header-only, corrupted, disguised and ragged files", () => {
    for (const [content, name] of [
      ["", "x.csv"],
      ["a,b\n", "x.csv"],
      ["fake", "x.xlsx"],
      ["a,b\n1,2,3", "x.csv"],
      ['a,b\n"oops,2', "x.csv"],
    ])
      expect(() => parseFile(buffer(content), name)).toThrow();
    expect(() =>
      parseFile(new Uint8Array([80, 75, 0, 1]).buffer, "x.xlsx"),
    ).toThrow();
  });
  it("rejects wrong CSV encoding and honors manual dates", () => {
    expect(() => parseFile(new Uint8Array([255, 255]).buffer, "x.csv")).toThrow(
      /编码/,
    );
    expect(dateValue("31/12/2025", "DMY")).toBe(Date.UTC(2025, 11, 31));
    expect(dateValue("2025-02-30")).toBe(null);
    expect(dateValue("12/31/2025", "MDY")).toBe(Date.UTC(2025, 11, 31));
  });
  it("allows manual type correction with invalid count", () => {
    const c = infer([{ v: "oops" }, { v: "4" }], ["v"], { v: "number" });
    expect(c[0].invalid).toBe(1);
  });
});
describe("statistics, cleaning and axes", () => {
  it("independently known sample standard deviation", () => {
    const s = summary([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.mean).toBe(5);
    expect(s.std).toBeCloseTo(Math.sqrt(32 / 7), 12);
  });
  it("does not overwrite original rows during transformations", () => {
    const rows = [
        { a: 1, b: null },
        { a: 1, b: null },
        { a: 2, b: " x " },
      ],
      copy = JSON.stringify(rows);
    expect(clean(rows, ["a", "b"], "deduplicate")).toHaveLength(2);
    expect(clean(rows, ["a", "b"], "dropMissing")).toHaveLength(1);
    expect(clean(rows, ["a", "b"], "trim")[2].b).toBe("x");
    expect(JSON.stringify(rows)).toBe(copy);
  });
  it("nice steps, padding, zero baseline and negative bars", () => {
    let a = niceAxis([13, 19]);
    expect(a.min).toBeLessThan(13);
    expect(a.max).toBeGreaterThan(19);
    expect(niceAxis([10, 20], { zero: true }).min).toBe(0);
    expect(niceAxis([-10, 20], { zero: true }).min).toBeLessThanOrEqual(-10);
  });
  it("rejects nonpositive log data without filtering", () => {
    expect(() => niceAxis([0, 1], { log: true })).toThrow(/对数/);
    expect(() => niceAxis([-1, 1], { log: true })).toThrow();
  });
  it("keeps positive constant logarithmic axes nondegenerate", () => {
    const a = niceAxis([100, 100], { log: true });
    expect(a.max).toBeGreaterThan(a.min);
  });
  it("keeps irregular X coordinates and cross-year dates", () => {
    const rows = [
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 9, y: 4 },
    ];
    expect(pairs(rows, "x", "y", infer(rows, ["x", "y"]))).toEqual([
      [1, 2],
      [2, 3],
      [9, 4],
    ]);
    expect(dateValue("2026-01-01") - dateValue("2025-12-31")).toBe(86400000);
  });
  it("preserves spikes and endpoints in display downsampling", () => {
    const data = Array.from({ length: 100000 }, (_, i) => [
        i,
        i === 51321 ? 1e9 : Math.sin(i),
      ]),
      sample = downsample(data);
    expect(sample.length).toBeLessThanOrEqual(3000);
    expect(sample.some((p) => p[1] === 1e9)).toBe(true);
    expect(sample[0]).toEqual(data[0]);
    expect(sample.at(-1)).toEqual(data.at(-1));
  });
  it("histogram counts all valid points and exposes box outliers", () => {
    const d = distribution([1, 2, 3, 4, 5, 100]);
    expect(d.bins.reduce((s, b) => s + b.count, 0)).toBe(6);
    expect(d.outliers).toEqual([100]);
  });
  it("recommends according to schema", () => {
    expect(
      recommend([
        { name: "t", type: "date" },
        { name: "v", type: "number" },
      ]).type,
    ).toBe("line");
    expect(
      recommend([
        { name: "a", type: "number" },
        { name: "b", type: "number" },
      ]).type,
    ).toBe("scatter");
  });
});
describe("registered models", () => {
  it("recovers an independently known exact linear equation", () => {
    const data = [0, 1, 2, 4, 9].map((x) => [x, 2 * x + 3]),
      m = regression(data);
    expect(m.predict(8)).toBeCloseTo(19, 11);
    expect(m.r2).toBeCloseTo(1, 12);
    expect(m.rmse).toBeLessThan(1e-12);
    expect(m.mae).toBeLessThan(1e-12);
  });
  it("polynomial reproduces known quadratic", () => {
    const data = [-4, -2, 0, 2, 3, 5].map((x) => [x, 3 * x * x - 2 * x + 7]),
      m = regression(data, 2);
    expect(m.predict(1.2)).toBeCloseTo(8.92, 10);
  });
  it("rejects degenerate/high order/insufficient samples", () => {
    expect(() =>
      regression(
        [
          [1, 2],
          [1, 3],
          [1, 4],
          [1, 5],
        ],
        2,
      ),
    ).toThrow();
    expect(() =>
      regression(
        [
          [0, 1],
          [1, 2],
        ],
        1,
      ),
    ).toThrow();
    expect(() =>
      regression(
        Array.from({ length: 10 }, (_, x) => [x, x]),
        8,
      ),
    ).toThrow();
  });
  it("handles large timestamp X stably", () => {
    const data = Array.from({ length: 20 }, (_, i) => [
        Date.UTC(2025, 0, i + 1),
        3 * i + 7,
      ]),
      m = regression(data);
    expect(m.predict(Date.UTC(2025, 0, 15))).toBeCloseTo(49, 10);
  });
  it("piecewise preserves discontinuity instead of smoothing", () => {
    const data = [
        [0, 0],
        [1, 0],
        [1.01, 100],
        [2, 100],
      ],
      m = fit(data, "piecewise");
    expect(m.kind).toBe("Interpolation");
    expect(m.curve.at(-1)).toEqual([2, 100]);
    expect(m.r2).toBeUndefined();
  });
  it("PCHIP is monotone without overshoot and matches endpoint", () => {
    const data = [
        [0, 0],
        [1, 1],
        [2, 1.1],
        [10, 5],
      ],
      m = fit(data, "pchip");
    expect(
      m.curve.every((p, i) => !i || p[1] >= m.curve[i - 1][1] - 1e-12),
    ).toBe(true);
    expect(m.curve.at(-1)).toEqual([10, 5]);
  });
  it("rejects duplicate X interpolation; smooths only full windows", () => {
    expect(() =>
      fit(
        [
          [1, 2],
          [1, 3],
        ],
        "pchip",
      ),
    ).toThrow(/唯一/);
    const m = fit(
      [
        [1, 2],
        [2, 4],
        [3, 6],
        [4, 8],
      ],
      "moving",
      3,
    );
    expect(m.curve).toEqual([
      [3, 4],
      [4, 6],
    ]);
    expect(m.kind).toBe("Smoothing");
  });
  it("compares validation error and complexity rather than R² only", () => {
    const results = compareModels(
      Array.from({ length: 40 }, (_, i) => [i, 2 * i + 3 + Math.sin(i) * 0.1]),
    );
    expect(results).toHaveLength(2);
    expect(results[0].cvRmse).toBeLessThanOrEqual(results[1].cvRmse);
    expect(results.every((m) => m.parameters >= 2)).toBe(true);
  });
});
describe("formula registry", () => {
  it("simple return and log return exact values", () => {
    expect(calculate([100, 110, 99], "percentChange")).toEqual([
      null,
      110 / 100 - 1,
      99 / 110 - 1,
    ]);
    const r = calculate([100, 110, 99], "logReturn");
    expect(r[0]).toBe(null);
    expect(r[1]).toBeCloseTo(Math.log(1.1), 14);
    expect(r[2]).toBeCloseTo(Math.log(0.9), 14);
  });
  it("financial conditions and zero denominator", () => {
    expect(() => calculate([100, 0, 20], "logReturn")).toThrow();
    expect(calculate([0, 10], "percentChange")).toEqual([null, null]);
    expect(calculate([1, null, 3], "difference")).toEqual([null, null, null]);
  });
  it("general transforms with independently known outputs", () => {
    expect(calculate([1, 2, 3], "difference")).toEqual([null, 1, 1]);
    expect(calculate([1, null, 3], "cumulative")).toEqual([1, null, 4]);
    expect(calculate([2, 4, 6], "movingAverage", { window: 2 })).toEqual([
      null,
      3,
      5,
    ]);
    expect(calculate([2, 4, 6], "normalize")).toEqual([0, 0.5, 1]);
    expect(calculate([2, 4, 6], "zscore")).toEqual([-1, 0, 1]);
    expect(calculate([2, 4, 6], "standardDeviation")).toEqual([2, 2, 2]);
    expect(() => calculate([2, 2], "normalize")).toThrow();
  });
});
describe("plan allowlists and charts", () => {
  const plan = {
    chart: "line",
    x: "x",
    y: ["y"],
    formula: null,
    model: "linear",
    explanation: "趋势分析",
  };
  it("accepts registered plans and rejects injected fields, models and code", () => {
    expect(validatePlan(plan, ["x", "y"])).toEqual(plan);
    for (const p of [
      { ...plan, model: "execute" },
      { ...plan, y: ["secret"] },
      { ...plan, code: "evil()" },
      { ...plan, formula: "__proto__" },
    ])
      expect(() => validatePlan(p, ["x", "y"])).toThrow();
  });
  it("builds all six real ECharts options", () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ x: i, y: i + 1 })),
      data = { rows, headers: ["x", "y"], columns: infer(rows, ["x", "y"]) },
      base = {
        x: "x",
        y: ["y"],
        theme: "Modern",
        grid: true,
        legend: true,
        precision: 2,
        xMin: "",
        xMax: "",
        yMin: "",
        yMax: "",
        tick: "",
        fontSize: 12,
      };
    for (const type of ["line", "scatter", "bar", "area", "histogram", "box"]) {
      const r = chartOption(data, { ...base, type });
      expect(r.option.series.length).toBeGreaterThan(0);
      expect(r.option.series[0].data.length).toBeGreaterThan(0);
    }
  });
  it("box five-number values are correctly aligned and rejects invalid custom axes", () => {
    const rows = [1, 2, 3, 4, 5].map((x) => ({ x, y: x })),
      data = { rows, columns: infer(rows, ["x", "y"]) },
      s = {
        type: "box",
        x: "x",
        y: ["y"],
        theme: "Modern",
        precision: 2,
        xMin: "",
        xMax: "",
        yMin: "",
        yMax: "",
        tick: "",
        fontSize: 12,
      };
    expect(chartOption(data, s).option.series[0].data[0]).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(() => chartOption(data, { ...s, tick: 0 })).toThrow(/间隔/);
    expect(() =>
      chartOption(data, { ...s, type: "scatter", xMin: 10, xMax: 2 }),
    ).toThrow(/X 坐标/);
  });
});
