export type DealStatus = "on_track" | "action_needed" | "blocked";

export interface Deal {
  id: string;
  title: string;
  sector: string;
  parties: string;
  status: DealStatus;
  riskLevel: string;
  confidenceScore: number;
  bottlenecks: string[];
  suggestedTasks: string[];
  lastActivity: string;
  value: string;
  progress: number;
}

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type: "email" | "chat" | "system";
  dealId: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface AnalysisResult {
  status: string;
  bottleneck: string;
  suggestedTask: string;
  suggestedDraft: string;
  riskLevel: string;
  confidenceScore: number;
  fingerprints: string[];
  requiresReview: boolean;
  threadId: string;
}
