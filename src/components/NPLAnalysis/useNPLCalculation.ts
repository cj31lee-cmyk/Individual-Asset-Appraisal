import { useMemo } from "react";
import type { CaseInfo, RightsItem, ComparableCase, AnalysisParams, CalculationResult } from "./types";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function useNPLCalculation(
  caseInfo: CaseInfo,
  rights: RightsItem[],
  comparables: ComparableCase[],
  params: AnalysisParams
): CalculationResult | null {
  return useMemo(() => {
    if (comparables.length === 0 || !params.marketPrice || !caseInfo.appraisalPrice) return null;

    const bidRates = comparables.map((c) => c.bidRate);
    const medianBidRate = median(bidRates);

    // 시세 보정: 현재 시세 / 감정가 비율
    const priceRatio = params.marketPrice / caseInfo.appraisalPrice;
    const adjustedBidRate = medianBidRate * priceRatio;

    // 인수권리 합산
    const totalAssumption = rights.reduce((sum, r) => sum + (r.amount || 0), 0);
    const rightsDiscount = totalAssumption;

    // 예상 낙찰가 = 감정가 × 보정 낙찰가율
    const expectedWinningBid = caseInfo.appraisalPrice * (adjustedBidRate / 100);

    // 채권 회수가
    const recoveryPrice = expectedWinningBid - totalAssumption - params.auctionCost - params.evictionCost;

    // 채권 매입 적정가
    const fairPurchasePrice = recoveryPrice * (1 - params.targetReturnRate / 100);

    return {
      medianBidRate,
      adjustedBidRate,
      rightsDiscount,
      expectedWinningBid,
      totalAssumption,
      recoveryPrice,
      fairPurchasePrice,
    };
  }, [caseInfo, rights, comparables, params]);
}
