// 낙찰가율 조회 — 시도 + 시군구 + 기간 → 추정 낙찰가율 + AI 보정

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, TrendingUp, MapPin } from "lucide-react";
import { SIDO_LIST, SIGUNGU_BY_SIDO, type SidoName } from "@/data/regionCodes";
import {
  PERIODS,
  formatManwon,
  MainMetric,
  SecondaryRow,
  type RealpriceResult,
  type ClaudeInsight,
} from "./marketShared";

const DEFAULT_BID_RATE = 80;

export function RegionBidRateSection() {
  const [sido, setSido] = useState<SidoName | "">("");
  const [sigunguCode, setSigunguCode] = useState<string>("");
  const [period, setPeriod] = useState<string>("12");
  const [appraisal, setAppraisal] = useState<string>("");
  const [assumedRate, setAssumedRate] = useState<string>(String(DEFAULT_BID_RATE));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<RealpriceResult | null>(null);
  const [resultMeta, setResultMeta] = useState<{ regionLabel: string; periodLabel: string } | null>(null);

  const [insight, setInsight] = useState<ClaudeInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string>("");

  const sigunguList = sido ? SIGUNGU_BY_SIDO[sido] : [];
  const sigunguName = useMemo(
    () => sigunguList.find((g) => g.code === sigunguCode)?.name ?? "",
    [sigunguList, sigunguCode],
  );
  const canSearch = !!(sido && sigunguCode && period);

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true); setError(""); setResult(null);
    setInsight(null); setInsightError("");
    try {
      const params = new URLSearchParams({ lawdCd: sigunguCode, months: period });
      const res = await fetch(`/api/realprice?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
      setResultMeta({
        regionLabel: `${sido} ${sigunguName}`,
        periodLabel: PERIODS.find((p) => p.value === period)?.label ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleInsight = async () => {
    if (!result || !resultMeta) return;
    const correction = result.areaCorrection;
    const surfaceMean = result.area.meanAmount;
    if (!correction || !surfaceMean) return;
    setInsightLoading(true); setInsightError(""); setInsight(null);
    try {
      const body = {
        region: resultMeta.regionLabel,
        period: resultMeta.periodLabel,
        surfaceMean,
        correctedMean: correction.correctedMeanAmount,
        excludedOutlier: correction.excludedOutlier,
        excludedDirectDeal: correction.excludedDirectDeal,
        usedCount: correction.usedCount,
        trendDirection: correction.trendDirection,
        trendDeltaPct: correction.trendDeltaPct,
        confidenceStars: correction.confidenceStars,
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
    setSido(""); setSigunguCode(""); setPeriod("12");
    setAppraisal(""); setAssumedRate(String(DEFAULT_BID_RATE));
    setResult(null); setResultMeta(null); setError("");
    setInsight(null); setInsightError("");
  };

  const appraisalNum = parseFloat(appraisal) || 0;
  const rateNum = parseFloat(assumedRate) || 0;
  const estimatedBidPrice = Math.round(appraisalNum * (rateNum / 100));
  const refMarketAmount = result?.area.meanAmount ?? 0;
  const appraisalVsMarketPct =
    refMarketAmount > 0 && appraisalNum > 0
      ? Math.round((appraisalNum / refMarketAmount) * 1000) / 10
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />시·도
              </Label>
              <Select value={sido} onValueChange={(v) => { setSido(v as SidoName); setSigunguCode(""); }}>
                <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {SIDO_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">시·군·구</Label>
              <Select value={sigunguCode} onValueChange={setSigunguCode} disabled={!sido}>
                <SelectTrigger><SelectValue placeholder={sido ? "선택" : "시·도 먼저"} /></SelectTrigger>
                <SelectContent>
                  {sigunguList.map((g) => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
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
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={!canSearch || loading} className="flex-1 gap-1.5" size="lg">
                <Search className="w-4 h-4" />
                {loading ? "조회 중..." : "낙찰가율 조회"}
              </Button>
              <Button onClick={handleReset} variant="outline" disabled={loading} size="lg">초기화</Button>
            </div>
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
            <span className="font-semibold text-foreground">{resultMeta.regionLabel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{resultMeta.periodLabel}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">전체 거래 {result.totalFetched.toLocaleString()}건</span>
          </div>

          {/* 카드 ③ 추정 낙찰가율 */}
          <Card className="shadow-sm border-primary/30 bg-primary/5">
            <CardHeader className="pb-3 border-b border-primary/20">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-xl">📈</span>
                <span>③ 추정 낙찰가율 (시세 기반)</span>
                <Badge variant="outline" className="ml-auto text-xs font-normal">지역 평균 기준</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                감정가와 가정 낙찰가율을 입력하면 추정 낙찰가가 자동 계산됩니다.
              </p>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {appraisalNum > 0 && rateNum > 0 ? (
                <MainMetric value={formatManwon(estimatedBidPrice)} label="추정 낙찰가" accent />
              ) : (
                <MainMetric value="—" label="감정가 입력 후 계산" muted />
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-primary/15">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">감정가 (만원)</Label>
                  <Input type="number" value={appraisal} onChange={(e) => setAppraisal(e.target.value)} placeholder="예: 80000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">가정 낙찰가율 (%)</Label>
                  <Input type="number" value={assumedRate} onChange={(e) => setAssumedRate(e.target.value)} placeholder="80" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">기준 시세 (지역 평균)</Label>
                  <div className="h-10 px-3 flex items-center text-sm border rounded-md bg-background">
                    {refMarketAmount > 0 ? formatManwon(refMarketAmount) : "—"}
                  </div>
                </div>
              </div>
              {appraisalNum > 0 && rateNum > 0 && (
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
            const correction = result.areaCorrection;
            const surfaceMean = result.area.meanAmount;
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
            const correctedBidRatePct = appraisalNum > 0 && rateNum > 0 && correction.correctedMeanAmount > 0
              ? Math.round((appraisalNum * (rateNum / 100) / correction.correctedMeanAmount) * 1000) / 10
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
                      <div className="space-y-2 text-sm bg-background/60 rounded-md p-3 border border-primary/15">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-foreground">{insight.insight}</p>
                        </div>
                        {insight.confidenceNote && (
                          <p className="text-xs text-muted-foreground pl-6">💬 {insight.confidenceNote}</p>
                        )}
                        <Button onClick={handleInsight} variant="ghost" size="sm" className="ml-auto h-7 text-xs">🔄 다시 분석</Button>
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
