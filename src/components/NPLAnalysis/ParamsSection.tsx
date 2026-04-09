import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisParams } from "./types";
import { Settings } from "lucide-react";

interface Props {
  data: AnalysisParams;
  onChange: (data: AnalysisParams) => void;
}

export function ParamsSection({ data, onChange }: Props) {
  const update = (key: keyof AnalysisParams, value: number) =>
    onChange({ ...data, [key]: value });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="section-title !mb-0">
          <Settings className="w-5 h-5" />
          분석 파라미터
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">시세 (만원)</label>
            <Input
              type="number"
              placeholder="55,000"
              value={data.marketPrice || ""}
              onChange={(e) => update("marketPrice", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="input-label">목표수익률 (%)</label>
            <Input
              type="number"
              placeholder="20"
              value={data.targetReturnRate || ""}
              onChange={(e) => update("targetReturnRate", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="input-label">경매비용 (만원)</label>
            <Input
              type="number"
              placeholder="500"
              value={data.auctionCost || ""}
              onChange={(e) => update("auctionCost", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="input-label">명도비 (만원)</label>
            <Input
              type="number"
              placeholder="300"
              value={data.evictionCost || ""}
              onChange={(e) => update("evictionCost", Number(e.target.value))}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
