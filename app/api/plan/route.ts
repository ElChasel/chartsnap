import { env } from "cloudflare:workers";
import { plan } from "../../../server/plan.js";
export async function POST(request: Request) {
  return plan(request, env);
}
