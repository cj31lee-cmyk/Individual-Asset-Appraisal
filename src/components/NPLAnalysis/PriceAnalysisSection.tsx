import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriceAnalysisInfo, PurchaseInfo, AnalysisParams } from "./types";
import { BarChart3 } from "lucide-react";
import { useEffect } from "react";
import { FormattedNumberInput } from "./FormattedNumberInput";

interface Props {
  data: PriceAnalysisInfo;
  purchaseInfo: PurchaseInfo;
  params: AnalysisParams;
  onChange: (data: PriceAnalysisInfo) => void;
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

export function PriceAnalysisSection({ data, purchaseInfo, params, onChange }: Props) {
  // 보유기간(개월)을 연 단위로 환산. 0이면 1년 기본
  const years = (params.holdingMonths || 12) / 12;
  const update = (key: keyof PriceAnalysisInfo, value: number) => {
    const next = { ...data, [key]: value };

    // 매입예상가 = KB시세 × 낙찰가율(%)
    if (key === "kbPrice" || key === "bidRate") {
      const kb = key === "kbPrice" ? value : next.kbPrice;
      const rate = key === "bidRate" ? value : next.bidRate;
      if (kb > 0 && rate > 0) {
        next.estimatedPurchase = Math.round(kb * rate / 100);
      }
    }

    // 근저당설정비용 = 매입예상가 × 0.4%
    next.mortgageSetupCost = Math.round(next.estimatedPurchase * 0.004);

    // 감평비용: 매입예상가 기준 구간별 (원 단위)
    if (next.estimatedPurchase <= 50000000) next.appraisalCost = 300000;
    else if (next.estimatedPurchase <= 100000000) next.appraisalCost = 500000;
    else if (next.estimatedPurchase <= 500000000) next.appraisalCost = 800000;
    else next.appraisalCost = 1200000;

    // 경매비용(예납금): 약 0.3% (최소 50만원 = 500,000원)
    const auctionBase = Math.round(next.estimatedPurchase * 0.003);
    next.auctionCost = Math.max(auctionBase, 500000);

    // 비용합계
    next.totalCost = next.mortgageSetupCost + next.appraisalCost + next.auctionCost;

    // 회수예상가 = 매입예상가 - 선순위110%
    next.purchaseMinusSenior = next.estimatedPurchase - purchaseInfo.senior110;

    // 최종매입가 = 회수예상가 × (1 - 할인율/100)^(보유기간/12)  [연 복리 할인]
    const discountRate = next.discountRate > 0 ? next.discountRate : 0;
    const factor = Math.pow(1 - discountRate / 100, years);
    next.finalPurchasePrice = Math.round(next.purchaseMinusSenior * factor);
    // 채권매입가 = 회수예상가 - 최종매입가  (총 할인액)
    next.loanPurchasePrice = next.purchaseMinusSenior - next.finalPurchasePrice;

    onChange(next);
  };

  // purchaseInfo / params 변경 시 재계산
  useEffect(() => {
    const next = { ...data };
    next.purchaseMinusSenior = next.estimatedPurchase - purchaseInfo.senior110;
    const discountRate = next.discountRate > 0 ? next.discountRate : 0;
    const factor = Math.pow(1 - discountRate / 100, years);
    next.finalPurchasePrice = Math.round(next.purchaseMinusSenior * factor);
    next.loanPurchasePrice = next.purchaseMinusSenior - next.finalPurchasePrice;
    next.totalCost = next.mortgageSetupCost + next.appraisalCost + next.auctionCost;

    // 배당기일까지 이자 = 이자 + (이자 × 연체이율 × 연체일수)
    //   연체이율은 % 단위 → /100, 연체일수는 일 단위(연이율 기준) → /365
    const i = purchaseInfo.interest;
    const r = purchaseInfo.overdueRate;
    const d = purchaseInfo.overdueDays;
    next.interestUntilDividend = Math.round(i + (i * (r / 100) * (d / 365)));

    if (
      next.purchaseMinusSenior !== data.purchaseMinusSenior ||
      next.loanPurchasePrice !== data.loanPurchasePrice ||
      next.finalPurchasePrice !== data.finalPurchasePrice ||
      next.interestUntilDividend !== data.interestUntilDividend
    ) {
      onChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseInfo.senior110, purchaseInfo.principalInterest, purchaseInfo.interest, purchaseInfo.overdueRate, purchaseInfo.overdueDays, params.holdingMonths]);

  const numField = (label: string, key: keyof PriceAnalysisInfo, placeholder = "0") => (
    <div>
      <label className="input-label">{label}</label>
      <Input
        type="number"
        placeholder={placeholder}
        value={(data[key] as number) || ""}
        onChange={(e) => update(key, Number(e.target.value))}
      />
    </div>
  );

  const moneyField = (label: string, key: keyof PriceAnalysisInfo, placeholder = "0") => (
    <div>
      <label className="input-label">{label}</label>
      <FormattedNumberInput
        placeholder={placeholder}
        value={data[key] as number}
        onChange={(v) => update(key, v)}
      />
    </div>
  );

  const readonlyField = (label: string, value: number, highlight = false) => (
    <div>
      <label className="input-label">{label}</label>
      <div className={`h-10 px-3 rounded-md border border-input flex items-center text-sm font-semibold tabular-nums ${
        highlight
          ? value >= 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-red-500/10 text-red-600 border-red-500/30"
          : "bg-muted/50 text-foreground"
      }`}>
        {formatNum(value)} 원
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="section-title !mb-0">
          <BarChart3 className="w-5 h-5" />
          매입가격 분석 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {readonlyField("배당기일까지 이자 (원)", data.interestUntilDividend)}
          {moneyField("실거래가격 (원)", "actualTransPrice")}
          {moneyField("KB시세 (원)", "kbPrice")}
          {numField("낙찰가율 (%)", "bidRate")}
        </div>
        {purchaseInfo.interest > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
            💡 배당기일까지 이자 = 이자 + (이자 × 연체이율 × 연체일수 ÷ 365) ={" "}
            <span className="font-semibold text-foreground">{formatNum(data.interestUntilDividend)} 원</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {readonlyField("매입 예상가 (원)", data.estimatedPurchase)}
          <div>
            <label className="input-label">할인율 (%)</label>
            <Input
              type="number"
              placeholder="0"
              value={data.discountRate || ""}
              onChange={(e) => update("discountRate", Number(e.target.value))}
              className="border-red-500 focus-visible:ring-red-500"
            />
          </div>
          {readonlyField("채권매입가 (원)", data.loanPurchasePrice, true)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {readonlyField("근저당설정비용 (원)", data.mortgageSetupCost)}
          {readonlyField("감평비용 (원)", data.appraisalCost)}
          {readonlyField("경매비용 (원)", data.auctionCost)}
          {readonlyField("비용합계 (원)", data.totalCost)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {readonlyField("회수예상가 (원)", data.purchaseMinusSenior, true)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {readonlyField("최종매입가 (원)", data.finalPurchasePrice, true)}
        </div>
      </CardContent>
    </Card>
  );
}
