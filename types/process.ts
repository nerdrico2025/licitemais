import type { Tables } from "./database";
import type { BiddingOpportunity } from "./opportunity";

/** Estados possíveis de um processo (espelha o CHECK de user_processes.status). */
export type ProcessStatus =
  | "SAVED"
  | "ANALYZING"
  | "DOCS_PENDING"
  | "READY_TO_BID"
  | "SUBMITTED"
  | "WON"
  | "LOST"
  | "ERROR";

export type ChecklistDocumentType =
  | "Habilitacao"
  | "Financeiro"
  | "Proposta"
  | "Tecnico";

/** Resumo gerado pela Edge Function analyze-edital (jsonb em ai_summary). */
export type AiSummary = {
  objectSimplified: string;
  importantDates: {
    /** ISO 8601. */
    proposalDelivery: string;
    /** ISO 8601. */
    auctionStart: string;
  };
  requirements: string[];
  documentsChecklist: {
    id: string;
    item: string;
    type: ChecklistDocumentType;
  }[];
};

/** Estado do checklist do usuário: id do documento -> marcado/concluído. */
export type ChecklistState = Record<string, boolean>;

/** Oportunidade como volta no join (inclui o id da tabela). */
export type ProcessOpportunity = BiddingOpportunity & { id: string };

/**
 * Linha de user_processes com a bidding_opportunity relacionada (join).
 * Deriva do schema gerado (types/database.ts), tipando as colunas jsonb
 * (status/ai_summary/checklist_state) de forma rica e adicionando o join.
 */
export type UserProcess = Omit<
  Tables<"user_processes">,
  "status" | "ai_summary" | "checklist_state"
> & {
  status: ProcessStatus;
  ai_summary: AiSummary | null;
  checklist_state: ChecklistState;
  bidding_opportunities: ProcessOpportunity | null;
};

/** Colunas editáveis pela mutation useUpdateProcess. */
export type UpdateProcessInput = {
  id: string;
  status?: ProcessStatus;
  checklist_state?: ChecklistState;
  notes?: string | null;
};
