import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalculationResult } from "./types";
import { Calculator, TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  result: CalculationResult | null;
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

export function ResultSection({ result }: Props) {
  if (!result) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Calculator className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            사건 정보와 유사사례를 입력하면<br />자동으로 적정가가 산출됩니다
          </p>
        </CardContent>
      </Card>
    );
  }

  const isPositive = result.fairPurchasePrice > 0;

  return (
    <div className="space-y-4">
      {/* 핵심 결과 */}
      <Card className="border-accent/40 bg-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="section-title !mb-0 !text-accent-foreground">
            {isPositive ? <TrendingUp className="w-5 h-5 text-success" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
            채권 매입 적정가
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold tabular-nums ${isPositive ? "text-success" : "text-destructive"}`}>
            {formatNum(result.fairPurchasePrice)} 만원
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            채권 회수가 × (1 - 목표수익률)
          </p>
        </CardContent>
      </Card>

      {/* 산출 과정 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="section-title !mb-0">
            <Calculator className="w-5 h-5" />
            산출 과정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="calc-row">
            <span className="calc-label">유사사례 낙찰가율 중앙값</span>
            <span className="calc-value">{result.medianBidRate.toFixed(1)}%</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">시세 보정 낙찰가율</span>
            <span className="calc-value">{result.adjustedBidRate.toFixed(1)}%</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">예상 낙찰가</span>
            <span className="calc-value">{formatNum(result.expectedWinningBid)} 만원</span>
          </div>
          <div className="calc-row">
            <span className="calc-label">인수금액 (권리 디스카운트)</span>
            <span className="calc-value text-destructive">-{formatNum(result.rightsDiscount)} 만원</span>
          </div>
          <div className="calc-row border-t-2 border-border">
            <span className="calc-label font-medium">채권 회수가</span>
            <span className={`calc-value text-base ${result.recoveryPrice >= 0 ? "text-success" : "text-destructive"}`}>
              {formatNum(result.recoveryPrice)} 만원
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
