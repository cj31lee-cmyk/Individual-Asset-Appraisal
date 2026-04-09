export interface CaseInfo {
  caseNumber: string;
  address: string;
  complex: string;
  appraisalPrice: number;
  round: number;
  saleDate: string;
}

export interface RightsItem {
  name: string;
  amount: number;
}

export interface ComparableCase {
  id: string;
  complex: string;
  winningBid: number;
  bidRate: number;
  saleDate: string;
}

export interface AnalysisParams {
  marketPrice: number;
  targetReturnRate: number;
  auctionCost: number;
  evictionCost: number;
}

export interface CalculationResult {
  medianBidRate: number;
  adjustedBidRate: number;
  rightsDiscount: number;
  expectedWinningBid: number;
  totalAssumption: number;
  recoveryPrice: number;
  fairPurchasePrice: number;
}

// 섹터 1: 매입 정보
export interface PurchaseInfo {
  seller: string;           // 매각사
  productNumber: string;    // 상품번호
  name: string;             // 이름
  address: string;          // 주소
  loanBalance: number;      // 대출잔액
  interest: number;         // 이자
  principalInterest: number;// 원리금
  legalCost: number;        // 법비용
  seniorMaxAmount: number;  // 선순위최고액
  senior110: number;        // 선순위 110%
  seniorPrincipal: number;  // 선순위 원금
  interestRate: number;     // 이율
  overdueRate: number;      // 연체이율
  overdueDays: number;      // 연체일수
  remarks: string;          // 비고
}

// 섹터 2: 매입가격 분석 정보
export interface PriceAnalysisInfo {
  interestUntilDividend: number;  // 배당기일까지 이자
  actualTransPrice: number;       // 실거래가격
  kbPrice: number;                // KB시세
  bidRate: number;                // 낙찰가율
  estimatedPurchase: number;      // 매입 예상가
  mortgageSetupCost: number;      // 근저당설정비용
  appraisalCost: number;          // 감평비용
  auctionCost: number;            // 경매비용
  totalCost: number;              // 비용합계
  purchaseMinusSenior: number;    // 매입예상가-선순위110%
  finalPurchasePrice: number;     // 최종매입가
}
