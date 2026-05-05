// Claude API 호출 — 보정 결과 → 4섹션 구조화 분석.
// 서버 전용. 모델은 Haiku 4.5.

export const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";              // 4섹션 인사이트용 (저렴)
export const REPORT_MODEL = "claude-sonnet-4-6";        // 단지 종합 리포트용 (풍부한 분석)

export interface ClaudeInsightInput {
  region: string;
  period: string;
  surfaceMean: number;
  correctedMean: number;
  excludedOutlier: number;
  excludedDirectDeal: number;
  usedCount: number;
  trendDirection: "up" | "down" | "stable";
  trendDeltaPct: number;
  confidenceStars: number;
  complexName?: string;
  complexCount?: number;
  complexMean?: number;
  // raw 거래 — Claude가 직접 분석하여 보정값 산출
  recentItems?: {
    aptNm: string;
    umdNm: string;
    excluUseAr: number;
    floor: number;
    dealAmount: number;
    dealYear: number;
    dealMonth: number;
    dealDay: number;
    dealingGbn: string;
  }[];
}

export interface ClaudeCorrection {
  estimatedPrice: number;       // Claude가 판단한 보정 시세 (만원)
  excludedIndices: number[];    // 이상치로 분류한 거래 (recentItems의 인덱스)
  excludeReasons: string[];     // 각 제외 이유 (excludedIndices와 같은 길이)
  rationale: string;            // 종합 근거 (한 줄)
}

export interface InsightItem {
  label: string;   // 짧은 항목명 (2~6자, 예: "추세")
  value: string;   // 짧은 값/판단 (15자 이내, 예: "상승 +1.8%")
}

export interface ClaudeInsightOutput {
  claudeCorrection: ClaudeCorrection | null;  // raw items 있을 때만 산출
  marketDiagnosis: InsightItem[];   // 📊 시장 진단
  priceEvaluation: InsightItem[];   // 💰 가격 평가
  nplPerspective: InsightItem[];    // 🎯 NPL 매입 관점
  confidence: InsightItem[];        // ⭐ 신뢰도 평가
  summary: string;                  // 한 줄 종합 의견 (60자 이내)
  raw: string;                      // 원본 응답 (디버깅용)
}

const FALLBACK: Omit<ClaudeInsightOutput, "raw"> = {
  claudeCorrection: null,
  marketDiagnosis: [{ label: "분석", value: "AI 응답 파싱 실패" }],
  priceEvaluation: [],
  nplPerspective: [],
  confidence: [],
  summary: "AI 응답을 구조화된 형식으로 파싱하지 못했습니다.",
};

export async function generateInsight(
  input: ClaudeInsightInput,
  apiKey: string,
): Promise<ClaudeInsightOutput> {
  const prompt = buildPrompt(input);

  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const raw = json.content?.find((c) => c.type === "text")?.text ?? "";

  // JSON 추출 (```json ... ``` 코드블록 또는 raw)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<ClaudeInsightOutput>;
      const cc = sanitizeCorrection(parsed.claudeCorrection);
      // ★ Claude의 estimatedPrice는 LLM 산술 오류 가능 → excludedIndices만 사용하고
      //    평균은 백엔드에서 정확히 재계산.
      const finalCC = cc && input.recentItems
        ? {
            ...cc,
            estimatedPrice: recalcEstimatedPrice(input.recentItems, cc.excludedIndices),
          }
        : cc;
      return {
        claudeCorrection: finalCC,
        marketDiagnosis: sanitizeItems(parsed.marketDiagnosis),
        priceEvaluation: sanitizeItems(parsed.priceEvaluation),
        nplPerspective: sanitizeItems(parsed.nplPerspective),
        confidence: sanitizeItems(parsed.confidence),
        summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
        raw,
      };
    } catch {
      // fallthrough
    }
  }
  return { ...FALLBACK, raw };
}

