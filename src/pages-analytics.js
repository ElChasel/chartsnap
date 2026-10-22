// First-party, opt-in adapter. Never inspect DOM, files, chart objects or user text.
export const ENDPOINT = 'https://gateway.umami.is/api/send';
export const CONSENT_KEY = 'chartsnap.pages.analytics.consent.v1';
export function channel(location, referrer = '') {
  const source = new URLSearchParams(location.search).get('utm_source')?.toLowerCase();
  const known = {xiaohongshu:'xiaohongshu',xhs:'xiaohongshu',wechat:'wechat',weixin:'wechat',baidu:'search',bing:'search',google:'search',douyin:'douyin',bilibili:'bilibili',newsletter:'newsletter'};
  let host = '';
  try { host = new URL(referrer).hostname; } catch {}
  if (source) return known[source] || 'other_campaign';
  if (/(^|\.)(xiaohongshu\.com|xhslink\.com)$/.test(host)) return 'xiaohongshu';
  if (/(^|\.)(weixin\.qq\.com|wechat\.com)$/.test(host)) return 'wechat';
  if (/(^|\.)(baidu\.com|bing\.com|google\.com|sogou\.com|duckduckgo\.com)$/.test(host)) return 'search';
  return host && host !== location.hostname ? 'other_referrals' : 'direct';
}
export function safeEvent(name, props = {}) {
  if (['studio_opened','chart_generated'].includes(name)) return {name};
  if (name === 'file_upload_succeeded') return {name};
  if (['export_png','export_svg'].includes(name)) return {name:'chart_exported',data:{format:name === 'export_png'?'png':'svg'}};
  if (name === 'data_range_adjusted' && ['plot','fit','viewport'].includes(props.scope)) return {name,data:{scope:props.scope}};
  return null;
}
export function createPagesAnalytics(env) {
  let initialized = false, configured = false, queue = [], busy = false, current = null, abort, generation = 0, sent = 0, cooldown = 0;
  const storage = () => env.localStorage;
  const consentState = () => { try { return storage().getItem(CONSENT_KEY) || 'unset'; } catch { return 'denied'; } };
  const blocked = () => {
    try { return env.navigator.doNotTrack === '1' || env.navigator.globalPrivacyControl === true || storage().getItem('chartsnap.pages.analytics.exclude') === 'true'; } catch { return true; }
  };
  let website;
  const status = value => env.dispatchEvent(new env.CustomEvent('chartsnap-analytics-status',{detail:value}));
  const allowed = () => configured && consentState() === 'granted' && !blocked();
  async function flushEvents() {
    if (busy || !allowed() || !queue.length || Date.now() < cooldown) return;
    busy = true;
    const version = generation;
    try {
      while (queue.length && allowed() && version === generation) {
        abort = new AbortController();
        const timeout = setTimeout(() => abort?.abort(), 4000);
        try {
          const response = await env.fetch(ENDPOINT, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(queue.shift()),credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,signal:abort.signal});
          if (!response.ok) throw new Error('analytics unavailable');
          status('统计：采集接口已接收');
        } finally { clearTimeout(timeout); }
      }
    } catch { queue = []; cooldown = Date.now()+60000; status('统计：暂不可达，绘图不受影响'); }
    finally { busy = false; abort = null; }
  }
  function enqueue(event) {
    if (!allowed() || !event || sent >= 300 || Date.now() < cooldown || queue.length >= 30) return;
    const studio = env.location.hash === '#studio';
    queue.push({type:'event',payload:{website,hostname:'elchasel.github.io',url:studio?'/chartsnap/studio':'/chartsnap/',title:studio?'ChartSnap — Studio':'ChartSnap — Home',language:env.navigator.language?.startsWith('zh')?'zh':'en',screen:env.screen.width < 600?'390x844':env.screen.width < 1100?'768x1024':'1366x768',referrer:'',tag:channel(env.location,env.document.referrer),...event}});
    sent++;
    void flushEvents();
  }
  function visit() {
    if (!allowed()) return;
    const next = env.location.hash === '#studio' ? 'studio' : 'home';
    if (next === current) return;
    current = next;
    enqueue({});
    if (next === 'studio') enqueue({name:'studio_opened'});
  }
  const rangeTimers = new Map();
  function track(name, props) {
    if (!allowed()) return;
    if (name === 'studio_opened') { visit(); return; }
    const event = safeEvent(name,props);
    if (!event) return;
    if (name === 'data_range_adjusted') {
      clearTimeout(rangeTimers.get(event.data.scope));
      rangeTimers.set(event.data.scope,setTimeout(() => {rangeTimers.delete(event.data.scope);enqueue(event);},700));
    } else enqueue(event);
  }
  function setConsent(value) {
    if (!['granted','denied','unset'].includes(value)) return;
    try { storage().setItem(CONSENT_KEY,value); } catch {}
    generation++; queue = []; current = null; abort?.abort();
    for (const timer of rangeTimers.values()) clearTimeout(timer);
    rangeTimers.clear();
    env.dispatchEvent(new env.CustomEvent('chartsnap-consent',{detail:value}));
    status(blocked()?'统计：已遵循隐私退出信号':value === 'granted'?'统计：等待操作':'统计：未授权');
    if (allowed()) visit();
  }
  async function initTelemetry() {
    if (initialized) return;
    initialized = true;
    if (env.location.hostname !== 'elchasel.github.io' || !/^\/chartsnap(?:\/|$)/.test(env.location.pathname)) return;
    try {
      const response = await env.fetch('/chartsnap/analytics-config.json',{cache:'no-cache',signal:AbortSignal.timeout(4000)});
      if (!response.ok) return;
      const config = await response.json();
      if (config.provider !== 'umami-cloud' || config.enabled !== true || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(config.websiteId)) return;
      website = config.websiteId; configured = true;
      env.dispatchEvent(new env.CustomEvent('chartsnap-analytics-ready'));
      status(blocked()?'统计：已遵循隐私退出信号':consentState() === 'granted'?'统计：等待操作':'统计：未授权');
      env.addEventListener('hashchange',visit);
      visit();
    } catch { status('统计：暂不可达，绘图不受影响'); }
  }
  return {initTelemetry,setConsent,consentState,track,flushEvents,isConfigured:()=>configured};
}
export const pagesAnalytics = typeof window === 'undefined' ? null : createPagesAnalytics(window);
