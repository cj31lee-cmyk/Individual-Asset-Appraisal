// 종합 진단 — env 키 존재 + 실제 MOLIT 호출 + lastNMonths 결과까지 반환.
// 시세 조회가 실패할 때 /api/diag 한 번 열어서 정확한 원인 파악.
import { lastNMonths } from "./lib/realprice.js";

export const config = { runtime: "nodejs20.x" };

export default async function handler(_req: Request): Promise<Response> {
  const now = new Date();
  const months = lastNMonths(6, now);
  const apiKey = process.env.MOLIT_API_KEY;

  const out: Record<string, unknown> = {
    serverTime: now.toISOString(),
    serverTimeKST: now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    nodeVersion: process.versions?.node ?? "unknown",
    env: {
      hasMOLIT: !!apiKey,
      molitKeyLength: apiKey?.length ?? 0,
      hasANTHROPIC: !!process.env.ANTHROPIC_API_KEY,
    },
    monthsForQuery: months,
  };

  if (!apiKey) {
    out.molitTest = { ok: false, reason: "MOLIT_API_KEY not set in this environment" };
    return json(out, 500);
  }

  // 실제로 강남구(11680) 최근달 1건만 호출해서 응답 확인
  const ymd = months[0];
  const url =
    `https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?serviceKey=${encodeURIComponent(apiKey)}` +
    `&LAWD_CD=11680&DEAL_YMD=${ymd}&numOfRows=1&pageNo=1`;

  try {
    const t0 = Date.now();
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (NPL-bidbuddy-diag)" } });
    const xml = await res.text();
    const elapsedMs = Date.now() - t0;
    const codeMatch = xml.match(/<resultCode>\s*([^<]+)\s*<\/resultCode>/);
    const msgMatch = xml.match(/<resultMsg>\s*([^<]+)\s*<\/resultMsg>/);
    const totalMatch = xml.match(/<totalCount>\s*([^<]+)\s*<\/totalCount>/);
    out.molitTest = {
      ok: codeMatch?.[1]?.trim() === "000",
      httpStatus: res.status,
      elapsedMs,
      ymdTested: ymd,
      resultCode: codeMatch?.[1]?.trim() ?? null,
      resultMsg: msgMatch?.[1]?.trim() ?? null,
      totalCount: totalMatch?.[1]?.trim() ?? null,
      // 코드가 비정상이거나 빈 응답일 때만 원본 일부 노출 (인증키 누설 방지 위해 200자만)
      xmlPreview: codeMatch?.[1]?.trim() === "000" ? null : xml.slice(0, 400),
    };
  } catch (e) {
    out.molitTest = {
      ok: false,
      reason: "fetch threw",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  return json(out, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
