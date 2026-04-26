// Claude API 호출 — 보정 결과 → 자연어 인사이트 1~2문장.
// 서버 전용. 모델은 Haiku 4.5 (저렴, 짧은 인사이트엔 충분).

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

export interface ClaudeInsightInput {
  region: string;          // "서울특별시 강동구"
  period: string;          // "최근 6개월"
  surfaceMean: number;     // 만원
  correctedMean: number;   // 만원
  excludedOutlier: number;
  excludedDirectDeal: number;
  usedCount: number;
  trendDirection: "up" | "down" | "stable";
  trendDeltaPct: number;
  confidenceStars: number;
  // 단지 매칭 시 (선택)
  complexName?: string;
  complexCount?: number;
  complexMean?: number;
}

export interface ClaudeInsightOutput {
  insight: string;          // 핵심 인사이트 1-2문장
  confidenceNote: string;   // 신뢰도 코멘트
  raw: string;              // Claude 원본 응답 (디버깅용)
}

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
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const raw = json.content?.find((c) => c.type === "text")?.text ?? "";

  // JSON 추출 시도 — Claude가 코드블록으로 감쌀 수도, 그냥 raw일 수도.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { insight?: string; confidence_note?: string };
      return {
        insight: parsed.insight?.trim() ?? raw.trim(),
        confidenceNote: parsed.confidence_note?.trim() ?? "",
        raw,
      };
    } catch {
      // fallthrough
    }
  }
  return { insight: raw.trim(), confidenceNote: "", raw };
}

function buildPrompt(i: ClaudeInsightInput): string {
  const diffPct = i.surfaceMean > 0
    ? Math.round(((i.correctedMean - i.surfaceMean) / i.surfaceMean) * 1000) / 10
    : 0;

  const lines = [
    "당신은 한국 부동산 NPL(부실채권) 시세 분석 전문가입니다.",
    "아래 데이터를 보고 NPL 채권 매입 의사결정에 도움이 되는 핵심 인사이트를 한국어로 제시하세요.",
    "",
    `[지역] ${i.region}`,
    `[조회 기간] ${i.period}`,
    `[표면 평균 시세] ${formatManwon(i.surfaceMean)}`,
    `[보정 평균 시세] ${formatManwon(i.correctedMean)} (${diffPct >= 0 ? "+" : ""}${diffPct}%)`,
    `[보정 처리] 이상치 제외 ${i.excludedOutlier}건, 직거래 제외 ${i.excludedDirectDeal}건, 사용 표본 ${i.usedCount}건`,
    `[추세] ${i.trendDirection === "up" ? "상승" : i.trendDirection === "down" ? "하락" : "보합"} ${Math.abs(i.trendDeltaPct)}% (최근 절반 vs 이전 절반)`,
    `[신뢰도] ${"★".repeat(i.confidenceStars)}${"☆".repeat(5 - i.confidenceStars)} (${i.confidenceStars}/5)`,
  ];
  if (i.complexName && i.complexCount && i.complexMean) {
    lines.push("", `[단지 매칭] ${i.complexName} ${i.complexCount}건, 평균 ${formatManwon(i.complexMean)}`);
  }
  lines.push(
    "",
    "다음 JSON 형식으로만 응답하세요. 다른 설명 금지:",
    `{"insight": "핵심 인사이트 1~2문장 (100자 이내)", "confidence_note": "신뢰도 한 줄 (50자 이내)"}`,
    "",
    "주의:",
    "- 실시간 호재/개발 정보는 모르므로 추측하지 말 것",
    "- 데이터에 근거한 객관적 해석만",
    "- 한국 부동산·NPL 업계 용어 자연스럽게",
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
