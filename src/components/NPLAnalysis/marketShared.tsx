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
  meanAmount: number;        // IQR 트림 정제 평균
  medianAmount: number;
  meanPyeongPrice: number;
  recent: RealpriceItem[];
  excludedOutliers: number;  // 정제에서 제외된 건수
  rawMeanAmount: number;     // 원본 단순 평균
}

export interface ComplexStats {
  aptName: string;
  count: number;
  meanAmount: number;        // IQR 트림 정제 평균
  meanArea: number;
  meanPyeongPrice: number;
  items: RealpriceItem[];
  excludedOutliers: number;
  rawMeanAmount: number;
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

export interface UmdBreakdown {
  umdNm: string;
  count: number;
  meanAmount: number;
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
  topComplexes: { name: string; count: number; umdNm: string }[];
  umdBreakdown: UmdBreakdown[];
}

export interface InsightItem {
  label: string;
  value: string;
}

export interface ClaudeCorrection {
  estimatedPrice: number;
  excludedIndices: number[];
  excludeReasons: string[];
  rationale: string;
}

export interface ClaudeInsight {
  claudeCorrection: ClaudeCorrection | null;
  marketDiagnosis: InsightItem[];
  priceEvaluation: InsightItem[];
  nplPerspective: InsightItem[];
  confidence: InsightItem[];
  summary: string;
}

const INSIGHT_SECTIONS: { key: keyof Pick<ClaudeInsight, "marketDiagnosis" | "priceEvaluation" | "nplPerspective" | "confidence">; emoji: string; title: string; tone: "neutral" | "primary" | "accent" }[] = [
  { key: "marketDiagnosis", emoji: "📊", title: "시장 진단", tone: "neutral" },
  { key: "priceEvaluation", emoji: "💰", title: "가격 평가", tone: "primary" },
  { key: "nplPerspective", emoji: "🎯", title: "NPL 매입 관점", tone: "accent" },
  { key: "confidence", emoji: "⭐", title: "신뢰도 평가", tone: "neutral" },
];

export function InsightDisplay({ insight, ruleCorrectedAmount }: { insight: ClaudeInsight; ruleCorrectedAmount?: number }) {
  const cc = insight.claudeCorrection;
  const diffVsRule = cc && ruleCorrectedAmount && ruleCorrectedAmount > 0
    ? Math.round(((cc.estimatedPrice - ruleCorrectedAmount) / ruleCorrectedAmount) * 1000) / 10
    : null;
  return (
    <div className="space-y-3">
      {/* 종합 요약 (큰 한 줄) */}
      {insight.summary && (
        <div className="rounded-md border border-primary/30 bg-primary/10 p-3">
          <div className="text-xs text-muted-foreground mb-1">💡 종합 의견</div>
          <p className="text-sm font-medium text-foreground">{insight.summary}</p>
        </div>
      )}

      {/* Claude 직접 보정 시세 */}
      {cc && (
        <div className="rounded-md border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-3">
          <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
            🤖 Claude AI 직접 분석 보정
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="text-3xl font-bold tabular-nums text-primary">
              {formatManwon(cc.estimatedPrice)}
            </div>
            {diffVsRule !== null && (
              <div className="text-xs text-muted-foreground">
                룰 보정 대비 <span className="font-semibold tabular-nums">{diffVsRule >= 0 ? "+" : ""}{diffVsRule}%</span>
              </div>
            )}
          </div>
          {cc.rationale && (
            <p className="text-xs text-muted-foreground mt-2">💭 {cc.rationale}</p>
          )}
          {cc.excludedIndices.length > 0 && (
            <div className="mt-3 pt-3 border-t border-primary/15">
              <div className="text-xs font-semibold text-foreground mb-1.5">
                📌 Claude가 이상치로 분류한 거래 ({cc.excludedIndices.length}건)
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {cc.excludedIndices.map((idx, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-600 font-mono">#{idx}</span>
                    <span>{cc.excludeReasons[i] ?? ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4섹션 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {INSIGHT_SECTIONS.map((sec) => {
          const items = insight[sec.key];
          if (!items || items.length === 0) return null;
          const borderColor =
            sec.tone === "primary" ? "border-primary/25"
            : sec.tone === "accent" ? "border-amber-500/30"
            : "border-border/60";
          return (
            <div key={sec.key} className={`rounded-md border ${borderColor} bg-background/70 p-3`}>
              <div className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <span className="text-base">{sec.emoji}</span>
                <span>{sec.title}</span>
              </div>
              <div className="space-y-1.5">
                {items.map((item, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3 py-1 border-b border-border/30 last:border-0">
                    <span className="text-xs text-muted-foreground flex-shrink-0">{item.label}</span>
                    <span className="text-sm text-foreground font-medium tabular-nums text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
