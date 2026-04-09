import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurchaseInfo } from "./types";
import { Building2 } from "lucide-react";

interface Props {
  data: PurchaseInfo;
  onChange: (data: PurchaseInfo) => void;
}

export function PurchaseInfoSection({ data, onChange }: Props) {
  const update = (key: keyof PurchaseInfo, value: string | number) =>
    onChange({ ...data, [key]: value });

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
          {numField("원리금 (만원)", "principalInterest")}
          {numField("법비용 (만원)", "legalCost")}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {numField("선순위최고액 (만원)", "seniorMaxAmount")}
          {numField("선순위 110% (만원)", "senior110")}
          {numField("선순위 원금 (만원)", "seniorPrincipal")}
          {numField("이율 (%)", "interestRate")}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {numField("연체이율 (%)", "overdueRate")}
          {numField("연체일수", "overdueDays")}
          {textField("비고", "remarks", "특이사항")}
        </div>
      </CardContent>
    </Card>
  );
}
