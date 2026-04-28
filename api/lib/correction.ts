// 룰 기반 보정 로직 — 이상치 제거, 직거래 제외, 시간 가중치, 추세 분석.
// LLM 없이 통계 알고리즘으로 "보정 시세 / 보정 낙찰가율 / 신뢰도" 산출.

import type { RealpriceItem } from "./realprice.js";

const SQM_PER_PYEONG = 3.305785;
const HALF_LIFE_MONTHS = 6;        // 시간 가중치 반감기
// 이상치 제거: IQR(사분위수 범위) 기반 — Q1-1.5*IQR ~ Q3+1.5*IQR 범위 밖을 제외.
// 표본이 4건 미만이면 트림하지 않음.

export interface CorrectionResult {
  // 보정 결과
  correctedMeanAmount: number;        // 보정 평균 거래가 (만원)
  correctedMeanPyeongPrice: number;   // 보정 평당가 (만원)
  // 메타
  totalInput: number;                 // 입력 거래 수
  excludedOutlier: number;            // 이상치로 제외된 건수
  excludedDirectDeal: number;         // 직거래 제외 건수
  usedCount: number;                  // 보정에 실제 사용된 건수
  // 추세
  trendDirection: "up" | "down" | "stable";
  trendDeltaPct: number;              // 최근 절반 vs 이전 절반 평균 변화율 (%)
  // 신뢰도
  confidenceStars: 1 | 2 | 3 | 4 | 5;
  cv: number;                         // 변동계수 (stddev / mean)
}

export function correctMarketStats(items: RealpriceItem[]): CorrectionResult | null {
  if (items.length === 0) return null;

  const totalInput = items.length;

  // 1. 직거래 제외
  const noDirect = items.filter((it) => it.dealingGbn !== "직거래");
  const excludedDirectDeal = totalInput - noDirect.length;

  if (noDirect.length === 0) return null;

  // 2. 평당가 계산 (정규화 단위)
  const withPyeong = noDirect
    .filter((it) => it.dealAmount > 0 && it.excluUseAr > 0)
    .map((it) => ({
      ...it,
      pyeongPrice: it.dealAmount / (it.excluUseAr / SQM_PER_PYEONG),
    }));

  // 3. 이상치 제거 (평당가 기준 IQR 트림)
  const sortedByPp = [...withPyeong].sort((a, b) => a.pyeongPrice - b.pyeongPrice);
  const trimmed = (() => {
    const n = sortedByPp.length;
    if (n < 4) return sortedByPp;
    const q1 = sortedByPp[Math.floor(n * 0.25)].pyeongPrice;
    const q3 = sortedByPp[Math.floor(n * 0.75)].pyeongPrice;
    const iqr = q3 - q1;
    const low = q1 - 1.5 * iqr;
    const high = q3 + 1.5 * iqr;
    return sortedByPp.filter((x) => x.pyeongPrice >= low && x.pyeongPrice <= high);
  })();
  const excludedOutlier = sortedByPp.length - trimmed.length;

  if (trimmed.length === 0) return null;

  // 4. 시간 가중 평균 (최근 거래에 더 큰 weight)
  const now = new Date();
  const weighted = trimmed.map((it) => {
    const date = new Date(it.dealYear, it.dealMonth - 1, it.dealDay || 15);
    const monthsAgo = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    const weight = Math.pow(0.5, monthsAgo / HALF_LIFE_MONTHS);
    return { item: it, weight };
  });

  const sumWeight = weighted.reduce((a, b) => a + b.weight, 0);
  const correctedMeanPyeongPrice =
    weighted.reduce((acc, w) => acc + w.item.pyeongPrice * w.weight, 0) / sumWeight;
  const correctedMeanAmount =
    weighted.reduce((acc, w) => acc + w.item.dealAmount * w.weight, 0) / sumWeight;

  // 5. 추세 (시간순 정렬 후 최근 절반 vs 이전 절반 평균 평당가)
  const sortedByDate = [...trimmed].sort((a, b) => {
    const ka = a.dealYear * 10000 + a.dealMonth * 100 + a.dealDay;
    const kb = b.dealYear * 10000 + b.dealMonth * 100 + b.dealDay;
    return ka - kb;
  });
  const half = Math.floor(sortedByDate.length / 2);
  const earlier = sortedByDate.slice(0, half);
  const recent = sortedByDate.slice(half);
  const earlierMean = mean(earlier.map((it) => it.pyeongPrice));
  const recentMean = mean(recent.map((it) => it.pyeongPrice));
  const trendDeltaPct =
    earlierMean > 0 ? Math.round(((recentMean - earlierMean) / earlierMean) * 1000) / 10 : 0;
  const trendDirection: "up" | "down" | "stable" =
    Math.abs(trendDeltaPct) < 1 ? "stable" : trendDeltaPct > 0 ? "up" : "down";

  // 6. 신뢰도 (표본 수 + 변동계수)
  const pyeongPrices = trimmed.map((it) => it.pyeongPrice);
  const meanPp = mean(pyeongPrices);
  const stdDev = Math.sqrt(mean(pyeongPrices.map((v) => (v - meanPp) ** 2)));
  const cv = meanPp > 0 ? stdDev / meanPp : 1;

  const sizeScore = trimmed.length >= 100 ? 5 : trimmed.length >= 30 ? 4 : trimmed.length >= 10 ? 3 : trimmed.length >= 3 ? 2 : 1;
  const stabilityScore = cv < 0.1 ? 5 : cv < 0.2 ? 4 : cv < 0.3 ? 3 : cv < 0.5 ? 2 : 1;
  const confidenceRaw = Math.round((sizeScore + stabilityScore) / 2);
  const confidenceStars = Math.max(1, Math.min(5, confidenceRaw)) as 1 | 2 | 3 | 4 | 5;

  return {
    correctedMeanAmount: Math.round(correctedMeanAmount),
    correctedMeanPyeongPrice: Math.round(correctedMeanPyeongPrice),
    totalInput,
    excludedOutlier,
    excludedDirectDeal,
    usedCount: trimmed.length,
    trendDirection,
    trendDeltaPct,
    confidenceStars,
    cv: Math.round(cv * 1000) / 1000,
  };
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
