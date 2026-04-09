import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { PurchaseInfo } from "./types";
import { Plus, Trash2, TableProperties } from "lucide-react";

interface Props {
  cases: PurchaseInfo[];
  onChange: (cases: PurchaseInfo[]) => void;
  onSelectCase: (index: number) => void;
}

const COLUMNS: { label: string; key: keyof PurchaseInfo; type: "text" | "number"; width: string }[] = [
  { label: "매각사", key: "seller", type: "text", width: "w-28" },
  { label: "상품번호", key: "productNumber", type: "text", width: "w-32" },
  { label: "이름", key: "name", type: "text", width: "w-24" },
  { label: "주소", key: "address", type: "text", width: "w-40" },
  { label: "대출잔액", key: "loanBalance", type: "number", width: "w-28" },
  { label: "이자", key: "interest", type: "number", width: "w-24" },
  { label: "원리금", key: "principalInterest", type: "number", width: "w-28" },
  { label: "법비용", key: "legalCost", type: "number", width: "w-24" },
  { label: "선순위원금", key: "seniorPrincipal", type: "number", width: "w-28" },
  { label: "선순위최고액", key: "seniorMaxAmount", type: "number", width: "w-28" },
  { label: "선순위110%", key: "senior110", type: "number", width: "w-28" },
  { label: "이율(%)", key: "interestRate", type: "number", width: "w-20" },
  { label: "연체이율(%)", key: "overdueRate", type: "number", width: "w-24" },
  { label: "연체일수", key: "overdueDays", type: "number", width: "w-20" },
  { label: "비고", key: "remarks", type: "text", width: "w-32" },
];

const DEFAULT_PURCHASE: PurchaseInfo = {
  seller: "", productNumber: "", name: "", address: "",
  loanBalance: 0, interest: 0, principalInterest: 0, legalCost: 0,
  seniorMaxAmount: 0, senior110: 0, seniorPrincipal: 0,
  interestRate: 0, overdueRate: 0, overdueDays: 0, remarks: "",
};

export function BulkTableView({ cases, onChange, onSelectCase }: Props) {
  const updateCell = (rowIdx: number, key: keyof PurchaseInfo, rawValue: string | number) => {
    const updated = cases.map((c, i) => {
      if (i !== rowIdx) return c;
      const next = { ...c, [key]: rawValue };

      // Auto-calc logic (same as PurchaseInfoSection)
      if (key === "loanBalance" || key === "interest") {
        const lb = key === "loanBalance" ? (rawValue as number) : next.loanBalance;
        const int = key === "interest" ? (rawValue as number) : next.interest;
        next.principalInterest = lb + int;
      }
      if (key === "seniorPrincipal") {
        const p = rawValue as number;
        next.seniorMaxAmount = Math.round(p * 1.2);
        next.senior110 = Math.round(p * 1.1);
      }
      if (key === "seniorMaxAmount") {
        next.senior110 = Math.round((rawValue as number) * (110 / 120));
      }
      if (key === "interestRate") {
        next.overdueRate = (rawValue as number) + 3;
      }
      if (["interestRate", "overdueRate", "overdueDays", "loanBalance"].includes(key)) {
        const rate = key === "interestRate" ? (rawValue as number) : next.interestRate;
        const odRate = key === "interestRate" ? (rawValue as number) + 3 : (key === "overdueRate" ? (rawValue as number) : next.overdueRate);
        const days = key === "overdueDays" ? (rawValue as number) : next.overdueDays;
        if (next.loanBalance > 0 && days > 0) {
          const ni = Math.round((next.loanBalance * (rate / 100)) / 365 * days);
          const oi = Math.round((next.loanBalance * (odRate / 100)) / 365 * days);
          next.interest = ni + oi;
          next.principalInterest = next.loanBalance + next.interest;
        }
      }
      return next;
    });
    onChange(updated);
  };

  const addRow = () => onChange([...cases, { ...DEFAULT_PURCHASE }]);
  const removeRow = (idx: number) => {
    if (cases.length <= 1) return;
    onChange(cases.filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="section-title !mb-0">
            <TableProperties className="w-5 h-5" />
            다건 등록 (가로 모드)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5">
            <Plus className="w-4 h-4" /> 행 추가
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          행을 클릭하면 상세 분석 탭으로 이동합니다 · 총 {cases.length}건
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-[1400px]">
            {/* Header */}
            <div className="flex items-center border-b border-border bg-muted/50 sticky top-0 z-10">
              <div className="w-10 shrink-0 px-2 py-2 text-center text-xs font-semibold text-muted-foreground">#</div>
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className={`${col.width} shrink-0 px-1 py-2 text-xs font-semibold text-muted-foreground truncate`}
                >
                  {col.label}
                </div>
              ))}
              <div className="w-16 shrink-0" />
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
                {COLUMNS.map((col) => (
                  <div key={col.key} className={`${col.width} shrink-0 px-0.5 py-0.5`}>
                    <Input
                      type={col.type}
                      className="h-8 text-xs px-1.5 rounded-sm border-transparent hover:border-input focus:border-input bg-transparent"
                      value={
                        col.type === "number"
                          ? (row[col.key] as number) || ""
                          : (row[col.key] as string) || ""
                      }
                      onChange={(e) =>
                        updateCell(
                          rowIdx,
                          col.key,
                          col.type === "number" ? Number(e.target.value) : e.target.value
                        )
                      }
                    />
                  </div>
                ))}
                <div className="w-16 shrink-0 flex justify-center">
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
