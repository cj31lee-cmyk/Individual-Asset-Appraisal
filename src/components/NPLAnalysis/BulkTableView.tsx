import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { CaseData, PurchaseInfo, PriceAnalysisInfo, AnalysisParams } from "./types";
import { Plus, Trash2, TableProperties, Printer } from "lucide-react";
import { FormattedNumberInput } from "./FormattedNumberInput";

interface Props {
  cases: CaseData[];
  onChange: (cases: CaseData[]) => void;
  onSelectCase: (index: number) => void;
}

type Section = "p" | "pr" | "pa" | "calc";
type Format = "text" | "money" | "percent" | "int" | "ro-money" | "ro-percent" | "ro-money-signed";

interface Column {
  label: string;
  section: Section;
  key: string;
  format: Format;
  width: string;
}

const COLUMNS: Column[] = [
  // 매입 정보
  { label: "매각사", section: "p", key: "seller", format: "text", width: "w-28" },
  { label: "상품번호", section: "p", key: "productNumber", format: "text", width: "w-32" },
  { label: "이름", section: "p", key: "name", format: "text", width: "w-24" },
  { label: "주소", section: "p", key: "address", format: "text", width: "w-40" },
  { label: "대출잔액", section: "p", key: "loanBalance", format: "money", width: "w-28" },
  { label: "이자", section: "p", key: "interest", format: "money", width: "w-24" },
  { label: "원리금", section: "p", key: "principalInterest", format: "ro-money", width: "w-28" },
  { label: "법비용", section: "p", key: "legalCost", format: "money", width: "w-24" },
  { label: "선순위원금", section: "p", key: "seniorPrincipal", format: "money", width: "w-28" },
  { label: "선순위최고액", section: "p", key: "seniorMaxAmount", format: "ro-money", width: "w-28" },
  { label: "선순위110%", section: "p", key: "senior110", format: "ro-money", width: "w-28" },
  { label: "등기설정금액", section: "p", key: "mortgageRegistration", format: "money", width: "w-28" },
  { label: "이율(%)", section: "p", key: "interestRate", format: "percent", width: "w-20" },
  { label: "연체이율(%)", section: "p", key: "overdueRate", format: "percent", width: "w-24" },
  { label: "연체일수", section: "p", key: "overdueDays", format: "int", width: "w-20" },
  { label: "비고", section: "p", key: "remarks", format: "text", width: "w-32" },
  // 매입가격 분석
  { label: "배당기일까지이자", section: "pr", key: "interestUntilDividend", format: "ro-money", width: "w-32" },
  { label: "실거래가격", section: "pr", key: "actualTransPrice", format: "money", width: "w-28" },
  { label: "KB시세", section: "pr", key: "kbPrice", format: "money", width: "w-28" },
  { label: "낙찰가율(%)", section: "pr", key: "bidRate", format: "percent", width: "w-24" },
  { label: "매입예상가", section: "pr", key: "estimatedPurchase", format: "ro-money", width: "w-28" },
  { label: "할인율(%)", section: "pr", key: "discountRate", format: "percent", width: "w-20" },
  { label: "채권매입가", section: "pr", key: "loanPurchasePrice", format: "ro-money", width: "w-28" },
  { label: "근저당설정비용", section: "pr", key: "mortgageSetupCost", format: "ro-money", width: "w-28" },
  { label: "감평비용", section: "pr", key: "appraisalCost", format: "ro-money", width: "w-24" },
  { label: "경매비용", section: "pr", key: "auctionCost", format: "ro-money", width: "w-24" },
  { label: "비용합계", section: "pr", key: "totalCost", format: "ro-money", width: "w-24" },
  { label: "회수예상가", section: "pr", key: "purchaseMinusSenior", format: "ro-money", width: "w-28" },
  { label: "최종매입가", section: "pr", key: "finalPurchasePrice", format: "ro-money", width: "w-28" },
  // 운영 파라미터
  { label: "조달금액", section: "pa", key: "fundingAmount", format: "ro-money", width: "w-28" },
  { label: "조달금리(%)", section: "pa", key: "fundingRate", format: "percent", width: "w-20" },
  { label: "보유기간(개월)", section: "pa", key: "holdingMonths", format: "int", width: "w-24" },
  { label: "인건비", section: "pa", key: "laborCost", format: "money", width: "w-24" },
  { label: "관리비", section: "pa", key: "managementCost", format: "money", width: "w-24" },
  { label: "기타비용", section: "pa", key: "miscCost", format: "money", width: "w-24" },
  // 판정 (계산값)
  { label: "최종수익", section: "calc", key: "finalProfit", format: "ro-money-signed", width: "w-28" },
  { label: "수익률(%)", section: "calc", key: "roi", format: "ro-percent", width: "w-24" },
];

