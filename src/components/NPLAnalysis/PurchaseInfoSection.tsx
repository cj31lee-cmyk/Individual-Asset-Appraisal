import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurchaseInfo } from "./types";
import { Building2 } from "lucide-react";

interface Props {
  data: PurchaseInfo;
  onChange: (data: PurchaseInfo) => void;
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

export function PurchaseInfoSection({ data, onChange }: Props) {
  const update = (key: keyof PurchaseInfo, value: string | number) => {
    const next = { ...data, [key]: value };

    // 대출잔액 + 이자 → 원리금 자동계산
    if (key === "loanBalance" || key === "interest") {
      const lb = key === "loanBalance" ? (value as number) : next.loanBalance;
      const int = key === "interest" ? (value as number) : next.interest;
      next.principalInterest = lb + int;
    }

    // 선순위 원금 → 선순위최고액(120%), 선순위 110% 자동계산
    if (key === "seniorPrincipal") {
      const principal = value as number;
      next.seniorMaxAmount = Math.round(principal * 1.2);
      next.senior110 = Math.round(principal * 1.1);
    }

    // 선순위최고액 직접 입력 시 → 선순위 110% = 최고액 * (110/120)
    if (key === "seniorMaxAmount") {
      next.senior110 = Math.round((value as number) * (110 / 120));
    }

    // 대출잔액 + 이율 + 연체이율 + 연체일수 → 이자 자동계산
    if (key === "interestRate" || key === "overdueRate" || key === "overdueDays") {
      const rate = key === "interestRate" ? (value as number) : next.interestRate;
      const overdueRate = key === "overdueRate" ? (value as number) : next.overdueRate;
      const overdueDays = key === "overdueDays" ? (value as number) : next.overdueDays;
      if (next.loanBalance > 0 && overdueDays > 0) {
        const normalInterest = Math.round((next.loanBalance * (rate / 100)) / 365 * overdueDays);
        const overdueInterest = Math.round((next.loanBalance * (overdueRate / 100)) / 365 * overdueDays);
        next.interest = normalInterest + overdueInterest;
        next.principalInterest = next.loanBalance + next.interest;
      }
    }

    onChange(next);
  };

  const numField = (label: string, key: keyof PurchaseInfo, placeholder = "0") => (
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

  const readonlyNumField = (label: string, value: number) => (
    <div>
      <label className="input-label">{label}</label>
      <div className="h-10 px-3 rounded-md border border-input bg-muted/50 flex items-center text-sm font-semibold tabular-nums text-foreground">
        {formatNum(value)} 만원
      </div>
    </div>
  );

  const textField = (label: string, key: keyof PurchaseInfo, placeholder = "") => (
    <div>
      <label className="input-label">{label}</label>
      <Input
        placeholder={placeholder}
        value={(data[key] as string) || ""}
        onChange={(e) => update(key, e.target.value)}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="section-title !mb-0">
          <Building2 className="w-5 h-5" />
          매입 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {textField("매각사", "seller", "OO캐피탈")}
          {textField("상품번호", "productNumber", "NPL-2024-001")}
          {textField("이름", "name", "홍길동")}
          {textField("주소", "address", "서울 강남구 역삼동")}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {numField("대출잔액 (만원)", "loanBalance")}
          {numField("이자 (만원)", "interest")}
          {readonlyNumField("원리금 (만원)", data.principalInterest)}
          {numField("법비용 (만원)", "legalCost")}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {numField("선순위 원금 (만원)", "seniorPrincipal")}
          {readonlyNumField("선순위최고액 (만원)", data.seniorMaxAmount)}
          {readonlyNumField("선순위 110% (만원)", data.senior110)}
          {numField("이율 (%)", "interestRate")}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {numField("연체이율 (%)", "overdueRate")}
          {numField("연체일수", "overdueDays")}
          {textField("비고", "remarks", "특이사항")}
        </div>
        {data.loanBalance > 0 && data.overdueDays > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
            💡 이자 자동계산: 대출잔액 × (이율 + 연체이율) ÷ 365 × 연체일수 = <span className="font-semibold text-foreground">{formatNum(data.interest)} 만원</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
