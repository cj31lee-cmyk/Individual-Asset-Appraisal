// Vercel serverless — /api/insight (POST)
// Web Standards (Request/Response).

import { generateInsight, type ClaudeInsightInput } from "./lib/claude.js";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return json({ error: "POST only" }, 405);
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);
    }
    const body = (await req.json()) as ClaudeInsightInput;
    if (!body?.region) {
      return json({ error: "region required" }, 400);
    }
    const result = await generateInsight(body, apiKey);
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
