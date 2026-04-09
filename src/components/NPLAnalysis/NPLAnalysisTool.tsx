import { useState } from "react";
import type { AnalysisParams, PurchaseInfo, PriceAnalysisInfo } from "./types";
import { RightsSection } from "./RightsSection";
import { ParamsSection } from "./ParamsSection";
import { PurchaseInfoSection } from "./PurchaseInfoSection";
import { PriceAnalysisSection } from "./PriceAnalysisSection";
import { VerdictSection } from "./VerdictSection";
import { Button } from "@/components/ui/button";
import type { RightsItem } from "./types";
import { Landmark, Sparkles } from "lucide-react";

export function NPLAnalysisTool() {
  const [rights, setRights] = useState<RightsItem[]>([]);
  const [showVerdict, setShowVerdict] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setShowVerdict(false);
    // 분석 애니메이션
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowVerdict(true);
    }, 1500);
  };

  // 데이터 변경 시 결과 숨기기
  const handlePurchaseChange = (data: PurchaseInfo) => {
    setPurchaseInfo(data);
    setShowVerdict(false);
  };
  const handlePriceChange = (data: PriceAnalysisInfo) => {
    setPriceAnalysis(data);
    setShowVerdict(false);
  };
  const handleParamsChange = (data: AnalysisParams) => {
    setParams(data);
    setShowVerdict(false);
  };
  const handleRightsChange = (items: RightsItem[]) => {
    setRights(items);
    setShowVerdict(false);
  };

  const hasMinData = priceAnalysis.estimatedPurchase > 0 || purchaseInfo.loanBalance > 0;

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
        <PurchaseInfoSection data={purchaseInfo} onChange={handlePurchaseChange} />

        {/* 섹터 2: 매입가격 분석 정보 */}
        <PriceAnalysisSection data={priceAnalysis} purchaseInfo={purchaseInfo} onChange={handlePriceChange} />

        {/* 분석 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RightsSection items={rights} onChange={handleRightsChange} />
          <ParamsSection data={params} onChange={handleParamsChange} />
        </div>

        {/* 분석 실행 버튼 */}
        <div className="flex justify-center py-4">
          <Button
            size="lg"
            disabled={!hasMinData || isAnalyzing}
            onClick={handleAnalyze}
            className="relative h-14 px-12 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                분석 중...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                매입 판정 분석 실행
              </span>
            )}
          </Button>
        </div>
        {!hasMinData && (
          <p className="text-center text-xs text-muted-foreground -mt-2">
            매입 정보 또는 매입가격 분석 정보를 입력한 후 분석을 실행해주세요
          </p>
        )}

        {/* 결과 (애니메이션 reveal) */}
        <div
          className={`transition-all duration-700 ease-out ${
            showVerdict
              ? "opacity-100 translate-y-0 max-h-[3000px]"
              : "opacity-0 translate-y-8 max-h-0 overflow-hidden"
          }`}
        >
          <VerdictSection
            purchaseInfo={purchaseInfo}
            priceAnalysis={priceAnalysis}
            params={params}
          />
        </div>
      </main>
    </div>
  );
}
