export type OpportunitySource = "PNCP" | "COMPRASNET";

/**
 * Tema da licitação derivado por IA (Edge Function classify-opportunities).
 * O PNCP não fornece esse campo; ele é inferido a partir do objeto. Os rótulos
 * legíveis e a lista canônica ficam em lib/categories.ts.
 */
export type OpportunityCategory =
  | "tecnologia"
  | "obras"
  | "saude"
  | "alimentacao"
  | "limpeza"
  | "transporte"
  | "mobiliario"
  | "escritorio"
  | "comunicacao"
  | "educacao"
  | "servicos"
  | "outros";

/** Oportunidade de licitação normalizada (espelha public.bidding_opportunities). */
export type BiddingOpportunity = {
  external_id: string;
  source: OpportunitySource;
  title: string;
  description: string | null;
  agency: string | null;
  uasg: string | null;
  /** ISO 8601. */
  opening_date: string | null;
  /** ISO 8601. */
  proposal_deadline: string | null;
  bidding_mode: string | null;
  estimated_value: number | null;
  uf: string | null;
  source_url: string | null;
  raw_text: string | null;
  /** Tema inferido por IA; undefined = ainda não classificado. */
  category?: OpportunityCategory | null;
  /** ISO 8601 — quando o app buscou o registro. */
  fetched_at: string;
};

/** Filtros selecionáveis no FilterSheet (RF03). */
export type OpportunityFilters = {
  uf?: string;
  /** codigoModalidadeContratacao do PNCP. */
  modalidade?: number;
  /** Tema inferido por IA (refina os resultados carregados). */
  categoria?: OpportunityCategory;
  valorMin?: number;
  valorMax?: number;
  /** YYYY-MM-DD */
  dataInicio?: string;
  /** YYYY-MM-DD */
  dataFim?: string;
};

export type SearchParams = OpportunityFilters & {
  keyword?: string;
  page?: number;
  limit?: number;
};

export type SearchResult = {
  data: BiddingOpportunity[];
  total: number;
  page: number;
  hasMore: boolean;
};
