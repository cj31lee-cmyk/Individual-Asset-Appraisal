import { useState } from "react";
import type { CaseInfo, RightsItem, ComparableCase, AnalysisParams } from "./types";
import { CaseInfoSection } from "./CaseInfoSection";
import { RightsSection } from "./RightsSection";
import { ComparablesSection } from "./ComparablesSection";
import { ParamsSection } from "./ParamsSection";
import { ResultSection } from "./ResultSection";
import { useNPLCalculation } from "./useNPLCalculation";
import { Landmark } from "lucide-react";

export function NPLAnalysisTool() {
  const [caseInfo, setCaseInfo] = useState<CaseInfo>({
    caseNumber: "",
    address: "",
    complex: "",
    appraisalPrice: 0,
    round: 1,
    saleDate: "",
  });

  const [rights, setRights] = useState<RightsItem[]>([]);
  const [comparables, setComparables] = useState<ComparableCase[]>([]);
  const [params, setParams] = useState<AnalysisParams>({
    marketPrice: 0,
    targetReturnRate: 20,
    auctionCost: 500,
    evictionCost: 300,
  });

  const result = useNPLCalculation(caseInfo, rights, comparables, params);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Landmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">NPL 채권매입 적정가 분석</h1>
            <p className="text-xs text-muted-foreground">부실채권 매입 의사결정 지원 도구</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 입력 영역 */}
          <div className="lg:col-span-2 space-y-6">
            <CaseInfoSection data={caseInfo} onChange={setCaseInfo} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RightsSection items={rights} onChange={setRights} />
              <ParamsSection data={params} onChange={setParams} />
            </div>
            <ComparablesSection items={comparables} onChange={setComparables} />
          </div>

          {/* 결과 영역 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <ResultSection result={result} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
