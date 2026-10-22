import { env } from "cloudflare:workers";
import { dashboard } from "../../../server/analytics.js";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return dashboard(request, env);
}
