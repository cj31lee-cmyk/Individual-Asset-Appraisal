import { useState } from "react";
import type { AnalysisParams, PurchaseInfo, PriceAnalysisInfo } from "./types";
import { RightsSection } from "./RightsSection";
import { ParamsSection } from "./ParamsSection";
import { PurchaseInfoSection } from "./PurchaseInfoSection";
import { PriceAnalysisSection } from "./PriceAnalysisSection";
import { VerdictSection } from "./VerdictSection";
import type { RightsItem } from "./types";
import { Landmark } from "lucide-react";

export function NPLAnalysisTool() {
  const [rights, setRights] = useState<RightsItem[]>([]);
  const [params, setParams] = useState<AnalysisParams>({
    marketPrice: 0,
    fundingRate: 5.5,
    holdingMonths: 6,
    fundingAmount: 0,
    laborCost: 0,
    managementCost: 0,
    legalFee: 0,
    auctionCost: 500,
    appraisalFee: 0,
    evictionCost: 300,
    brokerageFee: 0,
    transferTax: 0,
    miscCost: 0,
  });

  const [purchaseInfo, setPurchaseInfo] = useState<PurchaseInfo>({
    seller: "",
    productNumber: "",
    name: "",
    address: "",
    loanBalance: 0,
    interest: 0,
    principalInterest: 0,
    legalCost: 0,
    seniorMaxAmount: 0,
    senior110: 0,
    seniorPrincipal: 0,
    interestRate: 0,
    overdueRate: 0,
    overdueDays: 0,
    remarks: "",
  });

  const [priceAnalysis, setPriceAnalysis] = useState<PriceAnalysisInfo>({
    interestUntilDividend: 0,
    actualTransPrice: 0,
    kbPrice: 0,
    bidRate: 0,
    estimatedPurchase: 0,
    mortgageSetupCost: 0,
    appraisalCost: 0,
    auctionCost: 0,
    totalCost: 0,
    purchaseMinusSenior: 0,
    finalPurchasePrice: 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Landmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">NPL 채권매입 적정가 분석</h1>
            <p className="text-xs text-muted-foreground">부실채권 매입 의사결정 지원 도구</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 섹터 1: 매입 정보 */}
        <PurchaseInfoSection data={purchaseInfo} onChange={setPurchaseInfo} />

        {/* 섹터 2: 매입가격 분석 정보 */}
        <PriceAnalysisSection data={priceAnalysis} purchaseInfo={purchaseInfo} onChange={setPriceAnalysis} />

        {/* 분석 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RightsSection items={rights} onChange={setRights} />
              <ParamsSection data={params} onChange={setParams} />
            </div>
          </div>

          {/* 최종 판정 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <VerdictSection
                purchaseInfo={purchaseInfo}
                priceAnalysis={priceAnalysis}
                params={params}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
