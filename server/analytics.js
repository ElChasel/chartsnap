export const EVENT_NAMES = [
  "page_view",
  "studio_opened",
  "file_upload_started",
  "file_upload_succeeded",
  "file_upload_failed",
  "chart_generated",
  "chart_type_changed",
  "axis_adjusted",
  "fit_model_selected",
  "fit_completed",
  "formula_applied",
  "ai_analysis_requested",
  "ai_analysis_succeeded",
  "ai_analysis_failed",
  "export_png",
  "export_svg",
  "processing_error",
  "session_heartbeat",
  "purpose_submitted",
];
const charts = [
  "line",
  "scatter",
  "bar",
  "hbar",
  "area",
  "histogram",
  "box",
  "heatmap",
  "pie",
  "donut",
  "bubble",
  "correlation",
  "errorbar",
  "multi",
];
const propRules = {
  chart_type: charts,
  file_type: ["xlsx", "csv", "demo"],
  row_bucket: ["1-1000", "1001-10000", "10001-100000", "100000+"],
  duration_bucket: ["<100ms", "100ms-1s", "1s-3s", "3s-10s", "10s+"],
  error_category: [
    "parse",
    "validation",
    "compute",
    "export",
    "network",
    "timeout",
    "render",
    "unknown",
  ],
  model_id: [
    "linear",
    "polynomial",
    "exponential",
    "piecewise",
    "pchip",
    "moving",
  ],
  formula_id: [
    "difference",
    "percentChange",
    "logReturn",
    "cumulative",
    "movingAverage",
    "standardDeviation",
    "normalize",
    "zscore",
    "cumulativeReturn",
    "volatility",
    "maximumDrawdown",
    "cagr",
  ],
  purpose: ["research", "study", "business", "finance", "office", "other"],
};
const channelSet = [
  "Direct",
  "Xiaohongshu",
  "WeChat",
  "Search Engines",
  "Other Referrals",
  "Campaign UTM",
];
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
export { json };
function fail(message, status = 400) {
  return json({ error: message }, status);
}
function sameOrigin(req) {
  return req.headers.get("origin") === new URL(req.url).origin;
}
async function input(req, max = 12000) {
  if (Number(req.headers.get("content-length")) > max)
    throw new Error("请求过大");
  const text = await req.text();
  if (text.length > max) throw new Error("请求过大");
  return JSON.parse(text);
}
const encoder = new TextEncoder();
const base64 = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
async function mac(message, secret) {
  const k = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64(await crypto.subtle.sign("HMAC", k, encoder.encode(message)));
}
async function token(payload, secret) {
  const data = base64(encoder.encode(JSON.stringify(payload)));
  return data + "." + (await mac(data, secret));
}
async function untoken(value, secret) {
  try {
    const [data, sign] = value.split(".");
    const expected = await mac(data, secret);
    if (sign?.length !== expected.length) return null;
    let mismatch = 0;
    for (let i = 0; i < sign.length; i++)
      mismatch |= sign.charCodeAt(i) ^ expected.charCodeAt(i);
    if (mismatch) return null;
    const padded = data.replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}
function cookie(req) {
  return (
    req.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("cs_analytics="))
      ?.slice(13) || ""
  );
}
function safeEnum(value, values, fallback = "Unknown") {
  return values.includes(value) ? value : fallback;
}
export function adminIdentity(req, env) {
  const id = req.headers.get("oai-authenticated-user-id"),
    email = req.headers.get("oai-authenticated-user-email");
  if (!id || !email) return { status: 401 };
  const allowed = (env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length || !allowed.includes(email.toLowerCase()))
    return { status: 403 };
  return { status: 200, id, email };
}
export async function analyticsSession(req, env, now = Date.now()) {
  if (!sameOrigin(req)) return fail("仅接受同源请求", 403);
  if (!env.DB || !env.ANALYTICS_SECRET) return fail("统计服务尚未配置", 503);
  try {
    const body = await input(req, 1500);
    if (body.consent !== true || !/^[a-f0-9-]{36}$/.test(body.visitor || ""))
      return fail("需明确同意匿名统计");
    let current = await untoken(cookie(req), env.ANALYTICS_SECRET);
    if (current && current.exp > now) {
      const exists = await env.DB.prepare(
        "SELECT id FROM analytics_sessions WHERE id=?",
      )
        .bind(current.s)
        .first();
      if (exists)
        return json({
          enabled: true,
          session: current.s,
          expires: current.exp,
        });
    }
    const visitor = base64(
        await crypto.subtle.digest(
          "SHA-256",
          encoder.encode(env.ANALYTICS_SECRET + body.visitor),
        ),
      ),
      id = crypto.randomUUID(),
      country = /^[A-Z]{2}$/.test(req.headers.get("x-chartsnap-country") || "")
        ? req.headers.get("x-chartsnap-country")
        : "Unknown";
    const existing = await env.DB.prepare(
      "SELECT MIN(started_at) AS first_seen FROM analytics_sessions WHERE visitor_id=?",
    )
      .bind(visitor)
      .first();
    const record = { s: id, v: visitor, exp: now + 30 * 60 * 1000 };
    await env.DB.prepare(
      "INSERT INTO analytics_sessions (id,visitor_id,started_at,last_seen,channel,campaign,country,device,os,browser,`returning`,rate_window,rate_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        visitor,
        now,
        now,
        safeEnum(body.channel, channelSet, "Direct"),
        /^[a-zA-Z0-9_-]{1,64}$/.test(body.campaign || "") ? body.campaign : "",
        country,
        safeEnum(body.device, ["Desktop", "Mobile", "Tablet"]),
        safeEnum(body.os, ["Windows", "macOS", "Linux", "Android", "iOS"]),
        safeEnum(body.browser, [
          "Edge",
          "Chrome",
          "Firefox",
          "Safari",
          "Other",
        ]),
        existing?.first_seen ? 1 : 0,
        now,
        0,
      )
      .run();
    const signed = await token(record, env.ANALYTICS_SECRET),
      secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
    return json({ enabled: true, session: id, expires: record.exp }, 200, {
      "Set-Cookie": `cs_analytics=${signed}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${secure}`,
    });
  } catch (error) {
    console.error("analytics_session_failed", String(error?.message || "unknown").slice(0, 240));
    return fail("统计会话请求无效");
  }
}
export async function collectEvents(req, env, now = Date.now()) {
  if (!sameOrigin(req)) return fail("仅接受同源请求", 403);
  if (!env.DB || !env.ANALYTICS_SECRET) return fail("统计服务尚未配置", 503);
  const session = await untoken(cookie(req), env.ANALYTICS_SECRET);
  if (!session || session.exp <= now) return fail("统计会话已失效", 401);
  try {
    const body = await input(req);
    if (
      body.consent !== true ||
      !Array.isArray(body.events) ||
      body.events.length > 20
    )
      return fail("事件格式无效");
    const row = await env.DB.prepare(
      "SELECT * FROM analytics_sessions WHERE id=?",
    )
      .bind(session.s)
      .first();
    if (!row) return fail("统计会话无效", 401);
    const rate = now - row.rate_window < 60000 ? row.rate_count : 0;
    if (rate + body.events.length > 120) return fail("采集频率已超限", 429);
    const day = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM analytics_events WHERE ts>=?",
    )
      .bind(now - 86400000)
      .first();
    if (day.n >= Number(env.ANALYTICS_DAILY_LIMIT ?? 20000))
      return fail("今日采集额度已满", 429);
    const statements = [];
    for (const e of body.events) {
      if (
        Object.keys(e).some(
          (k) => !["id", "name", "properties", "duration_ms"].includes(k),
        ) ||
        !/^[a-f0-9-]{36}$/.test(e.id || "") ||
        !EVENT_NAMES.includes(e.name)
      )
        return fail("存在未允许的事件");
      const props = e.properties || {};
      for (const [k, v] of Object.entries(props))
        if (!propRules[k]?.includes(v)) return fail("存在未允许的事件属性");
      if (
        e.duration_ms !== undefined &&
        (!Number.isFinite(e.duration_ms) ||
          e.duration_ms < 0 ||
          e.duration_ms > 3600000)
      )
        return fail("耗时无效");
      if (e.name !== "session_heartbeat")
        statements.push(
          env.DB.prepare(
            "INSERT OR IGNORE INTO analytics_events (id,session_id,visitor_id,name,ts,properties,duration_ms) VALUES (?,?,?,?,?,?,?)",
          ).bind(
            e.id,
            session.s,
            session.v,
            e.name,
            now,
            JSON.stringify(props),
            e.duration_ms ?? null,
          ),
        );
    }
    statements.push(
      env.DB.prepare(
        "UPDATE analytics_sessions SET last_seen=?,rate_window=?,rate_count=? WHERE id=?",
      ).bind(
        now,
        now - row.rate_window < 60000 ? row.rate_window : now,
        rate + body.events.length,
        session.s,
      ),
    );
    // Bounded retention; no user data is stored here.
    statements.push(
      env.DB.prepare("DELETE FROM analytics_events WHERE ts<?").bind(
        now - 90 * 86400000,
      ),
    );
    statements.push(
      env.DB.prepare("DELETE FROM analytics_sessions WHERE last_seen<?").bind(
        now - 90 * 86400000,
      ),
    );
    await env.DB.batch(statements);
    return json({ accepted: body.events.length });
  } catch {
    return fail("事件请求无效");
  }
}
export function zonedDate(now, tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}
function midnight(day, tz) {
  const [y, m, d] = day.split("-").map(Number);
  let t = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(t))
        .map((x) => [x.type, x.value]),
    );
    const represented = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    t += Date.UTC(y, m - 1, d) - represented;
  }
  return t;
}
function dayShift(day, delta) {
  return new Date(Date.parse(day + "T00:00:00Z") + delta * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function timeRange(params, now = Date.now()) {
  const tz = params.get("timezone") || "Asia/Shanghai";
  new Intl.DateTimeFormat("en", { timeZone: tz }).format();
  const range = params.get("range") || "today",
    today = zonedDate(now, tz);
  let start,
    end = now;
  if (range === "hour") start = now - 3600000;
  else if (range === "today") start = midnight(today, tz);
  else if (range === "yesterday") {
    start = midnight(dayShift(today, -1), tz);
    end = midnight(today, tz);
  } else if (range === "7d" || range === "30d")
    start = midnight(dayShift(today, range === "7d" ? -6 : -29), tz);
  else if (range === "custom") {
    const a = params.get("start"),
      b = params.get("end");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(a || "") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b || "")
    )
      throw new Error("日期范围无效");
    start = midnight(a, tz);
    end = midnight(dayShift(b, 1), tz);
  } else throw new Error("时间范围无效");
  if (
    start >= end ||
    end - start > 91 * 86400000 ||
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  )
    throw new Error("仅支持有效且不超过 90 天的范围");
  return { start, end, timezone: tz, range };
}
export async function dashboard(req, env, now = Date.now()) {
  const identity = adminIdentity(req, env);
  if (identity.status !== 200)
    return fail(
      identity.status === 401
        ? "请使用管理员账号登录"
        : "当前账号没有管理员权限",
      identity.status,
    );
  if (!env.DB) return fail("数据库尚未配置", 503);
  try {
    const params = new URL(req.url).searchParams,
      range = timeRange(params, now);
    const selectedChannel=params.get('channel')||'all';if(selectedChannel!=='all'&&!channelSet.includes(selectedChannel))return fail('渠道筛选无效');
    const result = await env.DB.prepare(
      "SELECT e.id,e.name,e.ts,e.properties,e.duration_ms,e.session_id,e.visitor_id,s.channel,s.campaign,s.country,s.device,s.os,s.browser,s.`returning` FROM analytics_events e JOIN analytics_sessions s ON s.id=e.session_id WHERE e.ts>=? AND e.ts<? AND (?='all' OR s.channel=?) ORDER BY e.ts,e.rowid LIMIT 50001",
    )
      .bind(range.start, range.end,selectedChannel,selectedChannel)
      .all();
    const events = result.results.slice(0, 50000),
      partial = result.results.length > 50000;
    const all = await env.DB.prepare(
      "SELECT MIN(ts) AS first,COUNT(*) AS total FROM analytics_events",
    ).first();
    const live = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM analytics_sessions WHERE last_seen>=? AND (?='all' OR channel=?)",
    )
      .bind(now - 300000,selectedChannel,selectedChannel)
      .first();
    const today = await env.DB.prepare(
      "SELECT COUNT(DISTINCT e.visitor_id) AS n FROM analytics_events e JOIN analytics_sessions s ON s.id=e.session_id WHERE e.ts>=? AND (?='all' OR s.channel=?)",
    )
      .bind(midnight(zonedDate(now, range.timezone), range.timezone),selectedChannel,selectedChannel)
      .first();
    const count = (name) => events.filter((e) => e.name === name).length,
      visitors = new Set(events.map((e) => e.visitor_id)),
      sessions = new Set(events.map((e) => e.session_id));
    const exports = events.filter(
        (e) => e.name === "export_png" || e.name === "export_svg",
      ),
      charts = events.filter((e) => e.name === "chart_generated");
    const processing = events.filter(
      (e) =>
        [
          "file_upload_succeeded",
          "fit_completed",
          "formula_applied",
          "chart_generated",
        ].includes(e.name) && e.duration_ms !== null,
    );
    const errors = count("processing_error"),
      operations = events.filter((e) =>
        [
          "file_upload_succeeded",
          "fit_completed",
          "formula_applied",
          "export_png",
          "export_svg",
          "processing_error",
          "ai_analysis_succeeded",
        ].includes(e.name),
      ).length;
    const dimensions = {
      channel: {},
      country: {},
      device: {},
      os: {},
      browser: {},
      feature: {},
      error: {},
      purpose: {},
    };
    for (const e of events) {
      const props = JSON.parse(e.properties);
      for (const d of ["channel", "country", "device", "os", "browser"]) {
        const key = e[d] || "Unknown",
          obj = (dimensions[d][key] ??= {
            visitors: new Set(),
            sessions: new Set(),
            charts: 0,
            exports: 0,
            exportSessions:new Set(),
          });
        obj.visitors.add(e.visitor_id);
        obj.sessions.add(e.session_id);
        obj.charts += e.name === "chart_generated" ? 1 : 0;
        obj.exports +=
          e.name === "export_png" || e.name === "export_svg" ? 1 : 0;
        if(e.name==='export_png'||e.name==='export_svg')obj.exportSessions.add(e.session_id);
      }
      if (e.name === "chart_generated" && props.chart_type)
        dimensions.feature[props.chart_type] =
          (dimensions.feature[props.chart_type] || 0) + 1;
      if (e.name === "processing_error")
        dimensions.error[props.error_category || "unknown"] =
          (dimensions.error[props.error_category || "unknown"] || 0) + 1;
      if (props.purpose)
        dimensions.purpose[props.purpose] =
          (dimensions.purpose[props.purpose] || 0) + 1;
    }
    for (const d of ["channel", "country", "device", "os", "browser"])
      dimensions[d] = Object.entries(dimensions[d]).map(([name, v]) => ({
        name,
        visitors: v.visitors.size,
        sessions: v.sessions.size,
        charts: v.charts,
        exports: v.exports,
        conversion: v.sessions.size ? v.exportSessions.size / v.sessions.size : null,
      }));
    const stages = [
        "page_view",
        "studio_opened",
        "file_upload_succeeded",
        "chart_generated",
        "export",
      ],
      progress = new Map(),
      funnel = stages.map((name) => ({ name, count: 0,visitorSet:new Set() }));
    for (const e of events) {
      let idx = progress.get(e.session_id) || 0;
      if (
        e.name === stages[idx] ||
        (idx === 4 && ["export_png", "export_svg"].includes(e.name))
      ) {
        funnel[idx].count++;
        funnel[idx].visitorSet.add(e.visitor_id);
        progress.set(e.session_id, idx + 1);
      }
    }
    const interval = ["hour", "day", "week"].includes(params.get("interval"))
        ? params.get("interval")
        : "day",
      trend = new Map();
    for (const e of events) {
      let key = zonedDate(e.ts, range.timezone);
      if (interval === "hour") {
        const h = new Intl.DateTimeFormat("en-GB", {
          timeZone: range.timezone,
          hour: "2-digit",
          hourCycle: "h23",
        }).format(new Date(e.ts));
        key += " " + h + ":00";
      }
      if (interval === "week") {
        const wd = new Date(key + "T00:00:00Z").getUTCDay();
        key = dayShift(key, -((wd + 6) % 7));
      }
      const b = trend.get(key) || {
        label: key,
        pageViews: 0,
        charts: 0,
        exports: 0,
        visitors: new Set(),
      };
      b.pageViews += e.name === "page_view" ? 1 : 0;
      b.charts += e.name === "chart_generated" ? 1 : 0;
      b.exports += ["export_png", "export_svg"].includes(e.name) ? 1 : 0;
      b.visitors.add(e.visitor_id);
      trend.set(key, b);
    }
    const returning = new Set(
      events.filter((e) => e.returning).map((e) => e.visitor_id),
    );
    return json({
      state: events.length ? "data" : "empty",
      updatedAt: now,
      startedAt: all.first ?? null,
      totalEvents: all.total,
      range:{...range,channel:selectedChannel},
      partial,
      refreshSeconds: 15,
      liveWindowMinutes: 5,
      metrics: {
        todayVisitors: today.n,
        liveSessions: live.n,
        pageViews: count("page_view"),
        uniqueVisitors: visitors.size,
        sessions: sessions.size,
        chartGenerations: charts.length,
        successfulExports: exports.length,
        exportConversionRate: sessions.size
          ? new Set(exports.map((e) => e.session_id)).size / sessions.size
          : null,
        averageProcessingTime: processing.length
          ? processing.reduce((s, e) => s + e.duration_ms, 0) /
            processing.length
          : null,
        systemErrorRate: operations ? errors / operations : null,
        aiSuccessRate: count("ai_analysis_requested")
          ? count("ai_analysis_succeeded") / count("ai_analysis_requested")
          : null,
        newVisitors: visitors.size - returning.size,
        returningVisitors: returning.size,
      },
      dimensions,
      funnel:funnel.map(({visitorSet,...s})=>({...s,visitors:visitorSet.size})),
      trend: [...trend.values()].map((v) => ({
        ...v,
        visitors: v.visitors.size,
      })),
      identity: { email: identity.email },
      source:
        "ChartSnap first-party consented events; native Sites Analytics is not synchronized",
    });
  } catch {
    return fail("统计查询失败，请检查日期或稍后刷新", 400);
  }
}
