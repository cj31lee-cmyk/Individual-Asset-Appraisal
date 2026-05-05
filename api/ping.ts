// 의존성 0, 외부 호출 0 — Vercel Function 자체가 동작하는지 검증용.
// ⚠️ runtime 절대 변경 금지 — 2026-05-05에 nodejs 자동감지 cold start hang 문제 해결됨 (commit dccb6c5).
export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  return new Response(
    JSON.stringify({
      ok: true,
      time: new Date().toISOString(),
      hasMOLIT: !!process.env.MOLIT_API_KEY,
      hasANTHROPIC: !!process.env.ANTHROPIC_API_KEY,
      method: req.method,
      url: req.url,
      nodeVersion: process.versions?.node ?? "unknown",
    }),
    { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
  );
}
