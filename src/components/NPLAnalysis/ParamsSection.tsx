import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AnalysisParams, PriceAnalysisInfo } from "./types";
import { Settings, Wallet, Users, MoreHorizontal } from "lucide-react";
import { useMemo, useEffect } from "react";
import { FormattedNumberInput } from "./FormattedNumberInput";

interface Props {
  data: AnalysisParams;
  priceAnalysis: PriceAnalysisInfo;
  onChange: (data: AnalysisParams) => void;
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

export function ParamsSection({ data, priceAnalysis, onChange }: Props) {
  const update = (key: keyof AnalysisParams, value: number) => {
    const next = { ...data, [key]: value };
    recalc(next, key);
  };

  const recalc = (next: AnalysisParams, changedKey?: keyof AnalysisParams) => {
    const months = next.holdingMonths;

    // 조달금액 = 최종매입가 (자동)
    if (changedKey !== "fundingAmount") {
      next.fundingAmount = priceAnalysis.finalPurchasePrice;
    }

    // 인건비 기본 0
    if (changedKey !== "laborCost") {
      next.laborCost = 0;
    }

    // 관리비·출장비 기본 0
    if (changedKey !== "managementCost") {
      next.managementCost = 0;
    }

    onChange(next);
  };

  // priceAnalysis 변경 시 조달금액 재계산
  useEffect(() => {
    if (priceAnalysis.finalPurchasePrice > 0 && data.fundingAmount !== priceAnalysis.finalPurchasePrice) {
      recalc({ ...data }, undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceAnalysis.finalPurchasePrice]);

  const fundingCost = useMemo(() => {
    return Math.round((data.fundingAmount * (data.fundingRate / 100) * data.holdingMonths) / 12);
  }, [data.fundingAmount, data.fundingRate, data.holdingMonths]);

  const totalCost = useMemo(() => {
    return fundingCost + data.laborCost + data.managementCost + data.miscCost;
  }, [fundingCost, data.laborCost, data.managementCost, data.miscCost]);

  const numField = (label: string, key: keyof AnalysisParams, placeholder = "0") => (
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

  const moneyField = (label: string, key: keyof AnalysisParams, placeholder = "0") => (
    <div>
      <label className="input-label">{label}</label>
      <FormattedNumberInput
        placeholder={placeholder}
        value={data[key] as number}
        onChange={(v) => update(key, v)}
      />
    </div>
  );

  const autoField = (label: string, value: number, formula: string) => (
    <div>
      <label className="input-label">{label}</label>
      <div className="h-10 px-3 rounded-md border border-input flex items-center text-sm font-semibold tabular-nums bg-muted/50 text-foreground">
        {formatNum(value)} 원
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{formula}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="section-title !mb-0">
          <Settings className="w-5 h-5" />
          비용·수익 분석
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 조달 비용 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Wallet className="w-3.5 h-3.5" /> 조달 비용
          </p>
          {moneyField("조달금액 (원)", "fundingAmount", "0")}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {numField("조달금리 (%)", "fundingRate", "5.5")}
            {numField("보유기간 (개월)", "holdingMonths", "12")}
            {autoField("조달이자 (원)", fundingCost, "금액 × 금리 × 기간/12")}
          </div>
        </div>

        <Separator />

        {/* 인건비·관리비 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5" /> 인건비·관리비
          </p>
          <div className="grid grid-cols-2 gap-2">
            {moneyField("인건비 (원)", "laborCost", "0")}
            {moneyField("관리비·출장비 (원)", "managementCost", "0")}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            기본: 0원 (필요 시 직접 입력)
          </p>
        </div>

        <Separator />

        {/* 기타 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <MoreHorizontal className="w-3.5 h-3.5" /> 기타
          </p>
          {moneyField("기타비용 (원)", "miscCost", "0")}
        </div>

        {/* 비용 합계 */}
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">총 비용 합계</span>
            <span className="text-lg font-bold tabular-nums text-accent-foreground">
              {formatNum(totalCost)} 원
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            조달이자 {formatNum(fundingCost)} + 인건비 {formatNum(data.laborCost)} + 관리비 {formatNum(data.managementCost)} + 기타 {formatNum(data.miscCost)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
