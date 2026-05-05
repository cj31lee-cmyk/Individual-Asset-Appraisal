// Vercel serverless — /api/complex-report (POST)
// Web Standards (Request/Response). 단지 종합 리포트 (Sonnet 4.6).

import { generateComplexReport, type ComplexReportInput } from "./lib/claude.js";

// ⚠️ 다른 함수와 달리 nodejs 유지 — Sonnet 4.6이 Edge 25s 한도(Hobby)를 넘을 수 있음.
// runtime 변경/삭제 금지 — 2026-05-05 cold start hang 해결 (commit dccb6c5). 자세한 건 api/ping.ts 참고.
export const config = { runtime: "nodejs" };

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return json({ error: "POST only" }, 405);
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }
    const body = (await req.json()) as ComplexReportInput;
    if (!body?.region || !body?.complexName) {
      return json({ error: "region and complexName required" }, 400);
    }
    const result = await generateComplexReport(body, apiKey);
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
