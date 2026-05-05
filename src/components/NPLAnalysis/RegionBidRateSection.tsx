// 낙찰가율 조회 — 시도 + 시군구 + 기간 → 추정 낙찰가율 + AI 보정

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, TrendingUp, MapPin } from "lucide-react";
import { FormattedNumberInput } from "./FormattedNumberInput";
import { SIDO_LIST, SIGUNGU_BY_SIDO, type SidoName } from "@/data/regionCodes";
import { SIDO_BID_RATES, DEFAULT_NATIONAL_BID_RATE, BID_RATES_LAST_UPDATED } from "@/data/bidRates";
import {
  PERIODS,
  formatManwon,
  MainMetric,
  SecondaryRow,
  InsightDisplay,
  type RealpriceResult,
  type ClaudeInsight,
} from "./marketShared";

// 동 단위 평균을 신뢰할 수 있는 최소 표본수 — 미만이면 자동으로 구 평균으로 fallback.
const UMD_MIN_SAMPLE = 10;
const UMD_ALL = "__all";

export function RegionBidRateSection() {
  const [sido, setSido] = useState<SidoName | "">("");
  const [sigunguCode, setSigunguCode] = useState<string>("");
  const [umdName, setUmdName] = useState<string>("");
  const [period, setPeriod] = useState<string>("12");
  // 감정가는 원 단위로 사용자 입력 (자동 천단위 콤마). 내부 계산은 만원 단위로 변환.
  const [appraisal, setAppraisal] = useState<number>(0);
  const [assumedRate, setAssumedRate] = useState<string>(String(DEFAULT_NATIONAL_BID_RATE));
  // 사용자가 낙찰가율을 직접 수정했는지 추적 — 수정한 후엔 시·도 변경해도 prefill 안 함.
  const [rateUserEdited, setRateUserEdited] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<RealpriceResult | null>(null);
  const [resultMeta, setResultMeta] = useState<{ regionLabel: string; periodLabel: string; umdLabel: string } | null>(null);

  const [insight, setInsight] = useState<ClaudeInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string>("");

  const sigunguList = sido ? SIGUNGU_BY_SIDO[sido] : [];
  const sigunguName = useMemo(
    () => sigunguList.find((g) => g.code === sigunguCode)?.name ?? "",
    [sigunguList, sigunguCode],
  );
  const canSearch = !!(sido && sigunguCode && period);

  const handleSearch = async (overrideUmd?: string) => {
    if (!canSearch) return;
    const useUmd = overrideUmd !== undefined ? overrideUmd : umdName;
    setLoading(true); setError("");
    setInsight(null); setInsightError("");
    try {
      const params = new URLSearchParams({ lawdCd: sigunguCode, months: period });
      if (useUmd) params.set("umdName", useUmd);
      const res = await fetch(`/api/realprice?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
      setResultMeta({
        regionLabel: `${sido} ${sigunguName}`,
        umdLabel: useUmd,
        periodLabel: PERIODS.find((p) => p.value === period)?.label ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // 동 선택 변경 — 첫 검색 후에만 자동 재호출.
  const handleUmdChange = (next: string) => {
    setUmdName(next);
    if (result) handleSearch(next);
  };

  // 동 선택 + 표본 충분 → 동 평균 사용. 그 외 → 구 평균 사용.
  const usingUmd = !!umdName && !!result?.complex && result.complex.count >= UMD_MIN_SAMPLE;
  const refMarketAmount = usingUmd
    ? (result?.complex?.meanAmount ?? 0)
    : (result?.area.meanAmount ?? 0);
  const refCorrection = usingUmd
    ? (result?.complexCorrection ?? null)
    : (result?.areaCorrection ?? null);
  const refLabel = usingUmd && resultMeta?.umdLabel
    ? `${resultMeta.regionLabel} ${resultMeta.umdLabel}`
    : (resultMeta?.regionLabel ?? "");
  const fallbackReason = umdName && result?.complex && result.complex.count < UMD_MIN_SAMPLE
    ? `${umdName} 거래 ${result.complex.count}건 부족 (최소 ${UMD_MIN_SAMPLE}건) → 구 평균으로 산출`
    : "";

  const handleInsight = async () => {
    if (!result || !resultMeta) return;
    const correction = refCorrection;
    const surfaceMean = refMarketAmount;
    if (!correction || !surfaceMean) return;
    setInsightLoading(true); setInsightError(""); setInsight(null);
    try {
      const sourceItems = usingUmd && result.complex ? result.complex.items : result.area.recent;
      const itemsForClaude = sourceItems.slice(0, 30).map((it) => ({
        aptNm: it.aptNm,
        umdNm: it.umdNm,
        excluUseAr: it.excluUseAr,
        floor: it.floor,
        dealAmount: it.dealAmount,
        dealYear: it.dealYear,
        dealMonth: it.dealMonth,
        dealDay: it.dealDay,
        dealingGbn: it.dealingGbn,
      }));
      const body = {
        region: refLabel,
        period: resultMeta.periodLabel,
        surfaceMean,
        correctedMean: correction.correctedMeanAmount,
        excludedOutlier: correction.excludedOutlier,
        excludedDirectDeal: correction.excludedDirectDeal,
        usedCount: correction.usedCount,
        trendDirection: correction.trendDirection,
        trendDeltaPct: correction.trendDeltaPct,
        confidenceStars: correction.confidenceStars,
        recentItems: itemsForClaude,
      };
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setInsight(json);
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : String(e));
    } finally {
      setInsightLoading(false);
    }
  };

  const handleReset = () => {
    setSido(""); setSigunguCode(""); setUmdName(""); setPeriod("12");
    setAppraisal(0); setAssumedRate(String(DEFAULT_NATIONAL_BID_RATE));
    setRateUserEdited(false);
    setResult(null); setResultMeta(null); setError("");
    setInsight(null); setInsightError("");
  };

  // 사용자 입력은 원 단위 → 시세 데이터(만원)와 맞추기 위해 1만으로 나눔.
  const appraisalManwon = appraisal / 10000;
  const rateNum = parseFloat(assumedRate) || 0;
  const estimatedBidPrice = Math.round(appraisalManwon * (rateNum / 100));
  const appraisalVsMarketPct =
    refMarketAmount > 0 && appraisalManwon > 0
      ? Math.round((appraisalManwon / refMarketAmount) * 1000) / 10
      : 0;

  return (
    <div className="space-y-4">
      {/* ===== 검색 폼 ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4" />
            📈 2단계 — 지역 낙찰가율 조회
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            해당 지역의 평균 시세 데이터로 낙찰가율을 추정합니다. 감정가 입력 시 추정 낙찰가도 자동 계산.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />시·도
              </Label>
              <Select
                value={sido}
                onValueChange={(v) => {
                  const next = v as SidoName;
                  setSido(next);
                  setSigunguCode("");
                  setUmdName("");
                  // 사용자가 직접 수정하지 않은 경우에만 prefill (수정값은 보존).
                  if (!rateUserEdited) {
                    setAssumedRate(String(SIDO_BID_RATES[next] ?? DEFAULT_NATIONAL_BID_RATE));
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {SIDO_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">시·군·구</Label>
              <Select
                value={sigunguCode}
                onValueChange={(v) => { setSigunguCode(v); setUmdName(""); }}
                disabled={!sido}
              >
                <SelectTrigger><SelectValue placeholder={sido ? "선택" : "시·도 먼저"} /></SelectTrigger>
                <SelectContent>
                  {sigunguList.map((g) => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">법정동 (선택)</Label>
              <Select
                value={umdName || UMD_ALL}
                onValueChange={(v) => handleUmdChange(v === UMD_ALL ? "" : v)}
                disabled={!result?.umdBreakdown?.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={result ? "전체 (구 단위)" : "조회 후 선택"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UMD_ALL}>전체 (구 단위)</SelectItem>
                  {result?.umdBreakdown.map((u) => (
                    <SelectItem key={u.umdNm} value={u.umdNm}>
                      {u.umdNm} ({u.count}건{u.count < UMD_MIN_SAMPLE ? " · 표본부족" : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">조회 기간</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleSearch()} disabled={!canSearch || loading} className="flex-1 gap-1.5" size="lg">
              <Search className="w-4 h-4" />
              {loading ? "조회 중..." : "낙찰가율 조회"}
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={loading} size="lg">초기화</Button>
          </div>
        </CardContent>
      </Card>

      {/* 빈 / 로딩 / 에러 */}
      {!result && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">지역과 기간을 선택하고<br />낙찰가율 조회를 눌러주세요</p>
          </CardContent>
        </Card>
      )}
      {loading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              지역 시세 데이터 조회 중...
            </div>
          </CardContent>
        </Card>
      )}
      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">조회 실패: {error}</CardContent>
        </Card>
      )}

      {/* ===== 결과 ===== */}
      {result && resultMeta && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm px-1">
            <span className="font-semibold text-foreground">{refLabel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{resultMeta.periodLabel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">전체 거래 {result.totalFetched.toLocaleString()}건</span>
            {usingUmd && (
              <Badge variant="default" className="text-xs">동 평균 사용 ({result.complex?.count}건)</Badge>
            )}
          </div>

          {fallbackReason && (
            <div className="text-xs px-3 py-2 rounded-md border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
              ⚠️ {fallbackReason}
            </div>
          )}

          {/* 카드 ③ 추정 낙찰가율 */}
          <Card className="shadow-sm border-primary/30 bg-primary/5">
            <CardHeader className="pb-3 border-b border-primary/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-xl">📈</span>
                <span>③ 추정 낙찰가율 (시세 기반)</span>
                <Badge variant="outline" className="ml-auto text-xs font-normal">
                  {usingUmd ? "동 평균 기준" : "구 평균 기준"}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                감정가와 가정 낙찰가율을 입력하면 추정 낙찰가가 자동 계산됩니다.
              </p>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {appraisalManwon > 0 && rateNum > 0 ? (
                <MainMetric value={formatManwon(estimatedBidPrice)} label="추정 낙찰가" accent />
              ) : (
                <MainMetric value="—" label="감정가 입력 후 계산" muted />
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-primary/15">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">감정가 (원)</Label>
                  <FormattedNumberInput value={appraisal} onChange={setAppraisal} placeholder="예: 800,000,000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    평균 낙찰가율 (%) <span className="text-[10px] text-primary">· 지역별 자동</span>
                  </Label>
                  <Input
                    type="number"
                    value={assumedRate}
                    onChange={(e) => { setAssumedRate(e.target.value); setRateUserEdited(true); }}
                    placeholder="80"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    ※ {BID_RATES_LAST_UPDATED} 기준 추정치 — 시장 변동(호황기 100%+ / 침체기 70%대)에 따라 차이 큼. 직접 수정 가능.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    기준 시세 ({usingUmd ? "동 평균" : "구 평균"})
                  </Label>
                  <div className="h-10 px-3 flex items-center text-sm border rounded-md bg-background">
                    {refMarketAmount > 0 ? formatManwon(refMarketAmount) : "—"}
                  </div>
                </div>
              </div>
              {appraisalManwon > 0 && rateNum > 0 && (
                <>
                  <SecondaryRow
                    items={[
                      { label: "감정가 vs 시세", value: appraisalVsMarketPct > 0 ? `${appraisalVsMarketPct}%` : "—" },
                      {
                        label: "시세 대비 낙찰가",
                        value: refMarketAmount > 0
                          ? `${Math.round((estimatedBidPrice / refMarketAmount) * 1000) / 10}%`
                          : "—",
                      },
                    ]}
                  />
                  {refMarketAmount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      💡 {appraisalVsMarketPct < 95
                        ? `감정가가 시세의 ${appraisalVsMarketPct}%로 저평가 가능성 → 경쟁 치열, 낙찰가율 상향 가능`
                        : appraisalVsMarketPct > 105
                        ? `감정가가 시세의 ${appraisalVsMarketPct}%로 고평가 가능성 → 유찰·저낙찰 가능`
                        : `감정가가 시세와 근접(${appraisalVsMarketPct}%) → 표준 낙찰가율 적용 적절`}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 카드 ④ AI 보정 낙찰가율 */}
          {(() => {
            const correction = refCorrection;
            const surfaceMean = refMarketAmount;
            if (!correction) {
              return (
                <Card className="shadow-sm border-dashed bg-muted/30">
                  <CardContent className="py-4 text-sm text-muted-foreground">표본이 부족해 보정값을 산출할 수 없습니다.</CardContent>
                </Card>
              );
            }
            const diffPct = surfaceMean > 0
              ? Math.round(((correction.correctedMeanAmount - surfaceMean) / surfaceMean) * 1000) / 10
              : 0;
            const correctedBidRatePct = appraisalManwon > 0 && rateNum > 0 && correction.correctedMeanAmount > 0
              ? Math.round((appraisalManwon * (rateNum / 100) / correction.correctedMeanAmount) * 1000) / 10
              : null;
            const trendIcon = correction.trendDirection === "up" ? "↗" : correction.trendDirection === "down" ? "↘" : "→";
            const trendText = correction.trendDirection === "up" ? "상승" : correction.trendDirection === "down" ? "하락" : "보합";
            return (
              <Card className="shadow-sm border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3 border-b border-primary/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-xl">🤖</span>
                    <span>④ AI 보정 낙찰가율</span>
                    <Badge variant="default" className="ml-auto text-xs font-normal">룰 기반 보정 + 추세 반영</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    이상치·직거래 제외한 보정 시세에 가정 낙찰가율을 적용. 추세에 따라 신뢰도 조정.
                  </p>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <MainMetric
                    value={correctedBidRatePct !== null ? `${correctedBidRatePct}%` : "—"}
                    label={correctedBidRatePct !== null ? "보정 시세 대비 낙찰가율" : "감정가 입력 후 계산"}
                    accent={correctedBidRatePct !== null}
                    muted={correctedBidRatePct === null}
                  />
                  <SecondaryRow
                    items={[
                      { label: "보정 시세", value: `${formatManwon(correction.correctedMeanAmount)} (${diffPct >= 0 ? "+" : ""}${diffPct}%)` },
                      { label: "신뢰도", value: `${"★".repeat(correction.confidenceStars)}${"☆".repeat(5 - correction.confidenceStars)}` },
                      { label: "추세", value: `${trendIcon} ${trendText} ${Math.abs(correction.trendDeltaPct)}%` },
                      { label: "사용 표본", value: `${correction.usedCount}건` },
                    ]}
                  />
                  <div className="pt-3 border-t border-primary/15">
                    {!insight && !insightLoading && !insightError && (
                      <Button onClick={handleInsight} variant="outline" size="sm" className="gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        자세한 해석 보기 (Claude AI)
                      </Button>
                    )}
                    {insightLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Claude AI 분석 중...
                      </div>
                    )}
                    {insightError && (
                      <div className="text-sm text-destructive">
                        해석 실패: {insightError}
                        <Button onClick={handleInsight} variant="ghost" size="sm" className="ml-2 h-7">다시 시도</Button>
                      </div>
                    )}
                    {insight && (
                      <div className="space-y-3">
                        <InsightDisplay insight={insight} ruleCorrectedAmount={correction.correctedMeanAmount} />
                        <div className="flex justify-end">
                          <Button onClick={handleInsight} variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <Sparkles className="w-3 h-3" />
                            다시 분석
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
}
