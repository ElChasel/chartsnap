import { env } from "cloudflare:workers";
import { collectEvents } from "../../../../server/analytics.js";
export async function POST(request: Request) {
  return collectEvents(request, env);
}
