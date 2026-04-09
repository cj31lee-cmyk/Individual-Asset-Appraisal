import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AnalysisParams } from "./types";
import { Settings, Wallet, Users, Scale, Truck, MoreHorizontal } from "lucide-react";
import { useMemo } from "react";

interface Props {
  data: AnalysisParams;
  onChange: (data: AnalysisParams) => void;
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

export function ParamsSection({ data, onChange }: Props) {
  const update = (key: keyof AnalysisParams, value: number) =>
    onChange({ ...data, [key]: value });

  // 자동 계산
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

  const numField = (label: string, key: keyof AnalysisParams, placeholder = "0", suffix = "") => (
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
        <div>
          <label className="input-label">시세 (만원)</label>
          <Input
            type="number"
            placeholder="55,000"
            value={data.marketPrice || ""}
            onChange={(e) => update("marketPrice", Number(e.target.value))}
          />
        </div>

        {/* 조달 비용 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
            <Wallet className="w-3.5 h-3.5" /> 조달 비용
          </p>
          <div className="grid grid-cols-3 gap-2">
            {numField("조달금리 (%)", "fundingRate", "5.5")}
            {numField("보유기간 (개월)", "holdingMonths", "6")}
            {numField("조달금액 (만원)", "fundingAmount", "30,000")}
          </div>
          {fundingCost > 0 && (
            <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              → 조달이자: <span className="font-semibold text-foreground">{formatNum(fundingCost)} 만원</span>
              <span className="ml-1">(조달금액 × 금리 × 보유기간/12)</span>
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
            {numField("인건비 (만원)", "laborCost", "200")}
            {numField("관리비·출장비 (만원)", "managementCost", "50")}
          </div>
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
            {numField("취득세·등록세 (만원)", "transferTax", "400")}
          </div>
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
