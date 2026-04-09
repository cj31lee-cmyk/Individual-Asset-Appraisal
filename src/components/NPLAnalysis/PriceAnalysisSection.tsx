import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriceAnalysisInfo, PurchaseInfo } from "./types";
import { BarChart3 } from "lucide-react";

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

    // 감평비용: 매입예상가 기준 구간별
    if (next.estimatedPurchase <= 5000) next.appraisalCost = 30;
    else if (next.estimatedPurchase <= 10000) next.appraisalCost = 50;
    else if (next.estimatedPurchase <= 50000) next.appraisalCost = 80;
    else next.appraisalCost = 120;

    // 경매비용(예납금): 약 0.3% (최소 50만원)
    const auctionBase = Math.round(next.estimatedPurchase * 0.003);
    next.auctionCost = Math.max(auctionBase, 50);

    // 비용합계
    next.totalCost = next.mortgageSetupCost + next.appraisalCost + next.auctionCost;

    // 회수예상가 = 매입예상가 - 선순위110%
    next.purchaseMinusSenior = next.estimatedPurchase - purchaseInfo.senior110;

    // 채권매입가 = 회수예상가 × 할인율
    const discountRate = next.discountRate > 0 ? next.discountRate : 0;
    next.loanPurchasePrice = Math.round(next.purchaseMinusSenior * discountRate / 100);

    // 최종매입가 = 채권매입가 + 비용합계
    next.finalPurchasePrice = next.loanPurchasePrice + next.totalCost;

    onChange(next);
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
          ? value >= 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-red-500/10 text-red-600 border-red-500/30"
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
          {readonlyField("매입 예상가 (회수가)", data.estimatedPurchase)}
          {numField("할인율 (%)", "discountRate")}
          {readonlyField("채권매입가 (회수예상가×할인율)", data.loanPurchasePrice, true)}
          {readonlyField("근저당설정비용 (0.4%)", data.mortgageSetupCost)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {readonlyField("감평비용", data.appraisalCost)}
          {readonlyField("경매비용 (0.3%)", data.auctionCost)}
          {readonlyField("비용합계", data.totalCost)}
          {readonlyField("회수예상가 (매입예상가-선순위)", data.purchaseMinusSenior, true)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {readonlyField("최종매입가 (채권매입가+비용)", data.finalPurchasePrice, true)}
        </div>
      </CardContent>
    </Card>
  );
}
