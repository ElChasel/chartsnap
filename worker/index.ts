import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, async () => {
      // Read native Cloudflare metadata before Vinext wraps Request. Replace any
      // client-supplied value so analytics never trusts a public geo header.
      const headers=new Headers(request.headers);
      const country=request.cf?.country;
      headers.set('x-chartsnap-country',typeof country==='string'&&/^[A-Z]{2}$/.test(country)?country:'Unknown');
      const forwarded=new Request(request,{headers});
      const response=await handler.fetch(forwarded,env,ctx);
      const secure=new Response(response.body,response);
      secure.headers.set('X-Content-Type-Options','nosniff');
      secure.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
      secure.headers.set('Permissions-Policy','geolocation=(), camera=(), microphone=()');
      if(!import.meta.env.DEV)secure.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; base-uri 'self'; object-src 'none'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com");
      return secure;
    });
  },
};

export default worker;
