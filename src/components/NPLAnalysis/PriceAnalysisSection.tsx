import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriceAnalysisInfo, PurchaseInfo } from "./types";
import { BarChart3 } from "lucide-react";
import { useMemo } from "react";

interface Props {
  data: PriceAnalysisInfo;
  purchaseInfo: PurchaseInfo;
  onChange: (data: PriceAnalysisInfo) => void;
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

export function PriceAnalysisSection({ data, purchaseInfo, onChange }: Props) {
  const update = (key: keyof PriceAnalysisInfo, value: number) => {
    const next = { ...data, [key]: value };

    // 매입예상가 자동계산: KB시세 × 낙찰가율(%)
    if (key === "kbPrice" || key === "bidRate") {
      const kb = key === "kbPrice" ? value : next.kbPrice;
      const rate = key === "bidRate" ? value : next.bidRate;
      if (kb > 0 && rate > 0) {
        next.estimatedPurchase = Math.round(kb * rate / 100);
      }
    }

    // 근저당설정비용 = 매입예상가 × 0.4%
    next.mortgageSetupCost = Math.round(next.estimatedPurchase * 0.004);

    // 감평비용: 매입예상가 기준 구간별
    if (next.estimatedPurchase <= 5000) next.appraisalCost = 30;
    else if (next.estimatedPurchase <= 10000) next.appraisalCost = 50;
    else if (next.estimatedPurchase <= 50000) next.appraisalCost = 80;
    else next.appraisalCost = 120;

    // 경매비용(예납금): 감정가 기준 약 0.3%  (최소 50만원)
    const auctionBase = Math.round(next.estimatedPurchase * 0.003);
    next.auctionCost = Math.max(auctionBase, 50);

    // 비용합계
    const totalCost = next.mortgageSetupCost + next.appraisalCost + next.auctionCost;
    // 매입예상가 - 선순위110%
    const purchaseMinusSenior = next.estimatedPurchase - purchaseInfo.senior110;
    // 최종매입가
    const finalPurchasePrice = purchaseMinusSenior - totalCost;

    onChange({
      ...next,
      totalCost,
      purchaseMinusSenior,
      finalPurchasePrice,
    });
  };

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

  const readonlyField = (label: string, value: number, highlight = false) => (
    <div>
      <label className="input-label">{label}</label>
      <div className={`h-10 px-3 rounded-md border border-input flex items-center text-sm font-semibold tabular-nums ${
        highlight 
          ? value >= 0 ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
          : "bg-muted/50 text-foreground"
      }`}>
        {formatNum(value)} 만원
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
          {numField("배당기일까지 이자 (만원)", "interestUntilDividend")}
          {numField("실거래가격 (만원)", "actualTransPrice")}
          {numField("KB시세 (만원)", "kbPrice")}
          {numField("낙찰가율 (%)", "bidRate")}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {readonlyField("매입 예상가", data.estimatedPurchase)}
          {readonlyField("근저당설정비용 (0.4%)", data.mortgageSetupCost)}
          {readonlyField("감평비용", data.appraisalCost)}
          {readonlyField("경매비용 (0.3%)", data.auctionCost)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {readonlyField("비용합계", data.totalCost)}
          {readonlyField("매입예상가 - 선순위110%", data.purchaseMinusSenior, true)}
          {readonlyField("최종매입가", data.finalPurchasePrice, true)}
        </div>
      </CardContent>
    </Card>
  );
}
