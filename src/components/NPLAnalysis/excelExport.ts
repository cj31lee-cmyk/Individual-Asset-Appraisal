import XLSX from "xlsx-js-style";
import type { CaseData } from "./types";

interface Column {
  label: string;
  get: (c: CaseData) => string | number;
  width: number;
  type: "text" | "money" | "percent" | "int";
}

function computeVerdict(c: CaseData) {
  const pa = c.params;
  const fundingCost = Math.round((pa.fundingAmount * (pa.fundingRate / 100) * pa.holdingMonths) / 12);
  const totalOperatingCost = fundingCost + pa.laborCost + pa.managementCost + pa.miscCost;
  const totalCostAll = c.priceAnalysis.finalPurchasePrice + totalOperatingCost;
  const finalProfit = c.priceAnalysis.purchaseMinusSenior - totalCostAll;
  const roi = totalCostAll > 0 ? (finalProfit / totalCostAll) * 100 : 0;
  return { fundingCost, totalOperatingCost, totalCostAll, finalProfit, roi };
}

const COLUMNS: Column[] = [
  // 매입 정보
  { label: "매각사", get: (c) => c.purchaseInfo.seller, width: 14, type: "text" },
  { label: "상품번호", get: (c) => c.purchaseInfo.productNumber, width: 16, type: "text" },
  { label: "이름", get: (c) => c.purchaseInfo.name, width: 12, type: "text" },
  { label: "주소", get: (c) => c.purchaseInfo.address, width: 24, type: "text" },
  { label: "대출잔액", get: (c) => c.purchaseInfo.loanBalance, width: 12, type: "money" },
  { label: "이자", get: (c) => c.purchaseInfo.interest, width: 10, type: "money" },
  { label: "원리금", get: (c) => c.purchaseInfo.principalInterest, width: 12, type: "money" },
  { label: "법비용", get: (c) => c.purchaseInfo.legalCost, width: 10, type: "money" },
  { label: "선순위원금", get: (c) => c.purchaseInfo.seniorPrincipal, width: 12, type: "money" },
  { label: "선순위최고액", get: (c) => c.purchaseInfo.seniorMaxAmount, width: 12, type: "money" },
  { label: "선순위110%", get: (c) => c.purchaseInfo.senior110, width: 12, type: "money" },
  { label: "등기설정금액", get: (c) => c.purchaseInfo.mortgageRegistration, width: 12, type: "money" },
  { label: "이율(%)", get: (c) => c.purchaseInfo.interestRate, width: 8, type: "percent" },
  { label: "연체이율(%)", get: (c) => c.purchaseInfo.overdueRate, width: 10, type: "percent" },
  { label: "연체일수", get: (c) => c.purchaseInfo.overdueDays, width: 9, type: "int" },
  { label: "비고", get: (c) => c.purchaseInfo.remarks, width: 16, type: "text" },
  // 가격 분석
  { label: "배당기일까지이자", get: (c) => c.priceAnalysis.interestUntilDividend, width: 14, type: "money" },
  { label: "실거래가격", get: (c) => c.priceAnalysis.actualTransPrice, width: 12, type: "money" },
  { label: "KB시세", get: (c) => c.priceAnalysis.kbPrice, width: 12, type: "money" },
  { label: "낙찰가율(%)", get: (c) => c.priceAnalysis.bidRate, width: 10, type: "percent" },
  { label: "매입예상가", get: (c) => c.priceAnalysis.estimatedPurchase, width: 12, type: "money" },
  { label: "할인율(%)", get: (c) => c.priceAnalysis.discountRate, width: 9, type: "percent" },
  { label: "채권매입가", get: (c) => c.priceAnalysis.loanPurchasePrice, width: 12, type: "money" },
  { label: "근저당설정비용", get: (c) => c.priceAnalysis.mortgageSetupCost, width: 12, type: "money" },
  { label: "감평비용", get: (c) => c.priceAnalysis.appraisalCost, width: 10, type: "money" },
  { label: "경매비용", get: (c) => c.priceAnalysis.auctionCost, width: 10, type: "money" },
  { label: "비용합계", get: (c) => c.priceAnalysis.totalCost, width: 10, type: "money" },
  { label: "회수예상가", get: (c) => c.priceAnalysis.purchaseMinusSenior, width: 12, type: "money" },
  { label: "최종매입가", get: (c) => c.priceAnalysis.finalPurchasePrice, width: 12, type: "money" },
  // 운영 파라미터
  { label: "조달금액", get: (c) => c.params.fundingAmount, width: 12, type: "money" },
  { label: "조달금리(%)", get: (c) => c.params.fundingRate, width: 10, type: "percent" },
  { label: "보유기간(개월)", get: (c) => c.params.holdingMonths, width: 11, type: "int" },
  { label: "인건비", get: (c) => c.params.laborCost, width: 10, type: "money" },
  { label: "관리비", get: (c) => c.params.managementCost, width: 10, type: "money" },
  { label: "기타비용", get: (c) => c.params.miscCost, width: 10, type: "money" },
  // 판정
  { label: "최종수익", get: (c) => computeVerdict(c).finalProfit, width: 12, type: "money" },
  { label: "수익률(%)", get: (c) => computeVerdict(c).roi, width: 10, type: "percent" },
];

