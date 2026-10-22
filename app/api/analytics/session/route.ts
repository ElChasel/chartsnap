import { env } from "cloudflare:workers";
import { analyticsSession } from "../../../../server/analytics.js";
export async function POST(request: Request) {
  return analyticsSession(request, env);
}
