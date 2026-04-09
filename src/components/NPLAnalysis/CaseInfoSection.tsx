import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CaseInfo } from "./types";
import { FileText } from "lucide-react";

interface Props {
  data: CaseInfo;
  onChange: (data: CaseInfo) => void;
}

export function CaseInfoSection({ data, onChange }: Props) {
  const update = (key: keyof CaseInfo, value: string | number) =>
    onChange({ ...data, [key]: value });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="section-title !mb-0">
          <FileText className="w-5 h-5" />
          사건 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">사건번호</label>
            <Input
              placeholder="2024타경12345"
              value={data.caseNumber}
              onChange={(e) => update("caseNumber", e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">단지·평형</label>
            <Input
              placeholder="래미안 32평"
              value={data.complex}
              onChange={(e) => update("complex", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="input-label">주소</label>
          <Input
            placeholder="서울 강남구 역삼동 123-45"
            value={data.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="input-label">감정가 (만원)</label>
            <Input
              type="number"
              placeholder="50,000"
              value={data.appraisalPrice || ""}
              onChange={(e) => update("appraisalPrice", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="input-label">회차</label>
            <Input
              type="number"
              placeholder="1"
              value={data.round || ""}
              onChange={(e) => update("round", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="input-label">매각기일</label>
            <Input
              type="date"
              value={data.saleDate}
              onChange={(e) => update("saleDate", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
