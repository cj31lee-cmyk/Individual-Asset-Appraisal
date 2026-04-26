// 두 섹션을 위·아래로 묶는 wrapper.
// 위: 주소·단지 시세 / 아래: 지역 낙찰가율

import { PriceLookupSection } from "./PriceLookupSection";
import { RegionBidRateSection } from "./RegionBidRateSection";

export function MarketAnalysisSection() {
  return (
    <div className="space-y-10">
      <PriceLookupSection />

      {/* 섹션 구분선 */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-dashed border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-xs font-medium text-muted-foreground">
            ▼ 위는 매물 시세 / 아래는 지역 낙찰가율 ▼
          </span>
        </div>
      </div>

      <RegionBidRateSection />
    </div>
  );
}
