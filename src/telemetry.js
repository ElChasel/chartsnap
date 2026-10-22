import {pagesAnalytics} from './pages-analytics.js';
import {STATIC_BUILD} from './runtime.js';
const KEY = "chartsnap.analytics.consent.v1";
let enabled = false,
  ready = null,
  queue = [],
  timer,
  heart,
  lastSession = 0,
  session = null;
export function consentState() {
  if(STATIC_BUILD) return pagesAnalytics.consentState();
  try {
    return localStorage.getItem(KEY) || "unset";
  } catch {
    return "denied";
  }
}
function context() {
  const q = new URLSearchParams(location.search),
    utm = q.get("utm_source")?.toLowerCase(),
    ref = document.referrer ? new URL(document.referrer).hostname : "";
  let channel =
    utm === "xiaohongshu"
      ? "Xiaohongshu"
      : utm === "wechat"
        ? "WeChat"
        : utm
          ? "Campaign UTM"
          : /xiaohongshu|xhslink/.test(ref)
            ? "Xiaohongshu"
            : /weixin|wechat/.test(ref)
              ? "WeChat"
              : /google|bing|baidu|duckduckgo|sogou/.test(ref)
                ? "Search Engines"
                : ref && ref !== location.hostname
                  ? "Other Referrals"
                  : "Direct";
  const ua = navigator.userAgent;
  return {
    channel,
    campaign: q.get("utm_campaign") || "",
    device: /iPad|Tablet/.test(ua)
      ? "Tablet"
      : /Mobi|Android/.test(ua)
        ? "Mobile"
        : "Desktop",
    os: /Windows/.test(ua)
      ? "Windows"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Mac/.test(ua)
            ? "macOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "Unknown",
    browser: /Edg\//.test(ua)
      ? "Edge"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Other",
  };
}
async function sessionReady() {
  if (!enabled) return false;
  if (session && Date.now() - lastSession < 25 * 60000) return true;
  if (ready) return ready;
  ready = (async () => {
    try {
      let visitor = localStorage.getItem("chartsnap.analytics.visitor");
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem("chartsnap.analytics.visitor", visitor);
      }
      const r = await fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, visitor, ...context() }),
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return false;
      const data = await r.json();
      session = data.session;
      lastSession = Date.now();
      return true;
    } catch {
      return false;
    } finally {
      ready = null;
    }
  })();
  return ready;
}
export async function flushEvents() {
  if(STATIC_BUILD) return pagesAnalytics.flushEvents();
  if (!enabled || !queue.length) return;
  if (!(await sessionReady())) return;
  const sending = queue.splice(0, 20);
  try {
    const r = await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true, events: sending }),
      keepalive: true,
    });
    if (r.status === 401) {
      session = null;
      queue.unshift(...sending);
      return;
    }
    if (!r.ok && r.status >= 500) queue.unshift(...sending);
  } catch {
    queue.unshift(...sending);
  }
  if (queue.length > 100) queue.splice(0, queue.length - 100);
}
export function track(name, properties = {}, duration) {
  if(STATIC_BUILD) return pagesAnalytics.track(name,properties);
  if (!enabled) return;
  const event = { id: crypto.randomUUID(), name, properties };
  if (Number.isFinite(duration))
    event.duration_ms = Math.max(0, Math.min(3600000, Math.round(duration)));
  queue.push(event);
  clearTimeout(timer);
  timer = setTimeout(flushEvents, 400);
}
export function setConsent(value) {
  if(STATIC_BUILD) return pagesAnalytics.setConsent(value);
  try {
    localStorage.setItem(KEY, value);
  } catch {}
  enabled = !STATIC_BUILD && value === "granted";
  if (enabled) {
    track("page_view");
    if (location.hash === "#studio") track("studio_opened");
    clearInterval(heart);
    heart = setInterval(() => {
      if (document.visibilityState === "visible") track("session_heartbeat");
    }, 60000);
  } else {
    queue = [];
    clearTimeout(timer);
    clearInterval(heart);
    session = null;
    !STATIC_BUILD && fetch("/api/analytics/revoke", { method: "POST", keepalive: true }).catch(
      () => {},
    );
    try {
      localStorage.removeItem("chartsnap.analytics.visitor");
    } catch {}
  }
  window.dispatchEvent(new CustomEvent("chartsnap-consent", { detail: value }));
}
export function initTelemetry() {
  if(STATIC_BUILD)return pagesAnalytics.initTelemetry();
  if (consentState() === "granted") setConsent("granted");
  window.addEventListener("pagehide", flushEvents);
}
export const rowBucket = (n) =>
  n <= 1000
    ? "1-1000"
    : n <= 10000
      ? "1001-10000"
      : n <= 100000
        ? "10001-100000"
        : "100000+";
export const durationBucket = (n) =>
  n < 100
    ? "<100ms"
    : n < 1000
      ? "100ms-1s"
      : n < 3000
        ? "1s-3s"
        : n < 10000
          ? "3s-10s"
          : "10s+";
