import type {
  BiddingOpportunity,
  SearchOpportunitiesParams,
  SearchOpportunitiesResult,
} from "../types/opportunity";
import { toPncpDate } from "../lib/format";
import { ApiUnavailableError, fetchJsonWithRetry } from "./http";
import { searchComprasnet } from "./comprasnet";

const BASE_URL = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao";

// A API do PNCP exige codigoModalidadeContratacao; Pregão Eletrônico é o padrão
const DEFAULT_MODALIDADE = 6;
const DEFAULT_RANGE_DAYS = 30;

interface PncpItem {
  numeroControlePNCP: string;
  anoCompra?: number | null;
  sequencialCompra?: number | null;
  objetoCompra?: string | null;
  informacaoComplementar?: string | null;
  modalidadeNome?: string | null;
  valorTotalEstimado?: number | null;
  dataAberturaProposta?: string | null;
  dataEncerramentoProposta?: string | null;
  linkSistemaOrigem?: string | null;
  orgaoEntidade?: {
    cnpj?: string | null;
    razaoSocial?: string | null;
  } | null;
  unidadeOrgao?: {
    ufSigla?: string | null;
    nomeUnidade?: string | null;
    codigoUnidade?: string | null;
  } | null;
}

interface PncpResponse {
  data: PncpItem[] | null;
  totalRegistros: number;
  numeroPagina: number;
  paginasRestantes: number;
}

// O PNCP envia datas sem timezone (ex.: "2026-05-12T08:00:00"), sempre em
// horário de Brasília — sem o offset explícito, new Date() usaria o fuso do
// dispositivo.
function toIso(date: string | null | undefined): string | null {
  if (!date) return null;
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(date);
  const parsed = new Date(hasTimezone ? date : `${date}-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildPortalUrl(item: PncpItem): string | null {
  const cnpj = item.orgaoEntidade?.cnpj;
  if (!cnpj || item.anoCompra == null || item.sequencialCompra == null) {
    return null;
  }
  return `https://pncp.gov.br/app/editais/${cnpj}/${item.anoCompra}/${item.sequencialCompra}`;
}

function mapItem(item: PncpItem): BiddingOpportunity {
  // valorTotalEstimado 0 significa "sigiloso/não informado" no PNCP
  const estimatedValue =
    item.valorTotalEstimado && item.valorTotalEstimado > 0
      ? item.valorTotalEstimado
      : null;

  return {
    external_id: item.numeroControlePNCP,
    source: "PNCP",
    title: item.objetoCompra ?? "Licitação sem objeto informado",
    description: item.informacaoComplementar ?? item.objetoCompra ?? null,
    agency:
      item.orgaoEntidade?.razaoSocial ?? item.unidadeOrgao?.nomeUnidade ?? null,
    uasg: item.unidadeOrgao?.codigoUnidade ?? null,
    opening_date: toIso(item.dataAberturaProposta),
    proposal_deadline: toIso(item.dataEncerramentoProposta),
    bidding_mode: item.modalidadeNome ?? null,
    estimated_value: estimatedValue,
    uf: item.unidadeOrgao?.ufSigla ?? null,
    source_url: item.linkSistemaOrigem ?? buildPortalUrl(item),
    raw_text: null,
  };
}

function applyClientFilters(
  data: BiddingOpportunity[],
  { keyword, valorMin, valorMax }: SearchOpportunitiesParams,
): BiddingOpportunity[] {
  let filtered = data;

  if (keyword) {
    const term = keyword.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        (item.description?.toLowerCase().includes(term) ?? false) ||
        (item.agency?.toLowerCase().includes(term) ?? false),
    );
  }

  if (valorMin != null) {
    filtered = filtered.filter(
      (item) => item.estimated_value != null && item.estimated_value >= valorMin,
    );
  }

  if (valorMax != null) {
    filtered = filtered.filter(
      (item) => item.estimated_value != null && item.estimated_value <= valorMax,
    );
  }

  return filtered;
}

async function searchPncp(
  params: SearchOpportunitiesParams,
): Promise<SearchOpportunitiesResult> {
  const { uf, modalidade, dataInicio, dataFim, page = 1 } = params;
  // O PNCP rejeita tamanhoPagina menor que 10
  const limit = Math.max(params.limit ?? 20, 10);

  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - DEFAULT_RANGE_DAYS);

  const query = new URLSearchParams({
    dataInicial: dataInicio ? toPncpDate(dataInicio) : toPncpDate(defaultStart),
    dataFinal: dataFim ? toPncpDate(dataFim) : toPncpDate(today),
    codigoModalidadeContratacao: String(modalidade ?? DEFAULT_MODALIDADE),
    pagina: String(page),
    tamanhoPagina: String(limit),
  });
  if (uf) query.set("uf", uf);

  const response = await fetchJsonWithRetry<PncpResponse>(
    `${BASE_URL}?${query.toString()}`,
  );

  const items = (response.data ?? []).map(mapItem);
  const data = applyClientFilters(items, params);

  return {
    data,
    total: response.totalRegistros ?? data.length,
    page: response.numeroPagina ?? page,
    hasMore: (response.paginasRestantes ?? 0) > 0,
  };
}

/**
 * Busca oportunidades no PNCP com fallback para o Compras.gov
 * quando o PNCP falha ou retorna 0 resultados.
 */
export async function searchOpportunities(
  params: SearchOpportunitiesParams,
): Promise<SearchOpportunitiesResult> {
  let pncpResult: SearchOpportunitiesResult | null = null;

  try {
    pncpResult = await searchPncp(params);
    if (pncpResult.data.length > 0) return pncpResult;
  } catch {
    // PNCP fora do ar — tenta o fallback abaixo
  }

  try {
    const fallback = await searchComprasnet(params);
    if (fallback.data.length > 0 || !pncpResult) return fallback;
  } catch {
    if (!pncpResult) {
      throw new ApiUnavailableError(
        "Os portais de licitações estão indisponíveis no momento. Tente novamente em alguns minutos.",
      );
    }
  }

  // PNCP respondeu (mesmo vazio) e o fallback não trouxe nada melhor
  return pncpResult;
}
