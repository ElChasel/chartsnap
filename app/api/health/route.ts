import { env } from "cloudflare:workers";
export async function GET() {
  const e = env as any;
  return Response.json(
    {
      status: "ok",
      version: "6.0.0",
      ai_configured: !!e.OPENAI_API_KEY && e.AI_BILLING_AUTHORIZED === "true",
      analytics_configured: !!e.DB && !!e.ANALYTICS_SECRET,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
