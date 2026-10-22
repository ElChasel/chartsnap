import {pagesAnalytics} from './pages-analytics.js';
import {STATIC_BUILD,sitePath} from './runtime.js';
import React, { useEffect, useState } from "react";
import { consentState, setConsent, initTelemetry, track } from "./telemetry.js";
export function BrandMark() {
  return (
    <svg
      viewBox="0 0 40 40"
      width="32"
      height="32"
      role="img"
      aria-label="ChartSnap 原创 Logo"
    >
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#5754d6" />
      <path
        d="M27 11.5A11 11 0 1 0 28 28"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 24L17 19L21 22L29 14"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="26" y="11" width="6" height="6" rx="1.5" fill="#c4c3ff" />
    </svg>
  );
}
export function StudioWordmark() {
  return (
    <span className="studio-wordmark">
      <b>611</b> Studio
    </span>
  );
}
export function ConsentBanner() {
  const [state, setState] = useState(consentState());
  const [configured, configure] = useState(pagesAnalytics?.isConfigured());
  useEffect(() => {
    const ready = () => configure(true);
    window.addEventListener("chartsnap-analytics-ready",ready);
    initTelemetry();
    const f = (e) => setState(e.detail);
    window.addEventListener("chartsnap-consent", f);
    return () => {window.removeEventListener("chartsnap-consent", f);window.removeEventListener("chartsnap-analytics-ready",ready);};
  }, []);
  return (!STATIC_BUILD || configured) && state === "unset" ? (
    <div className="consent-banner" role="region" aria-label="隐私与统计选择">
      <div>
        <strong>由你决定是否帮助我们改进。</strong>
        <p>
          {STATIC_BUILD ? "仅经同意向 Umami Cloud 发送页面访问、固定操作事件、粗略设备及渠道。服务商处理 IP 和浏览器信息推算地区与访客数；不发送文件名、数据或图表内容，不加载录屏或 DOM 采集脚本。可随时在隐私设置撤回。" : "仅经同意采集匿名操作事件、粗略设备信息及渠道；不采集文件内容、字段名或 AI 问题。不启用录屏。"}
        </p>
        <a href={sitePath("/privacy")}>查看隐私说明</a>
      </div>
      <button className="btn small" onClick={() => setConsent("denied")}>
        拒绝可选统计
      </button>
      <button
        className="btn primary small"
        onClick={() => setConsent("granted")}
      >
        同意匿名统计
      </button>
    </div>
  ) : null;
}
export function BrandInfo({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal about-modal"
        role="dialog"
        aria-modal="true"
        aria-label="关于611工作室"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close icon-btn"
          aria-label="关闭介绍"
          onClick={onClose}
        >
          ×
        </button>
        <StudioWordmark />
        <h2>
          Thoughtful tools.
          <br />
          Meaningful insight.
        </h2>
        <p>
          611工作室是一家专注于智能数字工具、数据分析与交互体验的独立创作工作室。我们致力于运用现代软件技术与人工智能，将复杂的数字化工作流程转化为简单、高效、可靠的产品体验。
        </p>
        <p>
          611 Studio is an independent digital product studio focused on
          intelligent tools, data analysis, and interactive experiences. We
          build thoughtful software that makes complex workflows simpler,
          faster, and more accessible.
        </p>
        <div className="about-product">
          <BrandMark />
          <div>
            <strong>ChartSnap</strong>
            <small>A Product by 611 Studio · 6.0</small>
          </div>
        </div>
        <p>
          面向科研、金融、商业与日常办公的本地优先数据工作台。我们坚持计算可验证、数据由用户掌控，以及明确区分事实、建议和不确定性。
        </p>
        <p>
          6.0 · 精确选区 / 专业绘图 / 高分辨率矢量导出 / 本地确定性计算。工作室介绍不代表已注册公司资质。
        </p>
        <div className="button-row">
          <a className="btn small" href={sitePath("/feedback")}>
            联系与反馈
          </a>
          <a className="btn small" href={sitePath("/privacy")}>
            隐私政策
          </a>
          {!STATIC_BUILD&&<a className="text-btn" href="/admin">管理员入口</a>}
        </div>
      </section>
    </div>
  );
}
export function AILauncher({ onUpload, onAsk, prompt, setPrompt, enabled }) {
  return (
    <div className="landing-ai">
      <div className="ai-label">
        <span>✦</span> ASK CHARTSNAP{" "}
        <span className="ai-state">
          {enabled ? "模型服务已连接" : "AI 尚未启用 · 免费绘图可用"}
        </span>
      </div>
      <div className="ai-input">
        <input
          aria-label="首页分析需求"
          placeholder="Describe what you'd like to analyze..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button aria-label="进入智能分析" onClick={onAsk}>
          ↗
        </button>
      </div>
      <div className="prompt-examples">
        {[
          "Analyze trends in my dataset",
          "Recommend the best fitting model",
          "Calculate financial returns",
          "Generate a publication-ready chart",
          "Explain anomalies in my data",
        ].map((p) => (
          <button
            key={p}
            onClick={() => {
              setPrompt(p);
              onAsk();
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
export function AnonymousSurvey() {
  const [done, setDone] = useState(false);
  return (
    <details className="anonymous-survey">
      <summary>自愿匿名问卷：你使用 ChartSnap 主要为了什么？</summary>
      {done ? (
        <p>感谢反馈。这是自愿提交，不影响绘图功能。</p>
      ) : (
        <div>
          {[
            ["research", "科研"],
            ["study", "学习"],
            ["business", "商业"],
            ["finance", "金融"],
            ["office", "日常办公"],
            ["other", "其他"],
          ].map(([p, n]) => (
            <button
              className="btn small"
              key={p}
              onClick={() => {
                if (consentState() !== "granted") {
                  alert("请先在隐私设置中同意匿名统计后再自愿提交。");
                  return;
                }
                track("purpose_submitted", { purpose: p });
                setDone(true);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </details>
  );
}

export function AnalyticsStatus(){const [status,setStatus]=useState("统计：未启用");useEffect(()=>{const f=e=>setStatus(e.detail);window.addEventListener("chartsnap-analytics-status",f);return ()=>window.removeEventListener("chartsnap-analytics-status",f);},[]);return STATIC_BUILD?<small role="status" aria-label="访问统计状态">{status}</small>:null;}
