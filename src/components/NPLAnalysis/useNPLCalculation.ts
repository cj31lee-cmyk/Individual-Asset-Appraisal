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

    // 총 비용 계산
    const fundingCost = Math.round(
      (params.fundingAmount * (params.fundingRate / 100) * params.holdingMonths) / 12
    );
    const totalCost =
      fundingCost +
      params.laborCost +
      params.managementCost +
      params.legalFee +
      params.auctionCost +
      params.appraisalFee +
      params.evictionCost +
      params.brokerageFee +
      params.transferTax +
      params.miscCost;

    // 채권 회수가 = 예상 낙찰가 - 인수금액 - 총비용
    const recoveryPrice = expectedWinningBid - totalAssumption - totalCost;

    // 수익률 = 회수가 / 매입가 (매입가를 알 수 없으면 회수가 자체를 적정가로)
    const fairPurchasePrice = recoveryPrice;

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
