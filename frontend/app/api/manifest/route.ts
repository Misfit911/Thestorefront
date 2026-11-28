export const runtime = "nodejs";

export function GET(request: Request) {
  const start = new URL(request.url).searchParams.get("start") ?? "/admin";
  const safe = /^\/admin$|^\/[a-z0-9]+(?:[_-][a-z0-9]+)*\/admin$/.test(start) ? start : "/admin";
  return Response.json(
    {
      name: "Customs Kenya Studio",
      short_name: "Studio",
      start_url: safe,
      scope: "/",
      display: "standalone",
      background_color: "#111111",
      theme_color: "#111111",
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
