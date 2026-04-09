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
