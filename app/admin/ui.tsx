"use client";
import React, { useState, useEffect, useRef } from "react";
import "../../src/admin.css";
import '../../src/admin-responsive.css';
function Trend({ data }: { data: any[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let chart: any,
      disposed = false;
    import("echarts").then((e) => {
      if (disposed || !el.current) return;
      chart = e.init(el.current, null, { renderer: "svg" });
      chart.setOption({
        animation: false,
        color: ["#5955d8", "#16a397", "#df9e50"],
        tooltip: { trigger: "axis", renderMode: "richText" },
        legend: { bottom: 0 },
        grid: { left: 45, right: 20, top: 20, bottom: 65 },
        xAxis: {
          type: "category",
          data: data.map((v) => v.label),
          axisLabel: { hideOverlap: true, color: "#8f97aa" },
        },
        yAxis: {
          type: "value",
          min: 0,
          minInterval: 1,
          splitLine: { lineStyle: { color: "#eef0f6" } },
        },
        series: [
          ["浏览量", "pageViews"],
          ["图表生成", "charts"],
          ["成功导出", "exports"],
        ].map(([name, key]) => ({
          name,
          type: "line",
          data: data.map((v) => v[key]),
          smooth: false,
          showSymbol: data.length < 30,
        })),
      });
    });
    const resize = () => chart?.resize();
    window.addEventListener("resize", resize);
    return () => {
      disposed = true;
      chart?.dispose();
      window.removeEventListener("resize", resize);
    };
  }, [data]);
  return <div ref={el} style={{ height: 300 }} />;
}
const display = (n: any, pct = false) =>
  n === null || n === undefined
    ? "—"
    : pct
      ? (n * 100).toFixed(1) + "%"
      : Number(n).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
