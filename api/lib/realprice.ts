// 국토부 아파트매매 실거래가 API 호출, XML 파싱, 통계 산출.
// 서버 전용 (dev 미들웨어 + Vercel serverless 모두에서 import).
// 클라이언트 코드에서 import 금지 — 번들에 들어가면 API 키가 노출될 수 있음.

import { correctMarketStats, type CorrectionResult } from "./correction.js";

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
  count: number;             // 전체 거래 건수
  meanAmount: number;        // 정제 평균 (IQR 트림)
  medianAmount: number;      // 중위 (전체)
  meanPyeongPrice: number;   // 정제 평균 평당가
  recent: RealpriceItem[];   // 최신 20건 (전체, outlier 포함)
  excludedOutliers: number;  // IQR 트림으로 제외된 건수
  rawMeanAmount: number;     // 원본 단순 평균 (참고용)
}

export interface ComplexStats {
  aptName: string;
  count: number;             // 매칭 건수 (전체)
  meanAmount: number;        // 정제 평균 (IQR 트림)
  meanArea: number;          // ㎡
  meanPyeongPrice: number;   // 정제 평당가
  items: RealpriceItem[];    // 최신순 50건 (전체)
  excludedOutliers: number;
  rawMeanAmount: number;
}

export interface UmdBreakdown {
  umdNm: string;
  count: number;
  meanAmount: number; // 만원, 단순 평균 (드롭다운 표시·fallback 결정용)
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
  // 그 지역 거래 많은 단지 TOP — 단지명 검색 미스 시 추천용
  topComplexes: { name: string; count: number; umdNm: string }[];
  // 법정동별 거래수·평균 — 동 드롭다운 채움 + 표본 부족 fallback 결정용
  umdBreakdown: UmdBreakdown[];
}

export interface RealpriceQuery {
  lawdCd: string;
  months: string[];   // ["202503", ...] (YYYYMM)
  aptName?: string;   // 단지명 substring (공백·대소문자 무시)
  umdName?: string;   // 법정동(읍면동) substring — 예: "고덕동"
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
    filtered = filtered.filter((it) => matchAptName(needle, normalize(it.aptNm)));
  }
  if (query.umdName) {
    const needle = normalize(query.umdName);
    filtered = filtered.filter((it) => normalize(it.umdNm).includes(needle));
  }
  if (query.areaMin !== undefined) {
    filtered = filtered.filter((it) => it.excluUseAr >= query.areaMin!);
  }
  if (query.areaMax !== undefined) {
    filtered = filtered.filter((it) => it.excluUseAr <= query.areaMax!);
  }

  // 단지명 또는 법정동 필터가 있으면 complex 카드 활성화
  const hasComplexFilter = !!(query.aptName || query.umdName);
  const complexLabel = [query.aptName, query.umdName].filter(Boolean).join(" / ");

  return {
    lawdCd: query.lawdCd,
    monthsQueried: query.months,
    totalFetched: allItems.length,
    totalAfterFilter: filtered.length,
    area: computeAreaStats(allItems),
    complex: hasComplexFilter ? computeComplexStats(filtered, complexLabel) : null,
    areaCorrection: correctMarketStats(allItems),
    complexCorrection: hasComplexFilter && filtered.length > 0 ? correctMarketStats(filtered) : null,
    topComplexes: getTopComplexes(allItems, 12),
    umdBreakdown: getUmdBreakdown(allItems),
  };
}

// 구 안의 법정동별 거래수·평균 집계 — 클라이언트가 동 드롭다운 채움 + fallback 결정에 사용.
function getUmdBreakdown(items: RealpriceItem[]): UmdBreakdown[] {
  const counter = new Map<string, { count: number; sumAmount: number }>();
  for (const it of items) {
    if (!it.umdNm || it.dealAmount <= 0) continue;
    const e = counter.get(it.umdNm);
    if (e) {
      e.count++;
      e.sumAmount += it.dealAmount;
    } else {
      counter.set(it.umdNm, { count: 1, sumAmount: it.dealAmount });
    }
  }
  return [...counter.entries()]
    .map(([umdNm, v]) => ({
      umdNm,
      count: v.count,
      meanAmount: Math.round(v.sumAmount / v.count),
    }))
    .sort((a, b) => b.count - a.count);
}

