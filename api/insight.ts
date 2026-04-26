// Vercel serverless function — Claude로 보정 결과 자연어 인사이트 생성.

import { generateInsight, type ClaudeInsightInput } from "../src/server/claude";

interface JsonBodyRequest {
  body: ClaudeInsightInput | string | undefined;
  method?: string;
}

interface JsonResponse {
  status: (code: number) => JsonResponse;
  json: (body: unknown) => void;
}

export default async function handler(req: JsonBodyRequest, res: JsonResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    }
    const body: ClaudeInsightInput =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body as ClaudeInsightInput);
    if (!body || typeof body !== "object" || !body.region) {
      return res.status(400).json({ error: "Invalid input — region/surfaceMean required" });
    }
    const result = await generateInsight(body, apiKey);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
}
