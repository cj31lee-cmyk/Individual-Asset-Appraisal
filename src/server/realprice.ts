// 국토부 아파트매매 실거래가 API 호출, XML 파싱, 통계 산출.
// 서버 전용 (dev 미들웨어 + Vercel serverless 모두에서 import).
// 클라이언트 코드에서 import 금지 — 번들에 들어가면 API 키가 노출될 수 있음.

import { correctMarketStats, type CorrectionResult } from "./correction";

const API_BASE =
  "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

const SQM_PER_PYEONG = 3.305785;

export interface RealpriceItem {
  aptNm: string;
  umdNm: string;
  jibun: string;
  dealAmount: number; // 만원
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  excluUseAr: number; // 전용면적 ㎡
  floor: number;
  buildYear: number;
  dealingGbn: string; // "중개거래" | "직거래" | ""
}

export interface AreaStats {
  count: number;
  meanAmount: number;       // 만원
  medianAmount: number;
  meanPyeongPrice: number;  // 평당 만원
  recent: RealpriceItem[];  // 최신순 상위 20건
}

export interface ComplexStats {
  aptName: string;
  count: number;
  meanAmount: number;
  meanArea: number;        // ㎡
  meanPyeongPrice: number; // 평당 만원
  items: RealpriceItem[];  // 최신순 상위 50건
}

export interface RealpriceResult {
  lawdCd: string;
  monthsQueried: string[];
  totalFetched: number;
  totalAfterFilter: number;
  area: AreaStats;
  complex: ComplexStats | null;
  // 룰 기반 보정 결과 (이상치 제거, 시간 가중, 추세, 신뢰도)
  areaCorrection: CorrectionResult | null;
  complexCorrection: CorrectionResult | null;
}

export interface RealpriceQuery {
  lawdCd: string;
  months: string[];   // ["202503", ...] (YYYYMM)
  aptName?: string;   // substring 매칭 (공백·대소문자 무시)
  areaMin?: number;   // ㎡ 이상
  areaMax?: number;   // ㎡ 이하
}

export async function fetchRealprice(
  query: RealpriceQuery,
  apiKey: string,
): Promise<RealpriceResult> {
  const allItems: RealpriceItem[] = [];

  for (const ymd of query.months) {
    const url =
      `${API_BASE}?serviceKey=${encodeURIComponent(apiKey)}` +
      `&LAWD_CD=${query.lawdCd}` +
      `&DEAL_YMD=${ymd}` +
      `&numOfRows=1000&pageNo=1`;

    // WAF가 User-Agent 없는 요청을 차단하므로 헤더 필수.
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (NPL-bidbuddy)" },
    });
    const xml = await res.text();

    const codeMatch = xml.match(/<resultCode>\s*([^<]+)\s*<\/resultCode>/);
    const code = codeMatch?.[1]?.trim();
    if (code !== "000") {
      const msgMatch = xml.match(/<resultMsg>\s*([^<]+)\s*<\/resultMsg>/);
      throw new Error(
        `MOLIT API ${ymd} 실패: code=${code ?? "unknown"} msg=${msgMatch?.[1]?.trim() ?? ""}`,
      );
    }
    allItems.push(...parseItems(xml));
  }

  let filtered = allItems;
  if (query.aptName) {
    const needle = normalize(query.aptName);
    filtered = filtered.filter((it) => normalize(it.aptNm).includes(needle));
  }
  if (query.areaMin !== undefined) {
    filtered = filtered.filter((it) => it.excluUseAr >= query.areaMin!);
  }
  if (query.areaMax !== undefined) {
    filtered = filtered.filter((it) => it.excluUseAr <= query.areaMax!);
  }

  return {
    lawdCd: query.lawdCd,
    monthsQueried: query.months,
    totalFetched: allItems.length,
    totalAfterFilter: filtered.length,
    area: computeAreaStats(allItems),
    complex: query.aptName ? computeComplexStats(filtered, query.aptName) : null,
    areaCorrection: correctMarketStats(allItems),
    complexCorrection: query.aptName && filtered.length > 0 ? correctMarketStats(filtered) : null,
  };
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function parseItems(xml: string): RealpriceItem[] {
  const items: RealpriceItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag: string): string => {
      const r = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`);
      const mm = r.exec(block);
      return mm ? mm[1].trim() : "";
    };
    items.push({
      aptNm: get("aptNm"),
      umdNm: get("umdNm"),
      jibun: get("jibun"),
      dealAmount: parseInt(get("dealAmount").replace(/,/g, ""), 10) || 0,
      dealYear: parseInt(get("dealYear"), 10) || 0,
      dealMonth: parseInt(get("dealMonth"), 10) || 0,
      dealDay: parseInt(get("dealDay"), 10) || 0,
      excluUseAr: parseFloat(get("excluUseAr")) || 0,
      floor: parseInt(get("floor"), 10) || 0,
      buildYear: parseInt(get("buildYear"), 10) || 0,
      dealingGbn: get("dealingGbn"),
    });
  }
  return items;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function dateKey(it: RealpriceItem): number {
  return it.dealYear * 10000 + it.dealMonth * 100 + it.dealDay;
}

function computeAreaStats(items: RealpriceItem[]): AreaStats {
  const amounts = items.map((it) => it.dealAmount).filter((v) => v > 0);
  const pyeongPrices = items
    .filter((it) => it.dealAmount > 0 && it.excluUseAr > 0)
    .map((it) => it.dealAmount / (it.excluUseAr / SQM_PER_PYEONG));
  const recent = [...items].sort((a, b) => dateKey(b) - dateKey(a)).slice(0, 20);
  return {
    count: items.length,
    meanAmount: Math.round(mean(amounts)),
    medianAmount: Math.round(median(amounts)),
    meanPyeongPrice: Math.round(mean(pyeongPrices)),
    recent,
  };
}

function computeComplexStats(items: RealpriceItem[], aptName: string): ComplexStats {
  const amounts = items.map((it) => it.dealAmount).filter((v) => v > 0);
  const areas = items.map((it) => it.excluUseAr).filter((v) => v > 0);
  const pyeongPrices = items
    .filter((it) => it.dealAmount > 0 && it.excluUseAr > 0)
    .map((it) => it.dealAmount / (it.excluUseAr / SQM_PER_PYEONG));
  const sorted = [...items].sort((a, b) => dateKey(b) - dateKey(a));
  return {
    aptName,
    count: items.length,
    meanAmount: Math.round(mean(amounts)),
    meanArea: Math.round(mean(areas) * 10) / 10,
    meanPyeongPrice: Math.round(mean(pyeongPrices)),
    items: sorted.slice(0, 50),
  };
}

// 국토부 데이터는 1~2개월 지연 가능 → 이번 달 제외하고 전월부터 N개월 역순.
export function lastNMonths(n: number, base: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    out.push(`${y}${m}`);
  }
  return out;
}
