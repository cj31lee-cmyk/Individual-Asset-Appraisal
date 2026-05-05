// Vercel Edge — /api/complex-report (POST, streaming)
// Anthropic SSE 스트림을 그대로 클라이언트로 forward.
// Edge 25s Hobby 한도는 inactivity timeout이므로, 토큰이 흘러오는 한 적용되지 않음 → Sonnet 4.6 50초+도 OK.
//
// ⚠️ runtime 절대 변경 금지 — 2026-05-05 cold start hang 해결. nodejs는 cold start hang 발생함.
// 자세한 건 api/ping.ts 참고.

import { buildReportPrompt, CLAUDE_API, REPORT_MODEL, type ComplexReportInput } from "./lib/claude.js";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return jsonError("POST only", 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return jsonError("ANTHROPIC_API_KEY not configured", 500);

  let input: ComplexReportInput;
  try {
    input = (await req.json()) as ComplexReportInput;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  if (!input?.region || !input?.complexName) {
    return jsonError("region and complexName required", 400);
  }

  const prompt = buildReportPrompt(input);

  const upstream = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: REPORT_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return jsonError(`Claude API ${upstream.status}: ${text.slice(0, 400)}`, 502);
  }

  // Anthropic SSE를 그대로 forward. 클라이언트가 content_block_delta 이벤트의 delta.text를 누적.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