const TOTAL_WIDTH = COLUMNS.reduce((s, c) => {
  const w = parseInt(c.width.replace("w-", ""), 10);
  return s + w * 4; // tailwind w-N = N * 0.25rem = N * 4px
}, 100);

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

function newCase(): CaseData {
  return {
    purchaseInfo: { ...DEFAULT_PURCHASE },
    priceAnalysis: { ...DEFAULT_PRICE },
    params: { ...DEFAULT_PARAMS },
    rights: [],
    showVerdict: false,
  };
}

function fmt(n: number) {
  return n ? n.toLocaleString("ko-KR", { maximumFractionDigits: 0 }) : "";
}

function fmtSigned(n: number) {
  if (!n) return "";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

function computeVerdict(c: CaseData) {
  const pa = c.params;
  const fundingCost = Math.round((pa.fundingAmount * (pa.fundingRate / 100) * pa.holdingMonths) / 12);
  const totalOperatingCost = fundingCost + pa.laborCost + pa.managementCost + pa.miscCost;
  const totalCostAll = c.priceAnalysis.finalPurchasePrice + totalOperatingCost;
  const finalProfit = c.priceAnalysis.purchaseMinusSenior - totalCostAll;
  const roi = totalCostAll > 0 ? (finalProfit / totalCostAll) * 100 : 0;
  return { finalProfit, roi };
}

// Apply all auto-calculations across sections
function recalcCase(c: CaseData): CaseData {
  const p = { ...c.purchaseInfo };
  const pr = { ...c.priceAnalysis };
  const pa = { ...c.params };

  p.principalInterest = p.loanBalance + p.interest;

  if (pr.kbPrice > 0 && pr.bidRate > 0) {
    pr.estimatedPurchase = Math.round((pr.kbPrice * pr.bidRate) / 100);
  }
  pr.mortgageSetupCost = Math.round(pr.estimatedPurchase * 0.004);
  if (pr.estimatedPurchase <= 5000) pr.appraisalCost = 30;
  else if (pr.estimatedPurchase <= 10000) pr.appraisalCost = 50;
  else if (pr.estimatedPurchase <= 50000) pr.appraisalCost = 80;
  else pr.appraisalCost = 120;
  pr.auctionCost = Math.max(Math.round(pr.estimatedPurchase * 0.003), 50);
  pr.totalCost = pr.mortgageSetupCost + pr.appraisalCost + pr.auctionCost;
  pr.purchaseMinusSenior = pr.estimatedPurchase - p.senior110;
  // 최종매입가 = 회수예상가 × (1 - 할인율/100)^(보유기간/12)
  const years = (pa.holdingMonths || 12) / 12;
  const factor = Math.pow(1 - (pr.discountRate || 0) / 100, years);
  pr.finalPurchasePrice = Math.round(pr.purchaseMinusSenior * factor);
  pr.loanPurchasePrice = pr.purchaseMinusSenior - pr.finalPurchasePrice;
  pr.interestUntilDividend = Math.round(p.interest + p.interest * (p.overdueRate / 100) * (p.overdueDays / 365));

  pa.fundingAmount = pr.finalPurchasePrice;

  return { ...c, purchaseInfo: p, priceAnalysis: pr, params: pa };
}

export function BulkTableView({ cases, onChange, onSelectCase }: Props) {
  const updateCell = (rowIdx: number, section: Section, key: string, value: string | number) => {
    const updated = cases.map((c, i) => {
      if (i !== rowIdx) return c;
      const next: CaseData = {
        ...c,
        purchaseInfo: { ...c.purchaseInfo },
        priceAnalysis: { ...c.priceAnalysis },
        params: { ...c.params },
      };
      if (section === "p") (next.purchaseInfo as Record<string, unknown>)[key] = value;
      if (section === "pr") (next.priceAnalysis as Record<string, unknown>)[key] = value;
      if (section === "pa") (next.params as Record<string, unknown>)[key] = value;

      // Field-specific input cascades (mirrors PurchaseInfoSection)
      if (section === "p") {
        if (key === "seniorPrincipal") {
          next.purchaseInfo.seniorMaxAmount = Math.round((value as number) * 1.2);
          next.purchaseInfo.senior110 = Math.round((value as number) * 1.1);
        }
        if (key === "interestRate") {
          next.purchaseInfo.overdueRate = (value as number) + 3;
        }
      }

      return recalcCase(next);
    });
    onChange(updated);
  };

  const addRow = () => onChange([...cases, newCase()]);
  const removeRow = (idx: number) => {
    if (cases.length <= 1) return;
    onChange(cases.filter((_, i) => i !== idx));
  };

  const getValue = (c: CaseData, col: Column): string | number => {
    if (col.section === "calc") {
      const v = computeVerdict(c);
      return (v as Record<string, number>)[col.key] ?? 0;
    }
    const src =
      col.section === "p" ? (c.purchaseInfo as Record<string, unknown>)
        : col.section === "pr" ? (c.priceAnalysis as Record<string, unknown>)
        : (c.params as Record<string, unknown>);
    return (src[col.key] as string | number) ?? "";
  };

  const printBulk = (size: "A4" | "A3") => {
    const styleId = "bulk-print-dynamic";
    document.getElementById(styleId)?.remove();
    const style = document.createElement("style");
    style.id = styleId;
    // A4: only 매입 정보 columns (# + 16 = 17 cells). A3: all columns.
    // A3 landscape usable ≈ 1550px → zoom 0.42 fits 4000px content
    // A4 landscape usable ≈ 1080px → with only 16 cols (~1784px), zoom 0.6 fits
    const isA4 = size === "A4";
    const zoom = isA4 ? 0.6 : 0.42;
    // Hide everything from column 18 onwards (after 비고). 1=#, 2~17=매입정보(16개), 18+=가격분석/파라미터/판정/삭제
    const hideExtraCols = isA4
      ? `.bulk-print-area .min-w-bulk > div > *:nth-child(n+18) { display: none !important; }
         .bulk-print-area .min-w-bulk { min-width: 0 !important; }`
      : "";
    style.textContent = `
      @media print {
        @page { size: ${size} landscape; margin: 4mm; }
        body * { visibility: hidden !important; }
        .bulk-print-area, .bulk-print-area * { visibility: visible !important; }
        .bulk-print-area {
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          width: 100% !important;
          background: white !important;
          zoom: ${zoom};
          page-break-inside: avoid;
        }
        .bulk-print-area [data-radix-scroll-area-viewport],
        .bulk-print-area .scroll-area-print { overflow: visible !important; }
        .bulk-print-area .no-print-bulk { display: none !important; }
        .bulk-print-area input { border: none !important; padding: 0 2px !important; height: 22px !important; }
        ${hideExtraCols}
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      setTimeout(() => style.remove(), 800);
    }, 100);
  };

  return (
    <Card className="bulk-print-area">
      <CardHeader className="pb-3 no-print-bulk">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="section-title !mb-0">
            <TableProperties className="w-5 h-5" />
            다건 등록 (가로 모드)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => printBulk("A4")} className="gap-1.5">
              <Printer className="w-4 h-4" /> A4 가로 인쇄
            </Button>
            <Button variant="outline" size="sm" onClick={() => printBulk("A3")} className="gap-1.5">
              <Printer className="w-4 h-4" /> A3 가로 인쇄
            </Button>
            <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
              <Plus className="w-4 h-4" /> 행 추가
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          행 번호를 클릭하면 상세 분석 탭으로 이동합니다 · 총 {cases.length}건 · 회색 셀은 자동계산
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full scroll-area-print">
          <div className="min-w-bulk" style={{ minWidth: `${TOTAL_WIDTH}px` }}>
            {/* Header */}
            <div className="flex items-center border-b border-border bg-muted/50 sticky top-0 z-10">
              <div className="w-10 shrink-0 px-2 py-2 text-center text-xs font-semibold text-muted-foreground">#</div>
              {COLUMNS.map((col) => (
                <div
                  key={`${col.section}-${col.key}`}
                  className={`${col.width} shrink-0 px-1 py-2 text-xs font-semibold text-muted-foreground truncate`}
                  title={col.label}
                >
                  {col.label}
                </div>
              ))}
              <div className="w-12 shrink-0" />
            </div>

            {/* Rows */}
            {cases.map((row, rowIdx) => (
              <div
                key={rowIdx}
                className="flex items-center border-b border-border/50 hover:bg-muted/20 transition-colors group"
              >
                <div
                  className="w-10 shrink-0 px-2 py-1 text-center text-xs font-medium text-muted-foreground cursor-pointer hover:text-primary hover:underline"
                  onClick={() => onSelectCase(rowIdx)}
                  title="상세 분석으로 이동"
                >
                  {rowIdx + 1}
                </div>
                {COLUMNS.map((col) => {
                  const val = getValue(row, col);
                  if (col.format === "ro-money") {
                    return (
                      <div
                        key={`${col.section}-${col.key}`}
                        className={`${col.width} shrink-0 px-1.5 py-0.5 h-8 flex items-center text-xs tabular-nums bg-muted/30 text-muted-foreground truncate`}
                        title={fmt(val as number)}
                      >
                        {fmt(val as number)}
                      </div>
                    );
                  }
                  if (col.format === "ro-money-signed") {
                    const n = val as number;
                    return (
                      <div
                        key={`${col.section}-${col.key}`}
                        className={`${col.width} shrink-0 px-1.5 py-0.5 h-8 flex items-center text-xs font-semibold tabular-nums bg-muted/30 truncate ${n > 0 ? "text-emerald-600" : n < 0 ? "text-red-600" : "text-muted-foreground"}`}
                        title={fmtSigned(n)}
                      >
                        {fmtSigned(n)}
                      </div>
                    );
                  }
                  if (col.format === "ro-percent") {
                    const n = val as number;
                    return (
                      <div
                        key={`${col.section}-${col.key}`}
                        className={`${col.width} shrink-0 px-1.5 py-0.5 h-8 flex items-center text-xs font-semibold tabular-nums bg-muted/30 truncate ${n >= 10 ? "text-emerald-600" : n >= 0 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {n ? `${n.toFixed(1)}%` : ""}
                      </div>
                    );
                  }
                  if (col.format === "money") {
                    return (
                      <div key={`${col.section}-${col.key}`} className={`${col.width} shrink-0 px-0.5 py-0.5`}>
                        <FormattedNumberInput
                          className="h-8 text-xs px-1.5 rounded-sm border-transparent hover:border-input focus:border-input bg-transparent tabular-nums"
                          value={val as number}
                          suffix=""
                          onChange={(v) => updateCell(rowIdx, col.section, col.key, v)}
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={`${col.section}-${col.key}`} className={`${col.width} shrink-0 px-0.5 py-0.5`}>
                      <Input
                        type={col.format === "text" ? "text" : "number"}
                        className="h-8 text-xs px-1.5 rounded-sm border-transparent hover:border-input focus:border-input bg-transparent tabular-nums"
                        value={val === 0 ? "" : val}
                        onChange={(e) =>
                          updateCell(
                            rowIdx,
                            col.section,
                            col.key,
                            col.format === "text" ? e.target.value : Number(e.target.value)
                          )
                        }
                      />
                    </div>
                  );
                })}
                <div className="w-12 shrink-0 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    onClick={() => removeRow(rowIdx)}
                    disabled={cases.length <= 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
