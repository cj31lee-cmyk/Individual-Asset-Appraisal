// Vercel serverless — /api/insight (POST)
// 표준 Node http (req, res) 스타일. dev 미들웨어와 동일 패턴.

import type { IncomingMessage, ServerResponse } from "node:http";
import { generateInsight, type ClaudeInsightInput } from "./_lib/claude";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "POST only" }));
      return;
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }));
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as ClaudeInsightInput;
    if (!body?.region) {
      res.statusCode = 400;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "region required" }));
      return;
    }
    const result = await generateInsight(body, apiKey);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(result));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
}
