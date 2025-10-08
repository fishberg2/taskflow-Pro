export interface College {
  name: string;
  city: string;
  state: string;
  acceptanceRate: number;
  annualCost: number;
  description: string;
  reasonForFit: string;
}

export interface ComparisonCollege {
  name: string;
  pros: string[];
  cons: string[];
}

export interface ComparisonAnalysis {
  comparison: ComparisonCollege[];
  recommendation: string;
}