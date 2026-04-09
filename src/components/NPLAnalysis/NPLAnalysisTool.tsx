import { useState } from "react";
import type { AnalysisParams, PurchaseInfo, PriceAnalysisInfo } from "./types";
import { RightsSection } from "./RightsSection";
import { ParamsSection } from "./ParamsSection";
import { PurchaseInfoSection } from "./PurchaseInfoSection";
import { PriceAnalysisSection } from "./PriceAnalysisSection";
import { VerdictSection } from "./VerdictSection";
import { ExcelUpload } from "./ExcelUpload";
import { BulkTableView } from "./BulkTableView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { RightsItem } from "./types";
import { Landmark, Sparkles, ChevronLeft, ChevronRight, FileSpreadsheet, ClipboardList, TableProperties } from "lucide-react";

interface CaseData {
  purchaseInfo: PurchaseInfo;
  priceAnalysis: PriceAnalysisInfo;
  params: AnalysisParams;
  rights: RightsItem[];
  showVerdict: boolean;
}

const DEFAULT_PURCHASE: PurchaseInfo = {
  seller: "", productNumber: "", name: "", address: "",
  loanBalance: 0, interest: 0, principalInterest: 0, legalCost: 0,
  seniorMaxAmount: 0, senior110: 0, seniorPrincipal: 0,
  interestRate: 0, overdueRate: 0, overdueDays: 0, remarks: "",
};

const DEFAULT_PRICE: PriceAnalysisInfo = {
  interestUntilDividend: 0, actualTransPrice: 0, kbPrice: 0, bidRate: 0,
  estimatedPurchase: 0, discountRate: 0, mortgageSetupCost: 0,
  appraisalCost: 0, auctionCost: 0, totalCost: 0,
  purchaseMinusSenior: 0, loanPurchasePrice: 0, finalPurchasePrice: 0,
};

const DEFAULT_PARAMS: AnalysisParams = {
  marketPrice: 0, fundingRate: 5.5, holdingMonths: 12,
  fundingAmount: 0, laborCost: 0, managementCost: 0, miscCost: 0,
};

function createCase(purchaseInfo?: PurchaseInfo): CaseData {
  return {
    purchaseInfo: purchaseInfo ?? { ...DEFAULT_PURCHASE },
    priceAnalysis: { ...DEFAULT_PRICE },
    params: { ...DEFAULT_PARAMS },
    rights: [],
    showVerdict: false,
  };
}

export function NPLAnalysisTool() {
  const [cases, setCases] = useState<CaseData[]>([createCase()]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("detail");

  const current = cases[currentIdx];
  const totalCases = cases.length;

  const updateCurrent = (partial: Partial<CaseData>) => {
    setCases((prev) =>
      prev.map((c, i) => (i === currentIdx ? { ...c, ...partial, showVerdict: false } : c))
    );
  };

  const handleImport = (imported: PurchaseInfo[]) => {
    const newCases = imported.map((p) => createCase(p));
    setCases(newCases);
    setCurrentIdx(0);
  };

  const handleBulkChange = (purchaseInfos: PurchaseInfo[]) => {
    setCases((prev) => {
      const updated = purchaseInfos.map((p, i) => {
        const existing = prev[i];
        if (existing) return { ...existing, purchaseInfo: p, showVerdict: false };
        return createCase(p);
      });
      return updated;
    });
  };

  const handleSelectFromBulk = (idx: number) => {
    setCurrentIdx(idx);
    setActiveTab("detail");
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setCases((prev) =>
      prev.map((c, i) => (i === currentIdx ? { ...c, showVerdict: false } : c))
    );
    setTimeout(() => {
      setIsAnalyzing(false);
      setCases((prev) =>
        prev.map((c, i) => (i === currentIdx ? { ...c, showVerdict: true } : c))
      );
    }, 1500);
  };

  const hasMinData = current.priceAnalysis.estimatedPurchase > 0 || current.purchaseInfo.loanBalance > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Landmark className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">NPL 채권매입 적정가 분석</h1>
              <p className="text-xs text-muted-foreground">부실채권 매입 의사결정 지원 도구</p>
            </div>
          </div>
          <ExcelUpload onImport={handleImport} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="detail" className="gap-1.5">
              <ClipboardList className="w-4 h-4" />
              상세 분석
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-1.5">
              <TableProperties className="w-4 h-4" />
              다건 등록
            </TabsTrigger>
          </TabsList>

          {/* 다건 등록 탭 */}
          <TabsContent value="bulk" className="space-y-4">
            <BulkTableView
              cases={cases.map((c) => c.purchaseInfo)}
              onChange={handleBulkChange}
              onSelectCase={handleSelectFromBulk}
            />
          </TabsContent>

          {/* 상세 분석 탭 */}
          <TabsContent value="detail" className="space-y-6">
            {/* Case navigation bar */}
            {totalCases > 1 && (
              <div className="border border-border rounded-lg bg-muted/30 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {currentIdx + 1} / {totalCases} 건
                  </span>
                  <span className="text-sm text-muted-foreground">
                    — {current.purchaseInfo.name || current.purchaseInfo.seller || `건 ${currentIdx + 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx((i) => i - 1)}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </Button>
                  <div className="flex gap-0.5 mx-1">
                    {cases.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIdx(i)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                          i === currentIdx
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted-foreground/10 text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentIdx === totalCases - 1}
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="h-8 px-2"
                  >
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <PurchaseInfoSection
              data={current.purchaseInfo}
              onChange={(d) => updateCurrent({ purchaseInfo: d })}
            />

            <PriceAnalysisSection
              data={current.priceAnalysis}
              purchaseInfo={current.purchaseInfo}
              onChange={(d) => updateCurrent({ priceAnalysis: d })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RightsSection
                items={current.rights}
                onChange={(items) => updateCurrent({ rights: items })}
              />
              <ParamsSection
                data={current.params}
                priceAnalysis={current.priceAnalysis}
                onChange={(d) => updateCurrent({ params: d })}
              />
            </div>

            <div className="flex justify-center py-4">
              <Button
                size="lg"
                disabled={!hasMinData || isAnalyzing}
                onClick={handleAnalyze}
                className="relative h-14 px-12 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    분석 중...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    매입 판정 분석 실행
                  </span>
                )}
              </Button>
            </div>
            {!hasMinData && (
              <p className="text-center text-xs text-muted-foreground -mt-2">
                매입 정보 또는 매입가격 분석 정보를 입력한 후 분석을 실행해주세요
              </p>
            )}

            <div
              className={`transition-all duration-700 ease-out ${
                current.showVerdict
                  ? "opacity-100 translate-y-0 max-h-[3000px]"
                  : "opacity-0 translate-y-8 max-h-0 overflow-hidden"
              }`}
            >
              <VerdictSection
                purchaseInfo={current.purchaseInfo}
                priceAnalysis={current.priceAnalysis}
                params={current.params}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
