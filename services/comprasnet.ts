import type {
  BiddingOpportunity,
  SearchOpportunitiesParams,
  SearchOpportunitiesResult,
} from "../types/opportunity";
import { fetchJsonWithRetry } from "./http";

const BASE_URL = "https://compras.dados.gov.br/licitacoes/v1/licitacoes.json";

interface ComprasnetLicitacao {
  identificador: string;
  objeto: string | null;
  numero_aviso: number | null;
  uasg: number | null;
  modalidade: number | null;
  situacao_aviso: string | null;
  data_publicacao: string | null;
  data_abertura_proposta: string | null;
  data_entrega_edital: string | null;
  endereco_entrega_edital: string | null;
  uf: string | null;
  _links?: { self?: { href?: string } };
}

interface ComprasnetResponse {
  count: number;
  _embedded?: { licitacoes?: ComprasnetLicitacao[] };
}

const MODALIDADE_NOMES: Record<number, string> = {
  1: "Convite",
  2: "Tomada de Preços",
  3: "Concorrência",
  5: "Pregão",
  6: "Dispensa de Licitação",
  7: "Inexigibilidade",
  20: "Concurso",
};

function toIso(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapItem(item: ComprasnetLicitacao): BiddingOpportunity {
  return {
    external_id: item.identificador,
    source: "COMPRASNET",
    title: item.objeto ?? "Licitação sem objeto informado",
    description: item.objeto,
    agency: null,
    uasg: item.uasg != null ? String(item.uasg) : null,
    opening_date: toIso(item.data_abertura_proposta),
    proposal_deadline: null,
    bidding_mode:
      item.modalidade != null
        ? (MODALIDADE_NOMES[item.modalidade] ?? `Modalidade ${item.modalidade}`)
        : null,
    estimated_value: null,
    uf: item.uf,
    source_url: item._links?.self?.href
      ? `https://compras.dados.gov.br${item._links.self.href}.html`
      : null,
    raw_text: null,
  };
}

export async function searchComprasnet(
  params: SearchOpportunitiesParams,
): Promise<SearchOpportunitiesResult> {
  const { keyword, uf, page = 1, limit = 20 } = params;

  const query = new URLSearchParams();
  query.set("offset", String((page - 1) * limit));
  if (keyword) query.set("objeto", keyword);
  if (uf) query.set("uf", uf);

  const response = await fetchJsonWithRetry<ComprasnetResponse>(
    `${BASE_URL}?${query.toString()}`,
  );

  const items = response._embedded?.licitacoes ?? [];
  const data = items.map(mapItem);
  const total = response.count ?? data.length;

  return {
    data,
    total,
    page,
    hasMore: page * limit < total,
  };
}
