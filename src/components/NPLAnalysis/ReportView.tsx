import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CaseData } from "./types";
import { FileText, Printer, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface Props {
  cases: CaseData[];
}

// 입력값을 억 단위로 표시 (소수점 1자리, 한글 단위 없이)
function fmtEok(n: number) {
  if (!n) return "-";
  return (n / 100000000).toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function fmtEokSigned(n: number) {
  if (!n) return "-";
  const eok = n / 100000000;
  const sign = eok > 0 ? "+" : "";
  return `${sign}${eok.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function verdictMeta(roi: number) {
  if (roi >= 10) return { label: "매입 추천", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
  if (roi >= 0) return { label: "조건부 매입", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
  return { label: "매입 부적격", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
}

export function ReportView({ cases }: Props) {
  const enriched = cases.map((c) => ({ ...c, verdict: computeVerdict(c) }));
  const validCount = enriched.filter((c) => c.purchaseInfo.loanBalance > 0 || c.priceAnalysis.estimatedPurchase > 0).length;
  const recommend = enriched.filter((c) => c.verdict.roi >= 10).length;
  const conditional = enriched.filter((c) => c.verdict.roi >= 0 && c.verdict.roi < 10).length;
  const reject = enriched.filter((c) => c.verdict.roi < 0).length;
  const validRois = enriched.filter((c) => c.verdict.roi !== 0).map((c) => c.verdict.roi);
  const avgRoi = validRois.length ? validRois.reduce((a, b) => a + b, 0) / validRois.length : 0;
  const totalProfit = enriched.reduce((s, c) => s + c.verdict.finalProfit, 0);
  const totalInvest = enriched.reduce((s, c) => s + c.priceAnalysis.finalPurchasePrice, 0);

  const handlePrint = () => {
    const styleId = "report-print-dynamic";
    document.getElementById(styleId)?.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 6mm; }
        body * { visibility: hidden !important; }
        .report-print-area, .report-print-area * { visibility: visible !important; }
        .report-print-area {
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          width: 100% !important;
          background: white !important;
        }
        .report-print-area .no-print-report { display: none !important; }
        .report-print-area > * + * { margin-top: 4px !important; }
        .report-print-area .space-y-4 > * + * { margin-top: 4px !important; }
        .report-print-area table { font-size: 10px !important; page-break-inside: avoid; }
        .report-print-area th, .report-print-area td { padding: 3px 4px !important; }
        .report-print-area .text-2xl { font-size: 16px !important; }
        .report-print-area .text-lg { font-size: 13px !important; }
        .report-print-area .p-3 { padding: 6px !important; }
        .report-print-area .pb-3 { padding-bottom: 4px !important; }
        .report-print-area .mt-3 { margin-top: 4px !important; }
        .report-print-area .mt-1 { margin-top: 0 !important; }
        .report-print-area .gap-3 { gap: 6px !important; }
        .report-print-area { page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      setTimeout(() => style.remove(), 800);
    }, 100);
  };

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="report-print-area space-y-4">
      {/* 보고서 헤더 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="section-title !mb-0">
                <FileText className="w-5 h-5" />
                매입 검토 보고서
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">작성일: {today} · 검토 건수 {validCount}건</p>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 no-print-report">
              <Printer className="w-4 h-4" />
              보고서 인쇄
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 요약 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="border border-border rounded-lg p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">총 검토 건수</p>
              <p className="text-2xl font-black tabular-nums">{validCount}<span className="text-sm font-normal ml-1">건</span></p>
            </div>
            <div className="border border-emerald-500/30 rounded-lg p-3 bg-emerald-500/10">
              <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />매입 추천</p>
              <p className="text-2xl font-black tabular-nums text-emerald-600">{recommend}<span className="text-sm font-normal ml-1">건</span></p>
            </div>
            <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/10">
              <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />조건부 매입</p>
              <p className="text-2xl font-black tabular-nums text-amber-600">{conditional}<span className="text-sm font-normal ml-1">건</span></p>
            </div>
            <div className="border border-red-500/30 rounded-lg p-3 bg-red-500/10">
              <p className="text-xs text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" />매입 부적격</p>
              <p className="text-2xl font-black tabular-nums text-red-600">{reject}<span className="text-sm font-normal ml-1">건</span></p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">총 매입예상금</p>
              <p className="text-lg font-bold tabular-nums">{fmtEok(totalInvest)}<span className="text-xs font-normal ml-1">억</span></p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">총 예상 수익</p>
              <p className={`text-lg font-bold tabular-nums ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmtEokSigned(totalProfit)}<span className="text-xs font-normal ml-1">억</span>
              </p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">평균 수익률</p>
              <p className={`text-lg font-bold tabular-nums ${avgRoi >= 10 ? "text-emerald-600" : avgRoi >= 0 ? "text-amber-600" : "text-red-600"}`}>
                {avgRoi.toFixed(1)}<span className="text-xs font-normal ml-0.5">%</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 보고 테이블 */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <p className="text-xs text-muted-foreground px-4 pt-3 pb-2 text-right">
            ※ 금액 단위: 억원. 수익률 ≥10% 매입 추천 · ≥0% 조건부 · &lt;0% 부적격
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-2 py-2.5 text-center font-semibold w-10">#</th>
                <th className="px-3 py-2.5 text-center font-semibold">매각사</th>
                <th className="px-3 py-2.5 text-center font-semibold">상품번호</th>
                <th className="px-3 py-2.5 text-center font-semibold">대출잔액</th>
                <th className="px-3 py-2.5 text-center font-semibold">선순위110%</th>
                <th className="px-3 py-2.5 text-center font-semibold">시세</th>
                <th className="px-3 py-2.5 text-center font-semibold">매입예상가</th>
                <th className="px-3 py-2.5 text-center font-semibold">회수예상가</th>
                <th className="px-3 py-2.5 text-center font-semibold">최종매입가</th>
                <th className="px-3 py-2.5 text-center font-semibold">수익액</th>
                <th className="px-3 py-2.5 text-center font-semibold">수익률</th>
                <th className="px-3 py-2.5 text-center font-semibold">판정</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((c, i) => {
                const m = verdictMeta(c.verdict.roi);
                const profit = c.verdict.finalProfit;
                return (
                  <tr
                    key={i}
                    className={`border-b border-border ${i % 2 === 1 ? "bg-muted/20" : ""}`}
                  >
                    <td className="px-2 py-2 text-center text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 text-center font-medium">{c.purchaseInfo.seller || "-"}</td>
                    <td className="px-3 py-2 text-center text-xs text-muted-foreground">{c.purchaseInfo.productNumber || "-"}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{fmtEok(c.purchaseInfo.loanBalance)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{fmtEok(c.purchaseInfo.senior110)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{fmtEok(c.priceAnalysis.kbPrice)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{fmtEok(c.priceAnalysis.estimatedPurchase)}</td>
                    <td className="px-3 py-2 text-center tabular-nums font-semibold">{fmtEok(c.priceAnalysis.purchaseMinusSenior)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{fmtEok(c.priceAnalysis.finalPurchasePrice)}</td>
                    <td className={`px-3 py-2 text-center tabular-nums font-bold ${profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-600" : ""}`}>
                      {fmtEokSigned(profit)}
                    </td>
                    <td className={`px-3 py-2 text-center tabular-nums font-bold ${m.color}`}>
                      {c.verdict.roi ? `${c.verdict.roi.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${m.color} ${m.bg} ${m.border}`}>
                        {m.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold border-t-2 border-border">
                <td colSpan={3} className="px-3 py-2.5 text-center text-xs text-muted-foreground">합계 / 평균</td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {fmtEok(enriched.reduce((s, c) => s + c.purchaseInfo.loanBalance, 0))}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {fmtEok(enriched.reduce((s, c) => s + c.purchaseInfo.senior110, 0))}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {fmtEok(enriched.reduce((s, c) => s + c.priceAnalysis.kbPrice, 0))}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {fmtEok(enriched.reduce((s, c) => s + c.priceAnalysis.estimatedPurchase, 0))}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {fmtEok(enriched.reduce((s, c) => s + c.priceAnalysis.purchaseMinusSenior, 0))}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums">{fmtEok(totalInvest)}</td>
                <td className={`px-3 py-2.5 text-center tabular-nums font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmtEokSigned(totalProfit)}
                </td>
                <td className={`px-3 py-2.5 text-center tabular-nums font-bold ${avgRoi >= 10 ? "text-emerald-600" : avgRoi >= 0 ? "text-amber-600" : "text-red-600"}`}>
                  {avgRoi.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">평균</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

    </div>
  );
}
