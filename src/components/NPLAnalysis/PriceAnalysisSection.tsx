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
    // 자동 계산
    const totalCost = next.mortgageSetupCost + next.appraisalCost + next.auctionCost;
    const purchaseMinusSenior = next.estimatedPurchase - purchaseInfo.senior110;
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
          {numField("매입 예상가 (만원)", "estimatedPurchase")}
          {numField("근저당설정비용 (만원)", "mortgageSetupCost")}
          {numField("감평비용 (만원)", "appraisalCost")}
          {numField("경매비용 (만원)", "auctionCost")}
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
