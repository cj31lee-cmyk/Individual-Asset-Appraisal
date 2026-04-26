// 시세 조회 — 주소(시도/시군구) + 단지명 + 면적 → 단지·평형 시세 + AI 보정 시세

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Sparkles, Home, MapPin, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SIDO_LIST, SIGUNGU_BY_SIDO, type SidoName } from "@/data/regionCodes";
import {
  PERIODS,
  SQM_PER_PYEONG,
  formatManwon,
  MainMetric,
  SecondaryRow,
  InsightDisplay,
  type RealpriceResult,
  type ClaudeInsight,
} from "./marketShared";

export function PriceLookupSection() {
  const [sido, setSido] = useState<SidoName | "">("");
  const [sigunguCode, setSigunguCode] = useState<string>("");
  const [umdName, setUmdName] = useState<string>("");
  const [aptName, setAptName] = useState<string>("");
  const [area, setArea] = useState<string>("");          // 단일 면적 ㎡ → ±5 자동
  const [period, setPeriod] = useState<string>("6");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<RealpriceResult | null>(null);
  const [resultMeta, setResultMeta] = useState<{ regionLabel: string; periodLabel: string } | null>(null);

  const [insight, setInsight] = useState<ClaudeInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string>("");

  // 단지 종합 리포트 (Sonnet 4.6, 마크다운)
  const [report, setReport] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string>("");

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
    setReport(""); setReportError("");
    try {
      const params = new URLSearchParams({ lawdCd: sigunguCode, months: period });
      if (aptName.trim()) params.set("aptName", aptName.trim());
      if (umdName.trim()) params.set("umdName", umdName.trim());
      // 단일 면적 입력 → ±5㎡ 범위 자동 적용
      const areaNum = parseFloat(area.trim());
      if (!isNaN(areaNum) && areaNum > 0) {
        params.set("areaMin", String(Math.max(0, areaNum - 5)));
        params.set("areaMax", String(areaNum + 5));
      }

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
    const correction = result.complexCorrection ?? result.areaCorrection;
    const surfaceMean = result.complex?.meanAmount ?? result.area.meanAmount;
    if (!correction || !surfaceMean) return;
    setInsightLoading(true); setInsightError(""); setInsight(null);
    try {
      // Claude에게 raw 거래도 함께 전달 → AI가 직접 이상치 판단 + 보정값 산출
      const itemsForClaude = (result.complex?.items ?? result.area.recent).slice(0, 30).map((it) => ({
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
        recentItems: itemsForClaude,
        ...(result.complex && {
          complexName: result.complex.aptName,
          complexCount: result.complex.count,
          complexMean: result.complex.meanAmount,
        }),
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
    setSido(""); setSigunguCode(""); setUmdName(""); setAptName("");
    setArea(""); setPeriod("6");
    setResult(null); setResultMeta(null); setError("");
    setInsight(null); setInsightError("");
    setReport(""); setReportError("");
  };

  const handleReport = async () => {
    if (!result || !resultMeta || !result.complex) return;
    const correction = result.complexCorrection;
    if (!correction) return;
    setReportLoading(true); setReportError(""); setReport("");
    try {
      const itemsForReport = result.complex.items.slice(0, 30).map((it) => ({
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
        region: resultMeta.regionLabel,
        complexName: aptName.trim() || result.complex.aptName,
        count: result.complex.count,
        surfaceMean: result.complex.rawMeanAmount,
        correctedMean: correction.correctedMeanAmount,
        meanArea: result.complex.meanArea,
        meanPyeongPrice: result.complex.meanPyeongPrice,
        trendDirection: correction.trendDirection,
        trendDeltaPct: correction.trendDeltaPct,
        areaPyeongPrice: result.area.meanPyeongPrice,
        recentItems: itemsForReport,
      };
      const res = await fetch("/api/complex-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setReport(json.markdown ?? "");
    } catch (e) {
      setReportError(e instanceof Error ? e.message : String(e));
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ===== 검색 폼: 주소·단지 ===== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="w-4 h-4" />
            🏠 1단계 — 시세 조회 (주소·단지·평형)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            KB시세처럼 특정 단지·평형의 실거래 평균을 조회합니다. 단지명과 면적을 입력하면 해당 매물 시세가 산출됩니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 주소 */}
          <div>
            <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              주소
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">시·도</Label>
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
            </div>
          </div>

          {/* 주소·단지·평형 좁히기 */}
          <div>
            <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-primary" />
              주소·단지·평형 좁히기 (모두 선택 — 비워두면 지역 전체)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">주소 (법정동·읍면동)</Label>
                <Input value={umdName} onChange={(e) => setUmdName(e.target.value)} placeholder="예: 고덕동, 잠실동" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">단지명 (부분일치)</Label>
                <Input value={aptName} onChange={(e) => setAptName(e.target.value)} placeholder="예: 래미안힐스테이트" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">전용면적 (㎡, ±5 자동)</Label>
                <Input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="예: 59 (54~64) / 84 (79~89)"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ※ 주소·단지·면적은 <b>서로 보완</b>: 한 칸만 입력해도 OK, 여러 칸 입력 시 AND 조건.
              면적은 단일 값 입력 시 자동 ±5㎡ 범위 검색 (84 → 79~89㎡, 59 → 54~64㎡).
              부분일치: "고덕" → 고덕동 / 래미안힐스테이트고덕 모두 매칭 가능.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={!canSearch || loading} className="flex-1 gap-1.5" size="lg">
              <Search className="w-4 h-4" />
              {loading ? "조회 중..." : "시세 조회"}
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={loading} size="lg">초기화</Button>
          </div>
        </CardContent>
      </Card>

      {/* 빈 / 로딩 / 에러 */}
      {!result && !loading && !error && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Home className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">주소(시도·시군구)와 단지명을 입력하고<br />시세 조회를 눌러주세요</p>
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
              실거래가 조회 중...
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
            {result.complex && (
              <Badge variant="outline" className="text-xs ml-1">단지 매칭 {result.totalAfterFilter}건</Badge>
            )}
          </div>

          {/* 카드 ① 시세 — 단지 매칭 우선, 없으면 지역 평균 */}
          {result.complex && result.complex.count > 0 ? (
            <Card className="shadow-sm border-primary/30">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-xl">📊</span>
                  <span>① 시세 — {result.complex.aptName}</span>
                  <Badge variant="default" className="ml-auto text-xs font-normal">단지·평형 기준 · 이상치 자동 제외</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  IQR 통계 기준으로 증여·급매 등 이상 거래(평당가 사분범위 1.5배 밖)를 제외한 정제 평균입니다.
                  {result.complex.excludedOutliers > 0 && ` 매칭 ${result.complex.count}건 중 ${result.complex.excludedOutliers}건 제외 → ${result.complex.count - result.complex.excludedOutliers}건으로 산출.`}
                </p>
              </CardHeader>
              <CardContent className="pt-5">
                <MainMetric value={formatManwon(result.complex.meanAmount)} label={`정제 평균가 (${result.complex.aptName})`} accent />
                <SecondaryRow
                  items={[
                    { label: "매칭", value: `${result.complex.count}건` },
                    ...(result.complex.excludedOutliers > 0
                      ? [{ label: "이상치 제외", value: `${result.complex.excludedOutliers}건` }]
                      : []),
                    { label: "평균면적", value: `${result.complex.meanArea}㎡ (${(result.complex.meanArea / SQM_PER_PYEONG).toFixed(1)}평)` },
                    { label: "평당", value: `${result.complex.meanPyeongPrice.toLocaleString()}만` },
                    ...(result.complex.excludedOutliers > 0 && result.complex.rawMeanAmount !== result.complex.meanAmount
                      ? [{ label: "원본 평균(참고)", value: formatManwon(result.complex.rawMeanAmount) }]
                      : []),
                  ]}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className={`shadow-sm ${aptName || umdName ? "border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-xl">📊</span>
                  {aptName || umdName ? (
                    <>
                      <span>① 단지·평형 시세 — 매칭 0건</span>
                      <Badge variant="destructive" className="ml-auto text-xs font-normal">검색 결과 없음</Badge>
                    </>
                  ) : (
                    <>
                      <span>① 시세 — {resultMeta.regionLabel} 전체</span>
                      <Badge variant="outline" className="ml-auto text-xs font-normal">지역 평균 (단지명 미입력)</Badge>
                    </>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {aptName || umdName ? (
                    <>
                      입력하신 조건 (
                      {aptName && <code className="text-xs">단지: {aptName}</code>}
                      {aptName && umdName && " / "}
                      {umdName && <code className="text-xs">동: {umdName}</code>}
                      {(aptName || umdName) && area && " / "}
                      {area && <code className="text-xs">면적 ~{area}㎡</code>}
                      )에 맞는 거래가 0건입니다. 아래 단지명 중에서 골라 다시 조회해보세요.
                    </>
                  ) : (
                    <>단지명·법정동을 입력하지 않아 지역 전체 거래 평균이 표시됩니다.</>
                  )}
                </p>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <MainMetric value={formatManwon(result.area.meanAmount)} label={`${resultMeta.regionLabel} 지역 평균 거래가 (참고)`} muted={!!(aptName || umdName)} />
                <SecondaryRow
                  items={[
                    { label: "지역 거래", value: `${result.area.count.toLocaleString()}건` },
                    { label: "중위", value: formatManwon(result.area.medianAmount) },
                    { label: "평당", value: `${result.area.meanPyeongPrice.toLocaleString()}만` },
                  ]}
                />

                {/* 단지명 추천 — 검색 미스 시 노출 */}
                {(aptName || umdName) && result.topComplexes && result.topComplexes.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-xs font-semibold text-foreground mb-2">
                      💡 이 지역에서 거래 많은 단지 TOP {result.topComplexes.length} (클릭 시 자동 입력)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.topComplexes.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => { setAptName(c.name); setUmdName(""); }}
                          className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-primary/10 hover:border-primary/40 transition-colors text-left"
                          title={`${c.umdNm} · ${c.count}건`}
                        >
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="text-muted-foreground ml-1.5">({c.umdNm} · {c.count}건)</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      ※ 클릭 후 위쪽 [시세 조회] 버튼을 다시 눌러주세요.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 카드 ② AI 보정 시세 */}
          {(() => {
            const correction = result.complexCorrection ?? result.areaCorrection;
            const surfaceMean = result.complex?.meanAmount ?? result.area.meanAmount;
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
            const trendIcon = correction.trendDirection === "up" ? "↗" : correction.trendDirection === "down" ? "↘" : "→";
            const trendText = correction.trendDirection === "up" ? "상승" : correction.trendDirection === "down" ? "하락" : "보합";
            return (
              <Card className="shadow-sm border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3 border-b border-primary/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-xl">🤖</span>
                    <span>② AI 보정 시세</span>
                    <Badge variant="default" className="ml-auto text-xs font-normal">룰 기반 보정 적용</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">이상치·직거래 제외 + 최근 거래 가중치 적용.</p>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <MainMetric
                    value={formatManwon(correction.correctedMeanAmount)}
                    label={`보정 시세 (${diffPct >= 0 ? "+" : ""}${diffPct}% vs 표면)`}
                    accent
                  />
                  <SecondaryRow
                    items={[
                      { label: "신뢰도", value: `${"★".repeat(correction.confidenceStars)}${"☆".repeat(5 - correction.confidenceStars)}` },
                      { label: "추세", value: `${trendIcon} ${trendText} ${Math.abs(correction.trendDeltaPct)}%` },
                      { label: "사용 표본", value: `${correction.usedCount}건` },
                      ...(correction.excludedOutlier > 0 ? [{ label: "이상치 제외", value: `${correction.excludedOutlier}건` }] : []),
                      ...(correction.excludedDirectDeal > 0 ? [{ label: "직거래 제외", value: `${correction.excludedDirectDeal}건` }] : []),
                    ]}
                  />
                  <div className="pt-3 border-t border-primary/15 flex flex-wrap gap-2">
                    {!insight && !insightLoading && !insightError && (
                      <Button onClick={handleInsight} variant="outline" size="sm" className="gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        4섹션 분석 보기 (Haiku)
                      </Button>
                    )}
                    {result.complex && result.complex.count > 0 && !report && !reportLoading && !reportError && (
                      <Button onClick={handleReport} variant="default" size="sm" className="gap-1.5">
                        <FileText className="w-4 h-4" />
                        📊 단지 종합 리포트 (Sonnet)
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
                      <div className="space-y-3 w-full">
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

                  {/* 단지 종합 리포트 (Sonnet 4.6, 마크다운) */}
                  {(reportLoading || reportError || report) && (
                    <div className="pt-3 border-t border-primary/15">
                      <div className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        📊 단지 종합 리포트 (Claude Sonnet 4.6)
                      </div>
                      {reportLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sonnet 4.6 분석 중... (10~30초 소요)
                        </div>
                      )}
                      {reportError && (
                        <div className="text-sm text-destructive">
                          리포트 실패: {reportError}
                          <Button onClick={handleReport} variant="ghost" size="sm" className="ml-2 h-7">다시 시도</Button>
                        </div>
                      )}
                      {report && (
                        <div className="space-y-2">
                          <div className="rounded-md border border-primary/20 bg-background/80 p-4 prose prose-sm max-w-none dark:prose-invert prose-headings:mt-4 prose-headings:mb-2 prose-h2:text-base prose-h2:font-bold prose-h2:border-b prose-h2:pb-1 prose-table:text-xs prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:border prose-th:border prose-td:border">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {report}
                            </ReactMarkdown>
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={handleReport} variant="ghost" size="sm" className="h-7 text-xs gap-1">
                              <FileText className="w-3 h-3" />
                              리포트 다시 생성
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* 거래 리스트 */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-base">📋</span>
                <span>최근 실거래</span>
                <Badge variant="outline" className="ml-auto text-xs font-normal">
                  {result.complex ? `${result.complex.aptName} 매칭` : "지역 전체"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>단지</TableHead>
                      <TableHead>법정동</TableHead>
                      <TableHead className="text-right">전용㎡</TableHead>
                      <TableHead className="text-right">층</TableHead>
                      <TableHead className="text-right">거래액(만원)</TableHead>
                      <TableHead className="text-right">평당</TableHead>
                      <TableHead>거래일</TableHead>
                      <TableHead>구분</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(result.complex?.items ?? result.area.recent).map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{it.aptNm}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{it.umdNm}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{it.excluUseAr}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{it.floor}</TableCell>
                        <TableCell className="text-right tabular-nums">{it.dealAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {it.excluUseAr > 0
                            ? Math.round(it.dealAmount / (it.excluUseAr / SQM_PER_PYEONG)).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {it.dealYear}-{String(it.dealMonth).padStart(2, "0")}-{String(it.dealDay).padStart(2, "0")}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={it.dealingGbn === "직거래" ? "text-amber-600" : "text-muted-foreground"}>
                            {it.dealingGbn || "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