const HEADER_FILL = "1E3A8A"; // dark blue
const HEADER_FONT = "FFFFFF";
const ALT_ROW_FILL = "F3F4F6"; // light gray
const PROFIT_GREEN = "059669";
const PROFIT_RED = "DC2626";
const ROI_GREEN_BG = "D1FAE5";
const ROI_AMBER_BG = "FEF3C7";
const ROI_RED_BG = "FEE2E2";
const SECTION_PURCHASE = "DBEAFE"; // blue-100
const SECTION_PRICE = "FCE7F3"; // pink-100
const SECTION_PARAMS = "DCFCE7"; // green-100
const SECTION_VERDICT = "FEF3C7"; // amber-100

const SECTION_RANGES: { name: string; cols: number; fill: string }[] = [
  { name: "■ 매입 정보", cols: 16, fill: SECTION_PURCHASE },
  { name: "■ 매입가격 분석", cols: 13, fill: SECTION_PRICE },
  { name: "■ 운영 파라미터", cols: 6, fill: SECTION_PARAMS },
  { name: "■ 판정", cols: 2, fill: SECTION_VERDICT },
];

function border() {
  return {
    top: { style: "thin", color: { rgb: "CCCCCC" } },
    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
    left: { style: "thin", color: { rgb: "CCCCCC" } },
    right: { style: "thin", color: { rgb: "CCCCCC" } },
  };
}

function numberFormat(type: Column["type"]) {
  switch (type) {
    case "money": return "#,##0";
    case "percent": return "0.0";
    case "int": return "0";
    default: return "@";
  }
}

