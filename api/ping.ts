// 의존성 0, 외부 호출 0 — Vercel Function 자체가 동작하는지 검증용.
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
