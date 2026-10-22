import React, { useState } from "react";
import { MODEL_REGISTRY } from "./engine.js";
export function WorkflowPanel({ data, onPreview, onHistory, busy }) {
  const [operation, setOperation] = useState("filter"),
    [column, setColumn] = useState(data.headers[0]),
    [operator, setOperator] = useState("between"),
    [value, setValue] = useState(""),
    [end, setEnd] = useState(""),
    [direction, setDirection] = useState("asc"),
    [name, setName] = useState(""),
    [separator, setSeparator] = useState(" "),
    [columns, setColumns] = useState([]),
    [valueColumn, setValueColumn] = useState(
      data.columns.find((c) => c.type === "number")?.name || data.headers[0],
    ),
    [aggregate, setAggregate] = useState("mean");
  const params = {
    column,
    operator,
    value,
    end,
    direction,
    name,
    separator,
    columns,
    valueColumn,
    aggregate,
    type: data.columns.find((c) => c.name === column)?.type || "text",
  };
  return (
    <section className="analysis-card workflow-panel">
      <span className="section-label">REVERSIBLE DATA WORKFLOW</span>
      <h3>整理、探索、随时回退。</h3>
      <p>
        所有步骤基于派生数据，原始工作表保留。变换前预览影响，最多保留最近10步撤销/重做；按条件筛选不会自动丢弃离群值。
      </p>
      <div className="button-row">
        <button
          className="btn small"
          disabled={!data.canUndo || busy}
          onClick={() => onHistory("undo")}
        >
          ↶ 撤销数据处理
        </button>
        <button
          className="btn small"
          disabled={!data.canRedo || busy}
          onClick={() => onHistory("redo")}
        >
          ↷ 重做数据处理
        </button>
      </div>
      <div className="form-grid">
        <L label="处理操作">
          <select
            aria-label="处理操作"
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
          >
            {[
              ["filter", "按条件筛选 / 数据范围"],
              ["sort", "稳定排序"],
              ["merge", "合并列（保留原列）"],
              ["split", "拆分列（保留原列）"],
              ["group", "分组统计"],
              ["outliers", "IQR 异常值标记"],
            ].map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </select>
        </L>
        <L label={operation === "group" ? "分组字段" : "处理字段"}>
          <select
            aria-label="处理字段"
            value={column}
            onChange={(e) => setColumn(e.target.value)}
          >
            {data.headers.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </L>
      </div>
      {operation === "filter" && (
        <div className="form-grid">
          <L label="筛选条件">
            <select
              aria-label="筛选条件"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            >
              {[
                ["between", "数值范围（含边界）"],
                ["gt", "大于"],
                ["lt", "小于"],
                ["eq", "等于文本"],
                ["contains", "包含文本"],
                ["missing", "仅空值"],
                ["present", "仅非空值"],
              ].map(([id, n]) => (
                <option key={id} value={id}>
                  {n}
                </option>
              ))}
            </select>
          </L>
          {!["missing", "present"].includes(operator) && (
            <L label={operator === "between" ? "下限" : "条件值"}>
              <input
                aria-label="筛选条件值"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </L>
          )}
          {operator === "between" && (
            <L label="上限">
              <input
                aria-label="筛选上限"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </L>
          )}
        </div>
      )}
      {operation === "sort" && (
        <L label="排序方向">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="asc">升序 · 空值在末尾</option>
            <option value="desc">降序 · 空值在末尾</option>
          </select>
        </L>
      )}
      {["merge", "split", "outliers"].includes(operation) && (
        <L label="新字段名 / 拆分前缀">
          <input
            aria-label="新字段名"
            placeholder="不覆盖原有字段"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </L>
      )}
      {["merge", "split"].includes(operation) && (
        <L label="分隔符">
          <input
            aria-label="分隔符"
            value={separator}
            onChange={(e) => setSeparator(e.target.value)}
          />
        </L>
      )}
      {operation === "merge" && (
        <div className="merge-columns">
          {data.headers.map((h) => (
            <label key={h}>
              <input
                type="checkbox"
                checked={columns.includes(h)}
                onChange={(e) =>
                  setColumns(
                    e.target.checked
                      ? [...columns, h]
                      : columns.filter((c) => c !== h),
                  )
                }
              />
              {h}
            </label>
          ))}
        </div>
      )}
      {operation === "group" && (
        <div className="form-grid">
          <L label="聚合数值字段">
            <select
              value={valueColumn}
              aria-label="聚合数值字段"
              onChange={(e) => setValueColumn(e.target.value)}
            >
              {data.columns
                .filter((c) =>
                  ["number", "currency", "percent"].includes(c.type),
                )
                .map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
            </select>
          </L>
          <L label="统计方法">
            <select
              aria-label="统计方法"
              value={aggregate}
              onChange={(e) => setAggregate(e.target.value)}
            >
              {[
                ["mean", "均值"],
                ["sum", "求和"],
                ["count", "有效值数量"],
                ["min", "最小值"],
                ["max", "最大值"],
                ["std", "样本标准差"],
              ].map(([id, n]) => (
                <option key={id} value={id}>
                  {n}
                </option>
              ))}
            </select>
          </L>
        </div>
      )}
      <div className="button-row">
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => onPreview(operation, params)}
        >
          预览处理影响 →
        </button>
      </div>
    </section>
  );
}
function L({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function ProMappings({ data, settings, update }) {
  return (
    <>
      {[
        ["bubble", "z", "气泡大小 Z 字段", true],
        ["heatmap", "categoryY", "分类 Y 字段", false],
        ["errorbar", "errorColumn", "误差半宽字段", true],
      ]
        .filter(([t]) => settings.type === t)
        .map(([t, k, l, numeric]) => (
          <L key={k} label={l}>
            <select
              aria-label={l}
              value={settings[k] || ""}
              onChange={(e) => update(k, e.target.value)}
            >
              <option value="">请选择字段</option>
              {data?.columns
                .filter(
                  (c) =>
                    !numeric ||
                    ["number", "currency", "percent"].includes(c.type),
                )
                .map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
            </select>
          </L>
        ))}
    </>
  );
}
export function ProStyle({ settings, update }) {
  return (
    <div className="pro-style">
      <L label="副标题">
        <input
          aria-label="副标题"
          value={settings.subtitle || ""}
          onChange={(e) => update("subtitle", e.target.value)}
        />
      </L>
      <L label="线型">
        <select
          aria-label="线型"
          value={settings.lineType}
          onChange={(e) => update("lineType", e.target.value)}
        >
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
        </select>
      </L>
      <L label="散点大小">
        <input
          aria-label="散点大小"
          type="number"
          placeholder="自动"
          min="0.2"
          step="0.1"
          max="30"
          value={settings.pointSize}
          onChange={(e) => update("pointSize", e.target.value === "" ? "" : Number(e.target.value))}
        />
      </L>
      <L label="标记形状">
        <select
          value={settings.symbol}
          onChange={(e) => update("symbol", e.target.value)}
        >
          {["circle", "emptyCircle", "rect", "diamond", "triangle", "pin"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </L>
      <L label="透明度">
        <input
          aria-label="透明度"
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={settings.opacity}
          onChange={(e) => update("opacity", Number(e.target.value))}
        />
      </L>
      <L label="图例位置">
        <select
          aria-label="图例位置"
          value={settings.legendPosition}
          onChange={(e) => update("legendPosition", e.target.value)}
        >
          <option value="top">顶部</option>
          <option value="bottom">底部</option>
          <option value="right">右侧</option>
        </select>
      </L>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={settings.dualY}
          onChange={(e) => update("dualY", e.target.checked)}
        />{" "}
        双 Y 轴（前两个 Y 使用独立比例）
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={settings.showModel}
          onChange={(e) => update("showModel", e.target.checked)}
        />{" "}
        显示模型曲线
      </label>
    </div>
  );
}
export function AskBar({ ai, prompt, setPrompt, onAsk, hasData, onUpload }) {
  return (
    <section className="ask-top">
      <div className="ask-top-label">
        <span>✦</span>
        <strong>Ask ChartSnap</strong>
        <small>{ai ? "AI 已连接" : "AI 尚未启用 · 611 Studio"}</small>
      </div>
      <div className="ask-top-input">
        <input
          aria-label="Ask ChartSnap 分析需求"
          value={prompt}
          placeholder="分析趋势、比较拟合模型、计算收益率，或描述你的研究问题…"
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          className="btn primary small"
          disabled={hasData ? !ai || !prompt : false}
          onClick={hasData ? onAsk : onUpload}
        >
          {hasData ? "生成分析计划" : "先导入数据"} ↗
        </button>
      </div>
      <p>
        {ai
          ? "发送摘要前须授权，方案通过注册表校验后由计算引擎执行。"
          : "真实模型未启用，当前不发送 AI 请求。可在“专业分析”使用经过验证的免费确定性工具。"}
      </p>
    </section>
  );
}
