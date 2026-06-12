import type { BiddingOpportunity } from "./opportunity";

export type ProcessStatus =
  | "SAVED"
  | "ANALYZING"
  | "DOCS_PENDING"
  | "READY_TO_BID"
  | "SUBMITTED"
  | "WON"
  | "LOST"
  | "ERROR";

export interface ChecklistItem {
  id: string;
  item: string;
  type: "Habilitacao" | "Financeiro" | "Proposta" | "Tecnico";
  done?: boolean;
}

export interface AiSummary {
  objectSimplified: string;
  importantDates: {
    proposalDelivery: string;
    auctionStart: string;
  };
  requirements: string[];
  documentsChecklist: ChecklistItem[];
}

export interface UserProcess {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: ProcessStatus;
  ai_summary: AiSummary | null;
  ai_processed_at: string | null;
  checklist_state: Record<string, boolean>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProcessWithOpportunity extends UserProcess {
  opportunity: (BiddingOpportunity & { id: string }) | null;
}
