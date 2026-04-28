import { useState, useEffect, useRef } from "react";
import type { AnalysisParams, PurchaseInfo, PriceAnalysisInfo, CaseData } from "./types";
import { RightsSection } from "./RightsSection";
import { ParamsSection } from "./ParamsSection";
import { PurchaseInfoSection } from "./PurchaseInfoSection";
import { PriceAnalysisSection } from "./PriceAnalysisSection";
import { VerdictSection } from "./VerdictSection";
import { ExcelUpload } from "./ExcelUpload";
import { BulkTableView } from "./BulkTableView";
import { ReportView } from "./ReportView";
import { MarketAnalysisSection } from "./MarketAnalysisSection";
import { HistoryDialog } from "./HistoryDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Landmark, Sparkles, ChevronLeft, ChevronRight, FileSpreadsheet, ClipboardList, TableProperties, Printer, Save, History, Download, FileText, RotateCcw, TrendingUp } from "lucide-react";
import { saveCurrent, loadCurrent, saveSnapshot } from "./historyStorage";
import { exportToExcel } from "./excelExport";
import { toast } from "sonner";

const DEFAULT_PURCHASE: PurchaseInfo = {
  seller: "", productNumber: "", name: "", address: "",
  loanBalance: 0, interest: 0, principalInterest: 0, legalCost: 0,
  seniorMaxAmount: 0, senior110: 0, seniorPrincipal: 0, mortgageRegistration: 0,
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
  const initial = loadCurrent();
  const [detailCases, setDetailCases] = useState<CaseData[]>(initial.detailCases ?? [createCase()]);
  const [bulkCases, setBulkCases] = useState<CaseData[]>(initial.bulkCases ?? [createCase()]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("detail");
  const [historyOpen, setHistoryOpen] = useState(false);

  const current = detailCases[currentIdx];
  const totalCases = detailCases.length;

  // Auto-save both states (debounced)
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveCurrent(detailCases, bulkCases), 600);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [detailCases, bulkCases]);

  const handleSaveSnapshot = () => {
    const now = new Date();
    const defaultLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월 분석`;
    const label = window.prompt("월별 다건등록 데이터를 저장합니다.\n이름을 입력하세요", defaultLabel);
    if (!label) return;
    saveSnapshot(label, bulkCases);
    toast.success(`"${label}" 저장 완료`);
  };

  const handleExportExcel = () => {
    const now = new Date();
    const label = `${now.getFullYear()}년${now.getMonth() + 1}월_NPL분석`;
    exportToExcel(bulkCases, label);
    toast.success("엑셀 다운로드 완료");
  };

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT") return;
    const input = target as HTMLInputElement;
    if (input.type === "submit" || input.type === "button") return;
    e.preventDefault();
    const container = e.currentTarget;
    const all = Array.from(
      container.querySelectorAll<HTMLInputElement>("input:not([disabled]):not([readonly])")
    );
    const visible = all.filter((el) => el.offsetParent !== null);
    const idx = visible.indexOf(input);
    if (idx >= 0 && idx < visible.length - 1) {
      const next = visible[idx + 1];
      next.focus();
      next.select();
    }
  };

  const handleReset = () => {
    if (!window.confirm("현재 입력된 모든 값을 비웁니다. (저장된 기록은 유지)\n계속하시겠습니까?")) return;
    setDetailCases([createCase()]);
    setBulkCases([createCase()]);
    setCurrentIdx(0);
    toast.success("초기화 완료");
  };

  const updateCurrent = (partial: Partial<CaseData>) => {
    setDetailCases((prev) =>
      prev.map((c, i) => (i === currentIdx ? { ...c, ...partial, showVerdict: false } : c))
    );
  };

  // 엑셀 업로드 → 다건등록으로
  const handleImport = (imported: PurchaseInfo[]) => {
    const newCases = imported.map((p) => createCase(p));
    setBulkCases(newCases);
    setActiveTab("bulk");
    toast.success(`${newCases.length}건 다건등록에 업로드됨`);
  };

  const handleBulkChange = (newCases: CaseData[]) => {
    setBulkCases(newCases.map((c) => ({ ...c, showVerdict: false })));
  };

  // 다건등록 행 → 상세 분석으로 복사
  const handleSelectFromBulk = (idx: number) => {
    const row = bulkCases[idx];
    if (!row) return;
    setDetailCases([{ ...JSON.parse(JSON.stringify(row)), showVerdict: false }]);
    setCurrentIdx(0);
    setActiveTab("detail");
    toast.success("상세 분석으로 가져왔습니다");
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setDetailCases((prev) =>
      prev.map((c, i) => (i === currentIdx ? { ...c, showVerdict: false } : c))
    );
    setTimeout(() => {
      setIsAnalyzing(false);
      setDetailCases((prev) =>
        prev.map((c, i) => (i === currentIdx ? { ...c, showVerdict: true } : c))
      );
    }, 1500);
  };

  const handlePrint = () => {
    window.print();
  };

  const hasMinData = current.priceAnalysis.estimatedPurchase > 0 || current.purchaseInfo.loanBalance > 0;

  return (
    <div className="print-area">
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
            <div className="flex items-center gap-2 no-print flex-wrap">
              <Button variant="outline" size="sm" onClick={handleSaveSnapshot} className="gap-1.5" title="다건등록 데이터를 월별로 저장">
                <Save className="w-4 h-4" />
                다건 저장
              </Button>
              <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} className="gap-1.5">
                <History className="w-4 h-4" />
                기록
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5" title="다건등록 데이터 엑셀 다운로드">
                <Download className="w-4 h-4" />
                다건 엑셀
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-destructive hover:text-destructive" title="현재 입력값 모두 비우기">
                <RotateCcw className="w-4 h-4" />
                초기화
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5"
              >
                <Printer className="w-4 h-4" />
                인쇄
              </Button>
              <ExcelUpload onImport={handleImport} />
            </div>
          </div>
        </header>

          <main className="max-w-7xl mx-auto px-4 py-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full max-w-4xl grid-cols-4 no-print">
                <TabsTrigger value="detail" className="gap-1.5">
                  <ClipboardList className="w-4 h-4" />
                  상세 분석
                </TabsTrigger>
                <TabsTrigger value="bulk" className="gap-1.5">
                  <TableProperties className="w-4 h-4" />
                  다건 등록
                </TabsTrigger>
                <TabsTrigger value="report" className="gap-1.5">
                  <FileText className="w-4 h-4" />
                  보고
                </TabsTrigger>
                <TabsTrigger value="market" className="gap-1.5 text-xs whitespace-nowrap">
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  NPL 시세 &amp; 낙찰가율 AI 분석 시스템
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bulk" className="space-y-4" onKeyDown={handleEnterAsTab}>
                <BulkTableView
                  cases={bulkCases}
                  onChange={handleBulkChange}
                  onSelectCase={handleSelectFromBulk}
                />
              </TabsContent>

              <TabsContent value="report" className="space-y-4">
                <ReportView cases={bulkCases} />
              </TabsContent>

              <TabsContent value="market" className="space-y-4">
                <MarketAnalysisSection />
              </TabsContent>

              <TabsContent value="detail" className="space-y-6" onKeyDown={handleEnterAsTab}>
                {totalCases > 1 && (
                  <div className="border border-border rounded-lg bg-muted/30 px-4 py-2 flex items-center justify-between no-print">
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
                      <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)} className="h-8 px-2">
                        <ChevronLeft className="w-4 h-4" />이전
                      </Button>
                      <div className="flex gap-0.5 mx-1">
                        {detailCases.map((_, i) => (
                          <button key={i} onClick={() => setCurrentIdx(i)}
                            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${i === currentIdx ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted-foreground/10 text-muted-foreground"}`}>
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" disabled={currentIdx === totalCases - 1} onClick={() => setCurrentIdx((i) => i + 1)} className="h-8 px-2">
                        다음<ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <PurchaseInfoSection data={current.purchaseInfo} onChange={(d) => updateCurrent({ purchaseInfo: d })} />
                <PriceAnalysisSection data={current.priceAnalysis} purchaseInfo={current.purchaseInfo} params={current.params} onChange={(d) => updateCurrent({ priceAnalysis: d })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RightsSection items={current.rights} onChange={(items) => updateCurrent({ rights: items })} />
                  <ParamsSection data={current.params} priceAnalysis={current.priceAnalysis} onChange={(d) => updateCurrent({ params: d })} />
                </div>

                <div className="flex justify-center py-4 no-print">
                  <Button size="lg" disabled={!hasMinData || isAnalyzing} onClick={handleAnalyze}
                    className="relative h-14 px-12 text-base font-bold rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100">
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

                <div className={`transition-all duration-700 ease-out ${current.showVerdict ? "opacity-100 translate-y-0 max-h-[3000px]" : "opacity-0 translate-y-8 max-h-0 overflow-hidden"}`}>
                  <VerdictSection purchaseInfo={current.purchaseInfo} priceAnalysis={current.priceAnalysis} params={current.params} />
                </div>
              </TabsContent>
            </Tabs>
        </main>
      </div>
      <HistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onLoad={(loaded) => {
          setBulkCases(loaded);
          setActiveTab("bulk");
          setHistoryOpen(false);
          toast.success("다건등록에 불러오기 완료");
        }}
      />
    </div>
  );
}