export function exportToExcel(cases: CaseData[], label = "NPL_분석결과") {
  const wb = XLSX.utils.book_new();
  const aoa: (string | number)[][] = [];

  // Title row
  const today = new Date().toLocaleDateString("ko-KR");
  aoa.push([`NPL 채권매입 적정가 분석 — ${label}`]);
  aoa.push([`작성일: ${today} · 총 ${cases.length}건`]);
  aoa.push([]);

  // Section header row
  const sectionRow: string[] = [];
  SECTION_RANGES.forEach((s) => {
    sectionRow.push(s.name);
    for (let i = 1; i < s.cols; i++) sectionRow.push("");
  });
  aoa.push(sectionRow);

  // Column header row
  aoa.push(COLUMNS.map((c) => c.label));

  // Data rows
  cases.forEach((c) => {
    aoa.push(COLUMNS.map((col) => {
      const v = col.get(c);
      return typeof v === "number" && !v ? "" : v;
    }));
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws["!cols"] = COLUMNS.map((c) => ({ wch: c.width }));

  // Row heights
  ws["!rows"] = [
    { hpt: 22 }, // title
    { hpt: 16 }, // subtitle
    { hpt: 8 },  // spacer
    { hpt: 22 }, // section header
    { hpt: 22 }, // column header
  ];

  // ----- Styling -----
  const range = XLSX.utils.decode_range(ws["!ref"] as string);

  // Title
  const titleCell = "A1";
  if (ws[titleCell]) {
    ws[titleCell].s = {
      font: { bold: true, sz: 16, color: { rgb: HEADER_FILL } },
      alignment: { horizontal: "left", vertical: "center" },
    };
  }
  // Merge title across all columns
  ws["!merges"] = ws["!merges"] || [];
  ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: COLUMNS.length - 1 } });
  ws["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: COLUMNS.length - 1 } });

  if (ws["A2"]) {
    ws["A2"].s = {
      font: { sz: 10, color: { rgb: "666666" } },
      alignment: { horizontal: "left" },
    };
  }

  // Section header row (row 4 = index 3)
  let cursor = 0;
  SECTION_RANGES.forEach((s) => {
    const startCol = cursor;
    const endCol = cursor + s.cols - 1;
    const cellAddr = XLSX.utils.encode_cell({ r: 3, c: startCol });
    if (ws[cellAddr]) {
      ws[cellAddr].s = {
        font: { bold: true, sz: 11, color: { rgb: "1E3A8A" } },
        fill: { fgColor: { rgb: s.fill } },
        alignment: { horizontal: "center", vertical: "center" },
        border: border(),
      };
    }
    // Apply fill to remaining cells in this section header
    for (let c = startCol + 1; c <= endCol; c++) {
      const a = XLSX.utils.encode_cell({ r: 3, c });
      if (!ws[a]) ws[a] = { t: "s", v: "" };
      ws[a].s = {
        fill: { fgColor: { rgb: s.fill } },
        border: border(),
      };
    }
    if (s.cols > 1) {
      ws["!merges"].push({ s: { r: 3, c: startCol }, e: { r: 3, c: endCol } });
    }
    cursor = endCol + 1;
  });

  // Column header row (row 5 = index 4)
  COLUMNS.forEach((col, i) => {
    const a = XLSX.utils.encode_cell({ r: 4, c: i });
    if (!ws[a]) ws[a] = { t: "s", v: col.label };
    ws[a].s = {
      font: { bold: true, sz: 10, color: { rgb: HEADER_FONT } },
      fill: { fgColor: { rgb: HEADER_FILL } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: border(),
    };
  });

  // Data rows (start at row 5 = index 5)
  const DATA_START = 5;
  for (let r = DATA_START; r <= range.e.r; r++) {
    const isAlt = (r - DATA_START) % 2 === 1;
    COLUMNS.forEach((col, c) => {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!ws[a]) ws[a] = { t: col.type === "text" ? "s" : "n", v: col.type === "text" ? "" : 0 };

      const baseStyle: Record<string, unknown> = {
        font: { sz: 10, color: { rgb: "111827" } },
        alignment: {
          horizontal: col.type === "text" ? "left" : "right",
          vertical: "center",
        },
        border: border(),
        numFmt: numberFormat(col.type),
      };
      if (isAlt) baseStyle.fill = { fgColor: { rgb: ALT_ROW_FILL } };

      // 최종수익 column color
      if (col.label === "최종수익") {
        const v = ws[a].v as number;
        if (typeof v === "number") {
          (baseStyle.font as Record<string, unknown>) = {
            sz: 10,
            bold: true,
            color: { rgb: v > 0 ? PROFIT_GREEN : v < 0 ? PROFIT_RED : "111827" },
          };
        }
      }
      // 수익률 column color (background)
      if (col.label === "수익률(%)") {
        const v = ws[a].v as number;
        if (typeof v === "number") {
          baseStyle.fill = {
            fgColor: { rgb: v >= 10 ? ROI_GREEN_BG : v >= 0 ? ROI_AMBER_BG : ROI_RED_BG },
          };
          (baseStyle.font as Record<string, unknown>) = {
            sz: 10,
            bold: true,
            color: { rgb: v >= 10 ? PROFIT_GREEN : v >= 0 ? "B45309" : PROFIT_RED },
          };
        }
      }

      ws[a].s = baseStyle;
    });
  }

  // Freeze top header rows + first 4 columns (매각사~주소)
  ws["!freeze"] = { xSplit: 4, ySplit: 5 };

  XLSX.utils.book_append_sheet(wb, ws, "분석결과");

  const fileName = `${label}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
