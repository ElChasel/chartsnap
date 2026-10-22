import {
  parseFile,
  infer,
  duplicateCount,
  clean,
  calculate,
  fit,
  compareModels,
} from "./engine.js";
import { transform } from "./workflows.js";
import { selectRecords } from './plot-spec.js';
let book, current, rows, headers;
let past = [],
  future = [],
  steps = [],types={};
function checkpoint() {
  past.push({ rows, headers, steps,types });
  if (past.length > 10) past.shift();
  future = [];
}
self.onmessage = ({ data: m }) => {
  try {
    let result;
    if (m.type === "parse") {
      self.postMessage({ id: m.id, progress: "正在解析文件并识别字段…" });
      book = parseFile(m.buffer, m.name, m.options);
      current = 0;
      rows = book.sheets[0].rows;
      headers = book.sheets[0].headers;
      past = [];
      future = [];
      steps = [];
      types={};
    }
    if (m.type === "sheet") {
      current = m.index;
      rows = book.sheets[current].rows;
      headers = book.sheets[current].headers;
      past = [];
      future = [];
      steps = [];
      types={};
    }
    if (m.type === "reset") {
      checkpoint();
      steps = [];
      types={};
      rows = book.sheets[current].rows;
      headers = book.sheets[current].headers;
    }
    if (m.type === "cleanPreview") {
      const next = clean(rows, headers, m.action);
      result = {
        before: rows.length,
        after: next.length,
        changed: rows.reduce(
          (n, r, i) => n + (JSON.stringify(r) !== JSON.stringify(next[i])),
          0,
        ),
      };
    }
    if (m.type === "clean") {
      const next = clean(rows, headers, m.action);
      checkpoint();
      rows = next;
      steps = [...steps, { type: "clean", action: m.action }];
    }
    if (m.type === "formula") {
      const values = calculate(
          rows.map((r) => r[m.column]),
          m.formula,
          m.params,
        ),
        name = `${m.column} · ${m.formula}`;
      if (headers.includes(name))
        throw new Error("派生字段已存在，请恢复原始数据后重新计算。");
      checkpoint();
      rows = rows.map((r, i) => ({ ...r, [name]: values[i] }));
      headers = [...headers, name];
      steps = [
        ...steps,
        {
          type: "formula",
          column: m.column,
          formula: m.formula,
          params: m.params,
        },
      ];
    }
    if (m.type === "transformPreview") {
      const next = transform(rows, headers, m.operation, m.params);
      result = {
        before: rows.length,
        after: next.rows.length,
        columns: next.headers,
        preview: next.rows.slice(0, 5),
      };
    }
    if (m.type === "transform") {
      const next = transform(rows, headers, m.operation, m.params);
      checkpoint();
      rows = next.rows;
      headers = next.headers;
      steps = [
        ...steps,
        { type: "transform", operation: m.operation, params: m.params },
      ];
    }
    if (m.type === "undo" && past.length) {
      future.push({ rows, headers, steps,types });
      ({ rows, headers, steps,types } = past.pop());
    }
    if (m.type === "redo" && future.length) {
      past.push({ rows, headers, steps,types });
      ({ rows, headers, steps,types } = future.pop());
    }
    if (m.type === "replay") {
      if (
        !Array.isArray(m.steps) ||
        m.steps.length > 50 ||
        m.currentSheet !== current
      )
        throw new Error("配置步骤无效或工作表不匹配");
      let rr = book.sheets[current].rows,
        hh = book.sheets[current].headers;
      for (const step of m.steps) {
        if (step.type === "clean") rr = clean(rr, hh, step.action);
        else if (step.type === "transform") {
          const next = transform(rr, hh, step.operation, step.params || {});
          rr = next.rows;
          hh = next.headers;
        } else if (step.type === "formula") {
          if (!hh.includes(step.column)) throw new Error("配置引用不存在字段");
          const name = `${step.column} · ${step.formula}`;
          if (hh.includes(name)) throw new Error("配置派生字段重复");
          const vals = calculate(
            rr.map((r) => r[step.column]),
            step.formula,
            step.params || {},
          );
          rr = rr.map((r, i) => ({ ...r, [name]: vals[i] }));
          hh = [...hh, name];
        } else throw new Error("配置包含未注册步骤");
      }
      const nextTypes=m.overrides||{};infer(rr,hh,nextTypes,m.dateFormat);
      if(m.settings&&(!hh.includes(m.settings.x)||!Array.isArray(m.settings.y)||!m.settings.y.length||!m.settings.y.every(y=>hh.includes(y))))throw new Error('重放配置的图表字段无效，数据未修改');
      if(m.settings){const next={rows:rr,headers:hh,columns:infer(rr,hh,nextTypes,m.dateFormat)};selectRecords(next,m.settings.plotSelection,m.settings);selectRecords(next,m.settings.fitSelection,m.settings);}
      checkpoint();
      rows = rr;
      headers = hh;
      steps = m.steps;
      types=nextTypes;
    }
    if(m.type==='infer'&&m.overrides){checkpoint();types=m.overrides;}
    if (m.type === "fit") result = fit(m.pairs, m.model, m.window);
    if (m.type === "compare") result = compareModels(m.pairs);
    if (
      [
        "parse",
        "sheet",
        "reset",
        "clean",
        "formula",
        "infer",
        "transform",
        "undo",
        "redo",
        "replay",
      ].includes(m.type)
    )
      result = {
        rows,
        headers,
        columns: infer(rows, headers, types, m.dateFormat),
        sheets: book.sheets.map((s) => s.name),
        duplicates: duplicateCount(rows, headers),
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        steps,
        currentSheet: current,
      };
    // Functions aren't structured-cloneable.
    if (result?.predict) delete result.predict;
    self.postMessage({ id: m.id, result });
  } catch (e) {
    self.postMessage({ id: m.id, error: e.message });
  }
};