function sanitizeItems(arr: unknown): InsightItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x): x is InsightItem =>
      typeof x === "object" && x !== null && typeof (x as InsightItem).label === "string" && typeof (x as InsightItem).value === "string",
    )
    .map((x) => ({ label: x.label.trim(), value: x.value.trim() }))
    .slice(0, 6);
}

function sanitizeCorrection(c: unknown): ClaudeCorrection | null {
  if (!c || typeof c !== "object") return null;
  const o = c as Partial<ClaudeCorrection>;
  // estimatedPrice는 백엔드에서 재계산되므로 여기선 placeholder만.
  return {
    estimatedPrice: typeof o.estimatedPrice === "number" && o.estimatedPrice > 0 ? Math.round(o.estimatedPrice) : 0,
    excludedIndices: Array.isArray(o.excludedIndices)
      ? o.excludedIndices.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0)
      : [],
    excludeReasons: Array.isArray(o.excludeReasons)
      ? o.excludeReasons.filter((x): x is string => typeof x === "string").map((x) => x.trim())
      : [],
    rationale: typeof o.rationale === "string" ? o.rationale.trim() : "",
  };
}

// Claude가 결정한 excludedIndices를 적용해서 시간 가중 평균을 백엔드에서 정확히 재계산.
// LLM은 큰 수 산술에서 실수 가능 → 판단(이상치 식별)은 Claude, 계산은 코드로 분리.
function recalcEstimatedPrice(
  items: NonNullable<ClaudeInsightInput["recentItems"]>,
  excludedIndices: number[],
): number {
  const HALF_LIFE_MONTHS = 6;
  const now = new Date();
  const excluded = new Set(excludedIndices);
  const valid = items.filter((it, i) => !excluded.has(i) && it.dealAmount > 0);
  if (valid.length === 0) return 0;
  let weightedSum = 0;
  let weightTotal = 0;
  for (const it of valid) {
    const date = new Date(it.dealYear, it.dealMonth - 1, it.dealDay || 15);
    const monthsAgo =
      (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    const w = Math.pow(0.5, monthsAgo / HALF_LIFE_MONTHS);
    weightedSum += it.dealAmount * w;
    weightTotal += w;
  }
  return weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0;
}

function buildPrompt(i: ClaudeInsightInput): string {
  const diffPct = i.surfaceMean > 0
    ? Math.round(((i.correctedMean - i.surfaceMean) / i.surfaceMean) * 1000) / 10
    : 0;

  const lines = [
    "당신은 한국 부동산 NPL(부실채권) 시세·낙찰가율 분석 전문가입니다.",
    "아래 실거래 데이터를 보고 4개 섹션으로 구조화된 전문가 분석을 제시하세요.",
    "",
    "[입력 데이터]",
    `- 지역: ${i.region}`,
    `- 조회 기간: ${i.period}`,
    `- 표면 평균 시세: ${formatManwon(i.surfaceMean)} (이상치 포함 단순 평균)`,
    `- 보정 평균 시세: ${formatManwon(i.correctedMean)} (${diffPct >= 0 ? "+" : ""}${diffPct}% vs 표면)`,
    `- 보정 처리: 이상치 ${i.excludedOutlier}건 + 직거래 ${i.excludedDirectDeal}건 제외, 사용 표본 ${i.usedCount}건`,
    `- 거래 추세: ${i.trendDirection === "up" ? "상승" : i.trendDirection === "down" ? "하락" : "보합"} ${Math.abs(i.trendDeltaPct)}% (최근 절반 vs 이전 절반)`,
    `- 통계 신뢰도: ${"★".repeat(i.confidenceStars)}${"☆".repeat(5 - i.confidenceStars)} (${i.confidenceStars}/5)`,
  ];
  if (i.complexName && i.complexCount && i.complexMean) {
    lines.push(`- 단지·평형 매칭: ${i.complexName} ${i.complexCount}건, 평균 ${formatManwon(i.complexMean)}`);
  }

  // raw 거래 데이터를 표로 — Claude가 이상치 직접 판단
  const hasRawItems = i.recentItems && i.recentItems.length > 0;
  if (hasRawItems) {
    lines.push("", "[원본 거래 내역 — 이걸 직접 분석해서 이상치를 판단하고 보정 시세 산출]");
    lines.push("idx | 단지명 | 동 | 면적㎡ | 층 | 거래액(만원) | 평당가(만원) | 거래일 | 구분");
    i.recentItems!.forEach((it, idx) => {
      const pp = it.excluUseAr > 0 ? Math.round(it.dealAmount / (it.excluUseAr / 3.305785)) : 0;
      const date = `${it.dealYear}-${String(it.dealMonth).padStart(2, "0")}-${String(it.dealDay).padStart(2, "0")}`;
      lines.push(`${idx} | ${it.aptNm} | ${it.umdNm} | ${it.excluUseAr} | ${it.floor} | ${it.dealAmount.toLocaleString()} | ${pp.toLocaleString()} | ${date} | ${it.dealingGbn || "-"}`);
    });
  }

  lines.push(
    "",
    "[응답 형식 — JSON만, 다른 설명 금지]",
    "{",
    ...(hasRawItems
      ? [
          `  "claudeCorrection": {                     // 🤖 Claude 이상치 판단 (raw 데이터 기반)`,
          `    "estimatedPrice": 0,                    // ⚠️ 0 또는 null로 두세요. 시스템이 정확히 재계산합니다.`,
          `    "excludedIndices": [1, 5],              // 이상치로 분류한 거래의 idx (배열)`,
          `    "excludeReasons": [                     // 각 제외 이유 (excludedIndices와 같은 길이, 30자 이내)`,
          `      "단지 다른 거래 대비 25% 낮음 — 증여 가능성",`,
          `      "구축 저층 급매 — 정상가와 괴리"`,
          `    ],`,
          `    "rationale": "극단값 1건 제외 후 정상 거래 기반"  // 종합 근거 (50자 이내)`,
          `  },`,
        ]
      : []),
    `  "marketDiagnosis": [   // 📊 시장 진단 — 추세/거래량/패턴 등 3~5개`,
    `    {"label": "추세", "value": "상승 +1.8%"},`,
    `    {"label": "거래량", "value": "정상"},`,
    `    {"label": "패턴", "value": "안정적 상승"}`,
    `  ],`,
    `  "priceEvaluation": [   // 💰 가격 평가 — 보정 의미/이상치 영향 등 3~5개`,
    `    {"label": "보정 효과", "value": "+1.8%"},`,
    `    {"label": "이상치 영향", "value": "낮음"},`,
    `    {"label": "단지 편향", "value": "없음"}`,
    `  ],`,
    `  "nplPerspective": [    // 🎯 NPL 매입 관점 — 진입가/리스크/기회 3~5개`,
    `    {"label": "진입 적정성", "value": "양호"},`,
    `    {"label": "리스크", "value": "추세 둔화 주의"},`,
    `    {"label": "기회", "value": "보정가 활용"}`,
    `  ],`,
    `  "confidence": [        // ⭐ 신뢰도 평가 — 표본/안정성/시점 3~5개`,
    `    {"label": "표본 크기", "value": "충분"},`,
    `    {"label": "변동성", "value": "낮음"},`,
    `    {"label": "최신성", "value": "높음"}`,
    `  ],`,
    `  "summary": "한 줄 종합 의견 (60자 이내)"`,
    "}",
    "",
    "[규칙]",
    "- label: 2~6자 짧게. value: 15자 이내 짧게 (긴 문장 금지)",
    "- value는 진단/판단/숫자 위주 (서술 금지)",
    "- 각 섹션 항목 3~5개",
    "- 한국 부동산·NPL 업계 용어 자연스럽게",
    "- 데이터에 근거한 객관적 해석만 — 실시간 호재/개발 정보는 추측 금지",
    "- 신뢰도가 낮으면(★★ 이하) 그 점을 명시할 것",
    ...(hasRawItems
      ? [
          "",
          "[claudeCorrection 산출 가이드]",
          "★ estimatedPrice는 신경쓰지 마세요 — 0으로 두세요. 시스템이 시간가중평균을 정확히 계산합니다.",
          "★ 당신의 역할은 '어느 거래가 이상치인지' 판단 + 그 이유 설명만.",
          "- 평당가 기준으로 다른 거래들과 명확히 동떨어진 것을 이상치로 분류 (예: 다른 거래 대비 ±20% 이상 차이)",
          "- 같은 단지가 아닌 거래(검색 키워드와 다른 단지명)는 보통 이상치",
          "- 직거래(dealingGbn=직거래)는 시세 왜곡 가능성 → 이상치 후보",
          "- 매우 낮은 가격이면 증여·특수관계자 거래 가능성 명시",
          "- 매우 높은 가격이면 신축·로얄층·확장된 평수 가능성 명시",
          "- excludedIndices와 excludeReasons 배열은 같은 길이여야 함",
          "- 표본이 4건 미만이면 excludedIndices = [] (트림 안 함)",
        ]
      : []),
  );
  return lines.join("\n");
}

function formatManwon(m: number): string {
  if (m <= 0) return "—";
  const eok = Math.floor(m / 10000);
  const rest = m % 10000;
  if (eok === 0) return `${m.toLocaleString()}만원`;
  if (rest === 0) return `${eok}억원`;
  return `${eok}억 ${rest.toLocaleString()}만원`;
}

// ─────────────────────────────────────────────────────────
// 단지 종합 리포트 (Sonnet 4.6, 자유 마크다운)
// ─────────────────────────────────────────────────────────

export interface ComplexReportInput {
  region: string;            // "서울특별시 강동구"
  complexName: string;       // "선사현대"
  // 단지 매칭 통계
  count: number;             // 매칭 거래 수
  surfaceMean: number;       // 단순 평균 (만원)
  correctedMean: number;     // 정제 평균 (만원, IQR 트림)
  meanArea: number;          // 평균 전용면적 (㎡)
  meanPyeongPrice: number;   // 평당가 (만원)
  // 추세
  trendDirection: "up" | "down" | "stable";
  trendDeltaPct: number;
  // 비교 (선택)
  areaPyeongPrice?: number;  // 시군구 평균 평당가 (비교용)
  // raw items (최대 30건)
  recentItems: NonNullable<ClaudeInsightInput["recentItems"]>;
}

export interface ComplexReportOutput {
  markdown: string;
  raw: string;
  modelUsed: string;
}

export async function generateComplexReport(
  input: ComplexReportInput,
  apiKey: string,
): Promise<ComplexReportOutput> {
  const prompt = buildReportPrompt(input);

  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: REPORT_MODEL,
      max_tokens: 3500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const raw = json.content?.find((c) => c.type === "text")?.text ?? "";
  return { markdown: raw.trim(), raw, modelUsed: REPORT_MODEL };
}

export function buildReportPrompt(i: ComplexReportInput): string {
  const lines: string[] = [];
  lines.push(
    "당신은 한국 부동산 NPL(부실채권) 전문 애널리스트입니다.",
    "아래 데이터와 당신의 사전 지식을 종합해 NPL 매입 의사결정용 단지 종합 리포트를 작성하세요.",
    "",
    "[기본 정보]",
    `- 지역: ${i.region}`,
    `- 단지명: ${i.complexName}`,
    `- 매칭 거래: ${i.count}건`,
    `- 표면 평균: ${formatManwon(i.surfaceMean)} (이상치 포함 단순 평균)`,
    `- 정제 평균: ${formatManwon(i.correctedMean)} (IQR 트림)`,
    `- 평균 면적: ${i.meanArea}㎡ (≈${(i.meanArea / 3.305785).toFixed(1)}평)`,
    `- 평균 평당가: ${i.meanPyeongPrice.toLocaleString()}만원`,
    `- 거래 추세: ${i.trendDirection === "up" ? "상승" : i.trendDirection === "down" ? "하락" : "보합"} ${Math.abs(i.trendDeltaPct)}%`,
  );
  if (i.areaPyeongPrice) {
    const diff = Math.round(((i.meanPyeongPrice - i.areaPyeongPrice) / i.areaPyeongPrice) * 1000) / 10;
    lines.push(`- 시군구 평균 평당가: ${i.areaPyeongPrice.toLocaleString()}만원 (단지 ${diff >= 0 ? "+" : ""}${diff}%)`);
  }

  // raw 거래 표
  lines.push("", "[원본 거래 내역]");
  lines.push("idx | 단지명 | 동 | 면적㎡(평) | 층 | 거래액 | 평당가 | 거래일 | 구분");
  i.recentItems.forEach((it, idx) => {
    const pyeong = (it.excluUseAr / 3.305785).toFixed(1);
    const pp = it.excluUseAr > 0 ? Math.round(it.dealAmount / (it.excluUseAr / 3.305785)) : 0;
    const date = `${it.dealYear}-${String(it.dealMonth).padStart(2, "0")}-${String(it.dealDay).padStart(2, "0")}`;
    lines.push(
      `${idx} | ${it.aptNm} | ${it.umdNm} | ${it.excluUseAr}(${pyeong}평) | ${it.floor}층 | ${formatManwon(it.dealAmount)} | ${pp.toLocaleString()}만 | ${date} | ${it.dealingGbn || "-"}`,
    );
  });

  lines.push(
    "",
    "[리포트 형식 — 마크다운으로 작성]",
    "다음 6개 섹션을 모두 포함하세요. 표/리스트/굵은 글씨 활용:",
    "",
    "## 🏢 단지 기본 정보",
    "- 위치(상세 지번까지 알면), 세대수, 동수, 최고층, 준공연도(연차), 시공사, 교통(지하철역·도보분), 학군 등",
    "- ⚠️ 사전 지식이 확실치 않은 항목은 '확인 필요'로 표기하고 추측 금지",
    "",
    "## 💰 평형별 시세 (실거래 기반)",
    "- 위 거래 데이터를 평형별로 그룹핑하여 표 (전용㎡ / 평형 / 거래수 / 평균가 / 평당가)",
    "- 정확한 숫자만 — 추정·환각 금지",
    "",
    "## 📈 시세 흐름·평당가 비교",
    "- 추세 (상승/하락/보합 + %)",
    "- 시군구 평균 대비 위치",
    "- 최근 특이 거래 (가장 높은/낮은 거래 1~2건)",
    "",
    "## 🔨 호재·악재",
    "- 재건축/리모델링 진행 단계 (사전 지식 기반, 학습 시점 명시)",
    "- 교통 호재 (신규 노선·환승)",
    "- 학군·상권 변화",
    "- ⚠️ 모르거나 학습 시점 이후 정보면 '학습 시점(2026.01) 이후 정보 부재' 명시",
    "",
    "## 🎯 NPL 관점 분석",
    "- 감정가 추정 (시세 대비 80~85% 가정)",
    "- 전세가율 추정 (사전 지식)",
    "- 낙찰가율 예상 (지역·단지 특성 고려)",
    "- 핵심 리스크 (재건축 채권, 권리관계 복잡성, 임차인 등)",
    "- 매입 적합도 (★★★★★ 5단계)",
    "",
    "## 💡 종합 의견",
    "2~3문장 요약. 매입 권장/보류/회피 + 핵심 근거.",
    "",
    "[규칙]",
    "- 마크다운 표는 GFM 문법 사용 (`| col |` 형식)",
    "- 한국 부동산·NPL 업계 용어 자연스럽게",
    "- 거래 데이터에 없는 숫자는 '데이터 부족' 명시",
    "- Claude 학습 시점(2026.01) 이후 뉴스(정기총회 결과, 최근 분양가 등)는 모른다고 솔직히 표기",
    "- 환각 금지: 확실하지 않은 정보(시공사, 세대수 같은 것)는 '확인 필요' 표시",
  );
  return lines.join("\n");
}
