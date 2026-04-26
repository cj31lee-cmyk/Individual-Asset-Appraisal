// Vercel serverless function — production에서 /api/realprice 처리.
// dev 환경에서는 vite.config.ts의 미들웨어가 같은 로직을 호출함.

import { fetchRealprice, lastNMonths } from "../src/server/realprice";

interface QueryRequest {
  query: Record<string, string | string[] | undefined>;
}

interface JsonResponse {
  status: (code: number) => JsonResponse;
  json: (body: unknown) => void;
}

export default async function handler(req: QueryRequest, res: JsonResponse) {
  try {
    const q = req.query;
    const lawdCd = typeof q.lawdCd === "string" ? q.lawdCd : "";
    if (!/^\d{5}$/.test(lawdCd)) {
      return res.status(400).json({ error: "lawdCd (5-digit) required" });
    }

    const apiKey = process.env.MOLIT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "MOLIT_API_KEY not configured" });
    }

    const monthsParam = typeof q.months === "string" ? parseInt(q.months, 10) : 6;
    const monthCount = Math.min(Math.max(Number.isFinite(monthsParam) ? monthsParam : 6, 1), 24);

    const result = await fetchRealprice(
      {
        lawdCd,
        months: lastNMonths(monthCount),
        aptName: typeof q.aptName === "string" && q.aptName.trim() ? q.aptName.trim() : undefined,
        areaMin: typeof q.areaMin === "string" ? parseFloat(q.areaMin) : undefined,
        areaMax: typeof q.areaMax === "string" ? parseFloat(q.areaMax) : undefined,
      },
      apiKey,
    );

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
