import { env } from "cloudflare:workers";
import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import AdminClient from "./ui";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "运营后台 | 611 Studio · ChartSnap",
  robots: { index: false, follow: false },
};
export default async function Admin() {
  const user = await getChatGPTUser();
  const allowed = ((env as any).ADMIN_EMAILS || "")
    .split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!user || !allowed.includes(user.email.toLowerCase()))
    return (
      <main
        style={{
          fontFamily: "Segoe UI,Microsoft YaHei,sans-serif",
          maxWidth: 600,
          margin: "100px auto",
          padding: 30,
          lineHeight: 1.8,
          color: "#3d4660",
        }}
      >
        <h1>611 Studio · 运营后台</h1>
        <p>
          {user
            ? "当前登录账号未被授权为管理员。"
            : "请使用被工作室授权的 ChatGPT 账号登录。"}
        </p>
        <p>
          访问本站的访客不需要登录。运营数据仅在服务端校验管理员身份后返回。
        </p>
        <a href={chatGPTSignInPath("/admin")} target="_top">
          使用 ChatGPT 登录 →
        </a>
        <p>
          <a href="/">返回 ChartSnap</a>
        </p>
      </main>
    );
  return <AdminClient email={user.email} />;
}
