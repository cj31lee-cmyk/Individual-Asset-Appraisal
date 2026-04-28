// Vercel serverless — /api/realprice
// Web Standards (Request/Response) — Vercel Node runtime에서 가장 호환성 높음.

import { fetchRealprice, lastNMonths } from "./_lib/realprice.js";

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const lawdCd = url.searchParams.get("lawdCd") ?? "";
    if (!/^\d{5}$/.test(lawdCd)) {
      return json({ error: "lawdCd (5-digit) required" }, 400);
    }
    const apiKey = process.env.MOLIT_API_KEY;
    if (!apiKey) {
      return json({ error: "MOLIT_API_KEY not configured" }, 500);
    }
    const monthCount = Math.min(
      Math.max(parseInt(url.searchParams.get("months") ?? "6", 10) || 6, 1),
      24,
    );
    const aptName = url.searchParams.get("aptName")?.trim();
    const umdName = url.searchParams.get("umdName")?.trim();
    const areaMin = url.searchParams.has("areaMin")
      ? parseFloat(url.searchParams.get("areaMin")!)
      : undefined;
    const areaMax = url.searchParams.has("areaMax")
      ? parseFloat(url.searchParams.get("areaMax")!)
      : undefined;

    const result = await fetchRealprice(
      {
        lawdCd,
        months: lastNMonths(monthCount),
        aptName: aptName || undefined,
        umdName: umdName || undefined,
        areaMin,
        areaMax,
      },
      apiKey,
    );
    return json(result, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
