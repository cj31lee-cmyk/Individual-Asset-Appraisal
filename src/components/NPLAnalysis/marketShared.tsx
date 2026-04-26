// MarketAnalysisSection의 두 sub-section이 공유하는 타입·헬퍼·UI 컴포넌트.

export const SQM_PER_PYEONG = 3.305785;

export const PERIODS = [
  { value: "3", label: "최근 3개월" },
  { value: "6", label: "최근 6개월" },
  { value: "12", label: "최근 12개월" },
  { value: "24", label: "최근 24개월" },
];

export interface RealpriceItem {
  aptNm: string;
  umdNm: string;
  jibun: string;
  dealAmount: number;
  dealYear: number;
  dealMonth: number;
  dealDay: number;
  excluUseAr: number;
  floor: number;
  buildYear: number;
  dealingGbn: string;
}

export interface AreaStats {
  count: number;
  meanAmount: number;
  medianAmount: number;
  meanPyeongPrice: number;
  recent: RealpriceItem[];
}

export interface ComplexStats {
  aptName: string;
  count: number;
  meanAmount: number;
  meanArea: number;
  meanPyeongPrice: number;
  items: RealpriceItem[];
}

export interface CorrectionResult {
  correctedMeanAmount: number;
  correctedMeanPyeongPrice: number;
  totalInput: number;
  excludedOutlier: number;
  excludedDirectDeal: number;
  usedCount: number;
  trendDirection: "up" | "down" | "stable";
  trendDeltaPct: number;
  confidenceStars: 1 | 2 | 3 | 4 | 5;
  cv: number;
}

export interface RealpriceResult {
  lawdCd: string;
  monthsQueried: string[];
  totalFetched: number;
  totalAfterFilter: number;
  area: AreaStats;
  complex: ComplexStats | null;
  areaCorrection: CorrectionResult | null;
  complexCorrection: CorrectionResult | null;
}

export interface ClaudeInsight {
  insight: string;
  confidenceNote: string;
}

export function formatManwon(manwon: number): string {
  if (manwon <= 0) return "—";
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  if (eok === 0) return `${manwon.toLocaleString()}만`;
  if (rest === 0) return `${eok}억`;
  return `${eok}억 ${rest.toLocaleString()}만`;
}

export function MainMetric({
  value,
  label,
  accent,
  muted,
}: {
  value: string;
  label: string;
  accent?: boolean;
  muted?: boolean;
}) {
  const colorClass = muted
    ? "text-muted-foreground/40"
    : accent
    ? "text-primary"
    : "text-foreground";
  return (
    <div>
      <div className={`text-4xl md:text-5xl font-bold tabular-nums leading-tight ${colorClass}`}>
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-1.5">{label}</div>
    </div>
  );
}

export function SecondaryRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="mt-5 pt-4 border-t border-border/50 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground text-xs">{it.label}</span>
          <span className="font-semibold text-foreground tabular-nums">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
