import { env } from "cloudflare:workers";
export const dynamic = "force-dynamic";
export default function Feedback() {
  const configured = (env as any).FEEDBACK_URL;
  let url = "";
  try {
    const u = new URL(configured);
    if (u.protocol === "https:") url = u.href;
  } catch {}
  return (
    <main
      style={{
        fontFamily: "Segoe UI,Microsoft YaHei,sans-serif",
        maxWidth: 700,
        margin: "80px auto",
        padding: 24,
        lineHeight: 1.9,
        color: "#39445a",
      }}
    >
      <a href="/">← ChartSnap</a>
      <h1>联系 611 Studio</h1>
      <p>
        我们欢迎关于图表、数值计算和交互体验的反馈。请勿提交原始敏感数据或账户信息。
      </p>
      {url ? (
        <a href={url} rel="noopener noreferrer">
          打开工作室反馈入口 ↗
        </a>
      ) : (
        <p>
          工作室尚未配置公开反馈渠道。管理员可通过服务端{" "}
          <code>FEEDBACK_URL</code> 设置 HTTPS
          问卷或反馈地址；目前不展示未经确认的邮箱、电话或地址。
        </p>
      )}
    </main>
  );
}
