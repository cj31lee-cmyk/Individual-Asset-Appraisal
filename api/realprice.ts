// Vercel serverless — /api/realprice
// 표준 Node http (req, res) 스타일. dev 미들웨어와 동일 패턴.

import type { IncomingMessage, ServerResponse } from "node:http";
import { fetchRealprice, lastNMonths } from "./_lib/realprice";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const lawdCd = url.searchParams.get("lawdCd") ?? "";
    if (!/^\d{5}$/.test(lawdCd)) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "lawdCd (5-digit) required" }));
      return;
    }
    const apiKey = process.env.MOLIT_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "MOLIT_API_KEY not configured" }));
      return;
    }
    const monthCount = Math.min(
      Math.max(parseInt(url.searchParams.get("months") ?? "6", 10) || 6, 1),
      24,
    );
    const aptName = url.searchParams.get("aptName")?.trim();
    const areaMin = url.searchParams.has("areaMin")
      ? parseFloat(url.searchParams.get("areaMin")!)
      : undefined;
    const areaMax = url.searchParams.has("areaMax")
      ? parseFloat(url.searchParams.get("areaMax")!)
      : undefined;

    const result = await fetchRealprice(
      { lawdCd, months: lastNMonths(monthCount), aptName: aptName || undefined, areaMin, areaMax },
      apiKey,
    );
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(result));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
}