export default function AdminClient({ email }: { email: string }) {
  const [range, setRange] = useState("today"),
    [timezone, setTimezone] = useState("Asia/Shanghai"),
    [interval, setIntervalValue] = useState("hour"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [channel, setChannel] = useState("all");
  async function refresh() {
    if (range === "custom" && (!start || !end)) return;
    setBusy(true);
    try {
      const q = new URLSearchParams({
        range,
        channel,
        timezone,
        interval,
        ...(range === "custom" ? { start, end } : {}),
      });
      const r = await fetch("/api/admin?" + q, {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "统计查询失败");
      setData(b);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [range, timezone, interval, start, end,channel]);
  const metricDefs = [
    ["Today Visitors", "todayVisitors", "当前统计时区的今天"],
    ["Live Active Sessions", "liveSessions", "最近 5 分钟内有心跳或操作的会话"],
    ["Page Views", "pageViews", "选定时间范围"],
    ["Unique Visitors", "uniqueVisitors", "随机浏览器标识估计"],
    ["Chart Generations", "chartGenerations", "实际成功绘图事件"],
    ["Successful Exports", "successfulExports", "浏览器成功生成并触发下载"],
    [
      "Export Conversion Rate",
      "exportConversionRate",
      "有成功导出的会话 / 全部会话",
    ],
    [
      "Average Processing Time",
      "averageProcessingTime",
      "已完成处理事件的平均毫秒",
    ],
    ["System Error Rate", "systemErrorRate", "错误终态事件 / 处理终态事件"],
  ];
  return (
    <div className="admin-shell">
      <header>
        <a href="/" className="admin-brand">
          611<span>Studio</span>
          <b> / ChartSnap Operations</b>
        </a>
        <div>
          {email} <a href="/signout-with-chatgpt?return_to=%2F" target="_top">退出</a>
        </div>
      </header>
      <main>
        <div className="admin-heading">
          <div>
            <span className="admin-eyebrow">REAL EVENTS. CLEAR DECISIONS.</span>
            <h1>每一次使用，都有迹可循。</h1>
            <p>第一方、经同意的真实产品事件 · 不含用户表格或 AI 提示词</p>
          </div>
          <button onClick={refresh} disabled={busy}>
            {busy ? "正在刷新…" : "↻ 手动刷新"}
          </button>
        </div>
        <div className="admin-filters">
          <label>渠道 / 漏斗筛选<select aria-label="运营渠道筛选" value={channel} onChange={e=>setChannel(e.target.value)}><option value="all">全部渠道</option>{['Direct','Xiaohongshu','WeChat','Search Engines','Other Referrals','Campaign UTM'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>
            时间范围
            <select value={range} onChange={(e) => setRange(e.target.value)}>
              {[
                ["hour", "最近1小时"],
                ["today", "今天"],
                ["yesterday", "昨天"],
                ["7d", "最近7天"],
                ["30d", "最近30天"],
                ["custom", "自定义"],
              ].map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            统计时区
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {[
                "Asia/Shanghai",
                "UTC",
                "America/New_York",
                "Europe/London",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            趋势粒度
            <select
              value={interval}
              onChange={(e) => setIntervalValue(e.target.value)}
            >
              <option value="hour">小时</option>
              <option value="day">天</option>
              <option value="week">周</option>
            </select>
          </label>
          {range === "custom" && (
            <>
              <label>
                开始日期
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label>
                结束日期
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        {error && (
          <div role="alert" className="admin-error">
            统计服务异常：{error}。
            {data
              ? "下方保留最近一次成功数据，请查看更新时间。"
              : "当前没有可显示的数据，未填充模拟数字。"}
          </div>
        )}
        {!data && !error ? (
          <p>正在读取真实统计数据…</p>
        ) : (
          data && (
            <>
              <div className="admin-data-state">
                <span className={error ? "stale" : "live"}>
                  {error
                    ? "最近一次成功数据"
                    : data.state === "empty"
                      ? "暂无事件数据"
                      : "已读取真实数据"}
                </span>
                <span>
                  更新时间{" "}
                  {new Date(data.updatedAt).toLocaleString("zh-CN", {
                    timeZone: timezone,
                  })}{" "}
                  · 15 秒自动刷新
                </span>
                <span>
                  采集起始{" "}
                  {data.startedAt
                    ? new Date(data.startedAt).toLocaleString("zh-CN", {
                        timeZone: timezone,
                      })
                    : "尚无已同意事件"}
                </span>
              </div>
              {data.partial && (
                <div className="admin-error">
                  当前范围超过 50,000
                  事件显示上限，指标为部分记录统计。请缩短时间范围，勿作为完整报告。
                </div>
              )}
              <div className="admin-metrics">
                {metricDefs.map(([title, key, desc]) => (
                  <article key={key}>
                    <span>{title}</span>
                    <strong>
                      {display(data.metrics[key], key.endsWith("Rate"))}
                      {key === "averageProcessingTime" &&
                      data.metrics[key] !== null ? (
                        <small> ms</small>
                      ) : null}
                    </strong>
                    <p>{desc}</p>
                    <small>
                      {new Date(data.range.start).toLocaleString("zh-CN", {
                        timeZone: timezone,
                      })}{" "}
                      →{" "}
                      {new Date(data.range.end).toLocaleString("zh-CN", {
                        timeZone: timezone,
                      })}
                    </small>
                  </article>
                ))}
              </div>
              <section className="admin-card">
                <div className="admin-card-heading">
                  <h2>使用趋势</h2>
                  <span>
                    {timezone} · {interval}
                  </span>
                </div>
                {data.trend.length ? (
                  <Trend data={data.trend} />
                ) : (
                  <div className="admin-empty">
                    这个时间范围暂无已同意事件。没有生成示例统计。
                  </div>
                )}
              </section>
              <div className="admin-two">
                <section className="admin-card">
                  <h2>真实转化漏斗</h2>
                  <p>
                    按会话内事件先后顺序计算。拒绝统计或未产生完整前序事件的会话不会补造。
                  </p>
                  {data.funnel.map((s: any, i: number) => (
                    <div className="funnel-row" key={s.name}>
                      <span>
                        {
                          [
                            "访问",
                            "打开 Studio",
                            "上传成功",
                            "图表生成",
                            "成功导出",
                          ][i]
                        }
                      </span>
                      <div>
                        <i
                          style={{
                            width: `${data.funnel[0].count ? (s.count / data.funnel[0].count) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    <b title={`${s.count} 会话 / ${s.visitors} 访客估计`}>{s.count}</b>
                      <small>
                        {i
                          ? display(
                              data.funnel[i - 1].count
                                ? s.count / data.funnel[i - 1].count
                                : null,
                              true,
                            )
                          : "起点"}
                      </small>
                    </div>
                  ))}
                </section>
                <section className="admin-card">
                  <h2>功能与运行质量</h2>
                  <div className="admin-pair">
                    <span>新访客 / 回访访客（估计）</span>
                    <b>
                      {data.metrics.newVisitors} /{" "}
                      {data.metrics.returningVisitors}
                    </b>
                  </div>
                  <div className="admin-pair">
                    <span>AI 成功率</span>
                    <b>{display(data.metrics.aiSuccessRate, true)}</b>
                  </div>
                  {Object.entries(data.dimensions.feature).map(
                    ([name, n]: any) => (
                      <div className="admin-pair" key={name}>
                        <span>{name}</span>
                        <b>{n} 次图表生成</b>
                      </div>
                    ),
                  )}
                  <h3>错误类别</h3>
                  {Object.keys(data.dimensions.error).length ? (
                    Object.entries(data.dimensions.error).map(
                      ([name, n]: any) => (
                        <div className="admin-pair" key={name}>
                          <span>{name}</span>
                          <b>{n}</b>
                        </div>
                      ),
                    )
                  ) : (
                    <p>选定范围没有记录到处理错误。</p>
                  )}
                </section>
              </div>
              <section className="admin-card">
                <div className="admin-card-heading">
                  <h2>推广渠道</h2>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    <option value="all">全部渠道</option>
                    {data.dimensions.channel.map((v: any) => (
                      <option key={v.name}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "渠道",
                          "访客估计",
                          "会话",
                          "生成图表",
                          "成功导出",
                          "导出会话转化率",
                        ].map((n) => (
                          <th key={n}>{n}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.dimensions.channel
                        .filter(
                          (v: any) => channel === "all" || v.name === channel,
                        )
                        .map((v: any) => (
                          <tr key={v.name}>
                            <td>{v.name}</td>
                            <td>{v.visitors}</td>
                            <td>{v.sessions}</td>
                            <td>{v.charts}</td>
                            <td>{v.exports}</td>
                            <td>{display(v.conversion, true)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  小红书链接示例：/?utm_source=xiaohongshu&amp;utm_medium=social&amp;utm_campaign=launch。无法识别来源时保留
                  Direct / Other Referrals，不猜测身份。
                </p>
              </section>
              <div className="admin-two">
                {[
                  ["country", "国家/地区"],
                  ["device", "设备"],
                  ["os", "操作系统"],
                  ["browser", "浏览器"],
                ].map(([key, title]) => (
                  <section className="admin-card" key={key}>
                    <h2>{title}</h2>
                    {data.dimensions[key].length ? (
                      data.dimensions[key].map((v: any) => (
                        <div className="admin-pair" key={v.name}>
                          <span>{v.name}</span>
                          <b>
                            {v.visitors} 访客 · {v.sessions} 会话
                          </b>
                        </div>
                      ))
                    ) : (
                      <p>暂无数据</p>
                    )}
                  </section>
                ))}
              </div>
              <section className="admin-card">
                <h2>口径与覆盖范围</h2>
                <p>
                  只统计用户明确同意后的操作，非所有真实访客。UV
                  是匿名浏览器标识估计，不能推断年龄、性别、职业、收入或真实身份。Live
                  Active Sessions 为当前最近 5
                  分钟的会话，与所选历史范围不同。导出成功指浏览器生成并发起下载，无法确认用户最终保存文件。
                </p>
                <p>
                  数据源：自建第一方事件与 D1 持久存储；未同步 Sites 原生
                  Analytics，未配置 PostHog 或 Clarity。当前保留 90
                  天，日采集设有容量上限。累计保留事件：{data.totalEvents}。
                </p>
              </section>
            </>
          )
        )}
        <footer>
          © 2026 611 Studio · ChartSnap Operations · 管理 API
          每次请求均校验服务端身份
        </footer>
      </main>
    </div>
  );
}
