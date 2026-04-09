import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";
import type { PurchaseInfo } from "./types";

interface Props {
  onImport: (cases: PurchaseInfo[]) => void;
}

const COLUMN_MAP: Record<string, keyof PurchaseInfo> = {
  "매각사": "seller",
  "상품번호": "productNumber",
  "이름": "name",
  "주소": "address",
  "대출잔액": "loanBalance",
  "이자": "interest",
  "원리금": "principalInterest",
  "법비용": "legalCost",
  "선순위최고액": "seniorMaxAmount",
  "선순위110": "senior110",
  "선순위원금": "seniorPrincipal",
  "이율": "interestRate",
  "연체이율": "overdueRate",
  "연체일수": "overdueDays",
  "비고": "remarks",
};

const DEFAULT_PURCHASE: PurchaseInfo = {
  seller: "", productNumber: "", name: "", address: "",
  loanBalance: 0, interest: 0, principalInterest: 0, legalCost: 0,
  seniorMaxAmount: 0, senior110: 0, seniorPrincipal: 0,
  interestRate: 0, overdueRate: 0, overdueDays: 0, remarks: "",
};

function downloadTemplate() {
  const headers = Object.keys(COLUMN_MAP);
  const ws = XLSX.utils.aoa_to_sheet([headers, []]);
  // Set column widths
  ws["!cols"] = headers.map(() => ({ wch: 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "매입정보");
  XLSX.writeFile(wb, "NPL_매입정보_템플릿.xlsx");
}

export function ExcelUpload({ onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const cases: PurchaseInfo[] = rows.map((row) => {
        const item = { ...DEFAULT_PURCHASE };
        for (const [kor, eng] of Object.entries(COLUMN_MAP)) {
          if (row[kor] !== undefined) {
            const val = row[kor];
            if (typeof DEFAULT_PURCHASE[eng] === "number") {
              (item as any)[eng] = Number(val) || 0;
            } else {
              (item as any)[eng] = String(val ?? "");
            }
          }
        }
        // Auto-calc: principalInterest
        if (item.loanBalance > 0) {
          item.principalInterest = item.loanBalance + item.interest;
        }
        // Auto-calc: senior110 from seniorPrincipal
        if (item.seniorPrincipal > 0 && item.senior110 === 0) {
          item.seniorMaxAmount = Math.round(item.seniorPrincipal * 1.2);
          item.senior110 = Math.round(item.seniorPrincipal * 1.1);
        }
        // Auto-calc: overdueRate from interestRate
        if (item.interestRate > 0 && item.overdueRate === 0) {
          item.overdueRate = item.interestRate + 3;
        }
        return item;
      });

      if (cases.length > 0) onImport(cases);
    };
    reader.readAsArrayBuffer(file);

    // Reset so same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="gap-1.5"
      >
        <Upload className="w-4 h-4" />
        엑셀 업로드
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={downloadTemplate}
        className="gap-1.5 text-muted-foreground"
      >
        <Download className="w-4 h-4" />
        템플릿 다운로드
      </Button>
    </div>
  );
}
