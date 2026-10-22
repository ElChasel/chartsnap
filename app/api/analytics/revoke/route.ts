export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "仅接受同源请求" }, { status: 403 });
  return Response.json(
    { revoked: true },
    {
      headers: {
        "Set-Cookie": `cs_analytics=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
        "Cache-Control": "no-store",
      },
    },
  );
}
