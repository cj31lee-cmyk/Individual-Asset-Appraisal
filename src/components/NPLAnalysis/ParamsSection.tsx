import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AnalysisParams, PriceAnalysisInfo } from "./types";
import { Settings, Wallet, Users, Scale, Truck, MoreHorizontal } from "lucide-react";
import { useMemo, useEffect } from "react";

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
    const market = next.marketPrice;
    const months = next.holdingMonths;
    const loanPurchase = priceAnalysis.loanPurchasePrice;

    // 조달금액 = 채권매입가 (자동)
    if (changedKey !== "fundingAmount") {
      next.fundingAmount = loanPurchase;
    }

    // 인건비 = 월 50만 × 보유기간
    if (changedKey !== "laborCost") {
      next.laborCost = Math.round(50 * months);
    }

    // 관리비·출장비 = 월 15만 × 보유기간
    if (changedKey !== "managementCost") {
      next.managementCost = Math.round(15 * months);
    }

    // 법무사비: 시세 구간별
    if (changedKey !== "legalFee") {
      if (market <= 10000) next.legalFee = 80;
      else if (market <= 30000) next.legalFee = 120;
      else if (market <= 50000) next.legalFee = 150;
      else next.legalFee = 200;
    }

    // 경매비용: 시세 × 0.3% (최소 50)
    if (changedKey !== "auctionCost") {
      next.auctionCost = Math.max(Math.round(market * 0.003), 50);
    }

    // 감정평가비: 시세 구간별
    if (changedKey !== "appraisalFee") {
      if (market <= 5000) next.appraisalFee = 30;
      else if (market <= 10000) next.appraisalFee = 50;
      else if (market <= 50000) next.appraisalFee = 80;
      else next.appraisalFee = 120;
    }

    // 명도비: 고정 300 (실무 평균)
    // 사용자가 직접 수정 가능하도록 changedKey 체크
    if (changedKey !== "evictionCost" && data.evictionCost === 0 && next.evictionCost === 0) {
      next.evictionCost = 300;
    }

    // 중개수수료 = 시세 × 0.4%
    if (changedKey !== "brokerageFee") {
      next.brokerageFee = Math.round(market * 0.004);
    }

    // 취득세·등록세 = 시세 × 4.6%
    if (changedKey !== "transferTax") {
      next.transferTax = Math.round(market * 0.046);
    }

    onChange(next);
  };

  // priceAnalysis 변경 시 조달금액 등 재계산
  useEffect(() => {
    if (priceAnalysis.loanPurchasePrice > 0 && data.fundingAmount !== priceAnalysis.loanPurchasePrice) {
      recalc({ ...data }, undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceAnalysis.loanPurchasePrice]);

  const fundingCost = useMemo(() => {
    return Math.round((data.fundingAmount * (data.fundingRate / 100) * data.holdingMonths) / 12);
  }, [data.fundingAmount, data.fundingRate, data.holdingMonths]);

  const totalCost = useMemo(() => {
    return (
      fundingCost +
      data.laborCost +
      data.managementCost +
      data.legalFee +
      data.auctionCost +
      data.appraisalFee +
      data.evictionCost +
      data.brokerageFee +
      data.transferTax +
      data.miscCost
    );
  }, [fundingCost, data]);

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

  const autoField = (label: string, value: number, formula: string) => (
    <div>
      <label className="input-label">{label}</label>
      <div className="h-10 px-3 rounded-md border border-input flex items-center text-sm font-semibold tabular-nums bg-muted/50 text-foreground">
        {formatNum(value)} 만원
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
        {/* 시세 */}
        {numField("시세 (만원)", "marketPrice", "55,000")}

        {/* 조달 비용 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Wallet className="w-3.5 h-3.5" /> 조달 비용
          </p>
          <div className="grid grid-cols-3 gap-2">
            {numField("조달금리 (%)", "fundingRate", "5.5")}
            {numField("보유기간 (개월)", "holdingMonths", "12")}
            {autoField("조달금액", data.fundingAmount, "= 채권매입가")}
          </div>
          {fundingCost > 0 && (
            <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              → 조달이자: <span className="font-semibold text-foreground">{formatNum(fundingCost)} 만원</span>
              <span className="ml-1">(금액 × 금리 × 기간/12)</span>
            </div>
          )}
        </div>

        <Separator />

        {/* 인건비·관리비 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5" /> 인건비·관리비
          </p>
          <div className="grid grid-cols-2 gap-2">
            {numField("인건비 (만원)", "laborCost", "300")}
            {numField("관리비·출장비 (만원)", "managementCost", "90")}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            기본: 인건비 월50만 × {data.holdingMonths}개월 / 관리비 월15만 × {data.holdingMonths}개월
          </p>
        </div>

        <Separator />

        {/* 법무·경매 비용 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5" /> 법무·경매 비용
          </p>
          <div className="grid grid-cols-3 gap-2">
            {numField("법무사비 (만원)", "legalFee", "150")}
            {numField("경매비용 (만원)", "auctionCost", "500")}
            {numField("감정평가비 (만원)", "appraisalFee", "80")}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            경매비용 = 시세×0.3% / 감평비 = 구간별 정액
          </p>
        </div>

        <Separator />

        {/* 명도·처분 비용 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Truck className="w-3.5 h-3.5" /> 명도·처분 비용
          </p>
          <div className="grid grid-cols-3 gap-2">
            {numField("명도비 (만원)", "evictionCost", "300")}
            {numField("중개수수료 (만원)", "brokerageFee", "200")}
            {numField("취득세·등록세 (만원)", "transferTax", "2,530")}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            중개수수료 = 시세×0.4% / 취득세 = 시세×4.6%
          </p>
        </div>

        <Separator />

        {/* 기타 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <MoreHorizontal className="w-3.5 h-3.5" /> 기타
          </p>
          {numField("기타비용 (만원)", "miscCost", "0")}
        </div>

        {/* 비용 합계 */}
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">총 비용 합계</span>
            <span className="text-lg font-bold tabular-nums text-accent-foreground">
              {formatNum(totalCost)} 만원
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            조달이자 {formatNum(fundingCost)} + 인건비·관리 {formatNum(data.laborCost + data.managementCost)} + 법무·경매 {formatNum(data.legalFee + data.auctionCost + data.appraisalFee)} + 명도·처분 {formatNum(data.evictionCost + data.brokerageFee + data.transferTax)} + 기타 {formatNum(data.miscCost)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