// 단지명 매칭: 양방향 substring + 글자 chunk 매칭으로 사용자 입력 순서 변화·오타 일부 흡수.
function matchAptName(needle: string, hay: string): boolean {
  // 1. 정방향: 사용자 입력이 단지명에 포함됨
  if (hay.includes(needle)) return true;
  // 2. 역방향: 사용자 입력이 단지명을 포함 (사용자가 더 구체적으로 입력)
  if (needle.includes(hay)) return true;
  // 3. 3글자 sub-chunk가 단지명에 포함되면서, needle 길이의 70% 이상 chunk가 매칭
  if (needle.length < 4) return false;
  let matched = 0;
  let total = 0;
  for (let i = 0; i + 3 <= needle.length; i++) {
    total++;
    if (hay.includes(needle.slice(i, i + 3))) matched++;
  }
  return total > 0 && matched / total >= 0.7;
}

function getTopComplexes(items: RealpriceItem[], limit: number): { name: string; count: number; umdNm: string }[] {
  const counter = new Map<string, { count: number; umdNm: string }>();
  for (const it of items) {
    if (!it.aptNm) continue;
    const e = counter.get(it.aptNm);
    if (e) e.count++;
    else counter.set(it.aptNm, { count: 1, umdNm: it.umdNm });
  }
  return [...counter.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([name, v]) => ({ name, count: v.count, umdNm: v.umdNm }));
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

// IQR(사분위수 범위) 기반 outlier 필터.
// 평당가 기준으로 Q1-1.5*IQR ~ Q3+1.5*IQR 범위 밖을 제외.
// 표본이 4건 미만이면 트림하지 않음 (통계적 의미 없음).
function trimByIQR(items: RealpriceItem[]): { kept: RealpriceItem[]; excluded: RealpriceItem[] } {
  const valid = items.filter((it) => it.dealAmount > 0 && it.excluUseAr > 0);
  if (valid.length < 4) return { kept: valid, excluded: [] };
  const withPp = valid.map((it) => ({
    item: it,
    pp: it.dealAmount / (it.excluUseAr / SQM_PER_PYEONG),
  }));
  const sorted = [...withPp].sort((a, b) => a.pp - b.pp);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)].pp;
  const q3 = sorted[Math.floor(n * 0.75)].pp;
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  const kept: RealpriceItem[] = [];
  const excluded: RealpriceItem[] = [];
  for (const w of withPp) {
    if (w.pp >= low && w.pp <= high) kept.push(w.item);
    else excluded.push(w.item);
  }
  return { kept, excluded };
}

function computeAreaStats(items: RealpriceItem[]): AreaStats {
  const allAmounts = items.map((it) => it.dealAmount).filter((v) => v > 0);
  const { kept, excluded } = trimByIQR(items);
  const amounts = kept.map((it) => it.dealAmount);
  const pyeongPrices = kept.map((it) => it.dealAmount / (it.excluUseAr / SQM_PER_PYEONG));
  const recent = [...items].sort((a, b) => dateKey(b) - dateKey(a)).slice(0, 20);
  return {
    count: items.length,
    meanAmount: Math.round(mean(amounts)),
    medianAmount: Math.round(median(allAmounts)),
    meanPyeongPrice: Math.round(mean(pyeongPrices)),
    recent,
    excludedOutliers: excluded.length,
    rawMeanAmount: Math.round(mean(allAmounts)),
  };
}

function computeComplexStats(items: RealpriceItem[], aptName: string): ComplexStats {
  const allAmounts = items.map((it) => it.dealAmount).filter((v) => v > 0);
  const allAreas = items.map((it) => it.excluUseAr).filter((v) => v > 0);
  const { kept, excluded } = trimByIQR(items);
  const amounts = kept.map((it) => it.dealAmount);
  const pyeongPrices = kept.map((it) => it.dealAmount / (it.excluUseAr / SQM_PER_PYEONG));
  const sorted = [...items].sort((a, b) => dateKey(b) - dateKey(a));
  return {
    aptName,
    count: items.length,
    meanAmount: Math.round(mean(amounts)),
    meanArea: Math.round(mean(allAreas) * 10) / 10,
    meanPyeongPrice: Math.round(mean(pyeongPrices)),
    items: sorted.slice(0, 50),
    excludedOutliers: excluded.length,
    rawMeanAmount: Math.round(mean(allAmounts)),
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
