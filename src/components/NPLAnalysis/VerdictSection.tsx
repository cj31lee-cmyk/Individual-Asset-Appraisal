import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PurchaseInfo, PriceAnalysisInfo, AnalysisParams } from "./types";
import { CheckCircle2, XCircle, AlertTriangle, Gavel, ArrowDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface Props {
  purchaseInfo: PurchaseInfo;
  priceAnalysis: PriceAnalysisInfo;
  params: AnalysisParams;
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

export function VerdictSection({ purchaseInfo, priceAnalysis, params }: Props) {
  const analysis = useMemo(() => {
    const principalInterest = purchaseInfo.principalInterest;
    const discountRate = priceAnalysis.discountRate;
    const loanPurchasePrice = priceAnalysis.loanPurchasePrice; // 채권매입가 (원리금 × 할인율)

    // 회수예상가 = 매입예상가(KB시세×낙찰가율) - 선순위110%
    const recoveryEstimate = priceAnalysis.purchaseMinusSenior;

    // 조달이자 (보유기간 동안)
    const fundingCost = Math.round(
      (params.fundingAmount * (params.fundingRate / 100) * params.holdingMonths) / 12
    );

    // 총 운영비용
    const totalOperatingCost =
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

    // 분석비용 (근저당설정, 감평, 경매)
    const analysisCost = priceAnalysis.totalCost;

    // 총투자금 = 채권매입가 + 분석비용 + 운영비용
    const totalInvestment = loanPurchasePrice + analysisCost + totalOperatingCost;

    // 예상수익 = 회수예상가 - 총투자금
    const expectedProfit = recoveryEstimate - totalInvestment;

    // 수익률 = 예상수익 / 채권매입가 × 100
    const roi = loanPurchasePrice > 0 ? (expectedProfit / loanPurchasePrice) * 100 : 0;

    // 판정
    let verdict: "buy" | "caution" | "reject";
    let verdictText: string;
    let verdictDescription: string;

    if (loanPurchasePrice <= 0) {
      verdict = "reject";
      verdictText = "매입 불가";
      verdictDescription = "채권매입가가 산출되지 않았습니다. 원리금과 할인율을 확인해주세요.";
    } else if (roi >= 15) {
      verdict = "buy";
      verdictText = "매입 추천";
      verdictDescription = `예상 수익률 ${roi.toFixed(1)}%로 목표 수익률을 충족합니다. 본 채권은 매입을 적극 검토할 만합니다.`;
    } else if (roi >= 5) {
      verdict = "caution";
      verdictText = "조건부 매입";
      verdictDescription = `예상 수익률 ${roi.toFixed(1)}%로 수익성은 있으나, 리스크 대비 마진이 낮습니다. 할인율 조정 또는 비용 절감이 필요합니다.`;
    } else {
      verdict = "reject";
      verdictText = "매입 부적격";
      verdictDescription = `예상 수익률 ${roi.toFixed(1)}%로 투자 대비 수익성이 부족합니다. 매입을 재고하시기 바랍니다.`;
    }

    return {
      principalInterest,
      discountRate,
      loanPurchasePrice,
      recoveryEstimate,
      fundingCost,
      totalOperatingCost,
      analysisCost,
      totalInvestment,
      expectedProfit,
      roi,
      verdict,
      verdictText,
      verdictDescription,
      kbPrice: priceAnalysis.kbPrice,
      actualTransPrice: priceAnalysis.actualTransPrice,
      bidRate: priceAnalysis.bidRate,
      senior110: purchaseInfo.senior110,
      estimatedPurchase: priceAnalysis.estimatedPurchase,
      holdingMonths: params.holdingMonths,
    };
  }, [purchaseInfo, priceAnalysis, params]);

  const hasData = analysis.loanPurchasePrice > 0 || analysis.estimatedPurchase > 0;

  if (!hasData) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-16 text-center">
          <Gavel className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm font-medium">
            매입 정보와 분석 데이터를 입력하면
          </p>
          <p className="text-muted-foreground text-sm">
            매입 판정 결과가 여기에 표시됩니다
          </p>
        </CardContent>
      </Card>
    );
  }

  const verdictConfig = {
    buy: {
      icon: CheckCircle2,
      bgClass: "bg-emerald-500/10 border-emerald-500/40",
      textClass: "text-emerald-600",
      badgeBg: "bg-emerald-500",
      glowClass: "shadow-[0_0_40px_-10px_hsl(152,55%,42%,0.3)]",
    },
    caution: {
      icon: AlertTriangle,
      bgClass: "bg-amber-500/10 border-amber-500/40",
      textClass: "text-amber-600",
      badgeBg: "bg-amber-500",
      glowClass: "shadow-[0_0_40px_-10px_hsl(38,92%,50%,0.3)]",
    },
    reject: {
      icon: XCircle,
      bgClass: "bg-red-500/10 border-red-500/40",
      textClass: "text-red-600",
      badgeBg: "bg-red-500",
      glowClass: "shadow-[0_0_40px_-10px_hsl(0,72%,51%,0.3)]",
    },
  };

  const config = verdictConfig[analysis.verdict];
  const VerdictIcon = config.icon;

  return (
    <div className="space-y-4">
      {/* 최종 판정 카드 */}
      <Card className={`${config.bgClass} ${config.glowClass} border-2 overflow-hidden relative`}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <VerdictIcon className="w-full h-full" />
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={`${config.badgeBg} text-white text-xs font-bold px-3 py-1 rounded-full`}>
              매입 판정
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <VerdictIcon className={`w-10 h-10 ${config.textClass}`} />
            <div>
              <h2 className={`text-2xl font-black ${config.textClass}`}>
                {analysis.verdictText}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                {analysis.verdictDescription}
              </p>
            </div>
          </div>

          <Separator />

          {/* 핵심 수치 요약 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card/80 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">채권매입가</p>
              <p className="text-lg font-black tabular-nums text-foreground">
                {formatNum(analysis.loanPurchasePrice)}
                <span className="text-xs font-normal ml-1">만원</span>
              </p>
            </div>
            <div className="bg-card/80 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">예상 수익</p>
              <p className={`text-lg font-black tabular-nums ${
                analysis.expectedProfit >= 0 ? "text-emerald-600" : "text-red-600"
              }`}>
                {formatNum(analysis.expectedProfit)}
                <span className="text-xs font-normal ml-1">만원</span>
              </p>
            </div>
            <div className="bg-card/80 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">예상 수익률</p>
              <p className={`text-lg font-black tabular-nums ${
                analysis.roi >= 15 ? "text-emerald-600" : analysis.roi >= 5 ? "text-amber-600" : "text-red-600"
              }`}>
                {analysis.roi.toFixed(1)}
                <span className="text-xs font-normal ml-0.5">%</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 투자 흐름 요약 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="section-title !mb-0">
            <TrendingUp className="w-5 h-5" />
            투자 흐름 분석 ({analysis.holdingMonths}개월 보유 기준)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="calc-row">
            <span className="calc-label">원리금 (대출잔액+이자)</span>
            <span className="calc-value">{formatNum(analysis.principalInterest)} 만원</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">할인율</span>
            <span className="calc-value">{analysis.discountRate}%</span>
          </div>
          <div className="calc-row border-t border-dashed border-border/80">
            <span className="calc-label font-semibold">① 채권매입가 (원리금 × 할인율)</span>
            <span className="calc-value font-bold">{formatNum(analysis.loanPurchasePrice)} 만원</span>
          </div>

          <div className="calc-row mt-2">
            <span className="calc-label">KB시세</span>
            <span className="calc-value">{formatNum(analysis.kbPrice)} 만원</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">낙찰가율</span>
            <span className="calc-value">{analysis.bidRate}%</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">매입예상가 (KB시세×낙찰가율)</span>
            <span className="calc-value">{formatNum(analysis.estimatedPurchase)} 만원</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">선순위 110%</span>
            <span className="calc-value text-red-600">-{formatNum(analysis.senior110)} 만원</span>
          </div>
          <div className="calc-row border-t border-dashed border-border/80">
            <span className="calc-label font-semibold">② 회수예상가 (경매 배당)</span>
            <span className={`calc-value font-bold ${analysis.recoveryEstimate >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatNum(analysis.recoveryEstimate)} 만원
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 비용 & 수익 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="section-title !mb-0">
            <ArrowDown className="w-5 h-5" />
            비용 · 수익 계산
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="calc-row">
            <span className="calc-label">② 회수예상가</span>
            <span className="calc-value text-emerald-600">{formatNum(analysis.recoveryEstimate)} 만원</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">① 채권매입가</span>
            <span className="calc-value text-red-600">-{formatNum(analysis.loanPurchasePrice)} 만원</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">분석비용 (근저당+감평+경매)</span>
            <span className="calc-value text-red-600">-{formatNum(analysis.analysisCost)} 만원</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">조달이자 ({params.holdingMonths}개월)</span>
            <span className="calc-value text-red-600">-{formatNum(analysis.fundingCost)} 만원</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">운영비용 (인건비·명도·기타)</span>
            <span className="calc-value text-red-600">-{formatNum(analysis.totalOperatingCost - analysis.fundingCost)} 만원</span>
          </div>

          <div className="calc-row border-t-2 border-border bg-muted/30 rounded -mx-4 px-4">
            <span className="calc-label font-semibold text-foreground">예상 수익</span>
            <span className={`text-base font-bold tabular-nums ${
              analysis.expectedProfit >= 0 ? "text-emerald-600" : "text-red-600"
            }`}>
              {formatNum(analysis.expectedProfit)} 만원
            </span>
          </div>

          {/* 수익률 바 */}
          <div className="pt-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-muted-foreground">투자수익률 (ROI)</span>
              <span className={`text-sm font-bold tabular-nums ${
                analysis.roi >= 15 ? "text-emerald-600" : analysis.roi >= 5 ? "text-amber-600" : "text-red-600"
              }`}>
                {analysis.roi.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  analysis.roi >= 15 ? "bg-emerald-500" : analysis.roi >= 5 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(Math.max(analysis.roi, 0), 50) * 2}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">0%</span>
              <span className="text-[10px] text-muted-foreground/60">5%</span>
              <span className="text-[10px] text-muted-foreground/60">15%</span>
              <span className="text-[10px] text-muted-foreground">50%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
