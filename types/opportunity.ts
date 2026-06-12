export type OpportunitySource = "PNCP" | "COMPRASNET";

export interface BiddingOpportunity {
  external_id: string;
  source: OpportunitySource;
  title: string;
  description: string | null;
  agency: string | null;
  uasg: string | null;
  opening_date: string | null; // ISO 8601
  proposal_deadline: string | null; // ISO 8601
  bidding_mode: string | null;
  estimated_value: number | null;
  uf: string | null;
  source_url: string | null;
  raw_text: string | null;
}

export interface OpportunityFilters {
  keyword?: string;
  uf?: string;
  modalidade?: number;
  valorMin?: number;
  valorMax?: number;
  dataInicio?: string; // yyyy-MM-dd
  dataFim?: string; // yyyy-MM-dd
}

export interface SearchOpportunitiesParams extends OpportunityFilters {
  page?: number;
  limit?: number;
}

export interface SearchOpportunitiesResult {
  data: BiddingOpportunity[];
  total: number;
  page: number;
  hasMore: boolean;
}

export const MODALIDADES: Record<number, string> = {
  1: "Leilão Eletrônico",
  3: "Concurso",
  4: "Concorrência Eletrônica",
  5: "Concorrência Presencial",
  6: "Pregão Eletrônico",
  7: "Pregão Presencial",
  8: "Dispensa de Licitação",
  9: "Inexigibilidade",
  12: "Credenciamento",
};
