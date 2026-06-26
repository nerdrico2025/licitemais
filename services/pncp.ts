import type {
  BiddingOpportunity,
  SearchParams,
  SearchResult,
} from "../types/opportunity";
import { searchComprasnet } from "./comprasnet";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";
// Busca textual: o endpoint /consulta NÃO aceita palavra-chave (ver spec
// OpenAPI). O texto livre é atendido pela API de busca usada pelo próprio
// site do PNCP, cujo parâmetro de termo é `q`.
const PNCP_SEARCH = "https://pncp.gov.br/api/search";
const PNCP_ORIGIN = "https://pncp.gov.br";
const DEFAULT_MODALIDADE = 6; // Pregão - Eletrônico
const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 10; // mínimo aceito pela API
const TIMEOUT_MS = 10_000;
const RETRIES = 2;
const WINDOW_DAYS = 30;

// Marcas diacríticas combinantes (para busca sem acento). RegExp por string
// ASCII para manter o código-fonte sem caracteres especiais.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

const API_OFFLINE_MESSAGE =
  "Não foi possível consultar as licitações agora. O serviço do governo (PNCP) pode estar fora do ar. Tente novamente em instantes.";

// --- Helpers ---------------------------------------------------------------

/** Date | "YYYY-MM-DD" -> "AAAAMMDD" exigido pela API. */
function toYyyyMmDd(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10).replace(/-/g, "");
  }
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** PNCP devolve datas sem timezone (horário de Brasília). Normaliza p/ ISO 8601. */
function toISO(value: string | null | undefined): string | null {
  if (!value) return null;
  const hasTz = /[zZ]$|[+-]\d{2}:\d{2}$/.test(value);
  const date = new Date(hasTz ? value : `${value}-03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveWindow(inicio?: string, fim?: string) {
  const now = new Date();
  const start = inicio ?? new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const end = fim ?? now;
  return { dataInicial: toYyyyMmDd(start), dataFinal: toYyyyMmDd(end) };
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}

async function fetchJson(url: string, timeoutMs = TIMEOUT_MS): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    // PNCP responde 204 quando não há registros na janela.
    if (res.status === 204) {
      return { data: [], totalRegistros: 0, paginasRestantes: 0, numeroPagina: 1 };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Tenta a chamada até `retries` vezes adicionais (retry simples). */
async function withRetry<T>(fn: () => Promise<T>, retries = RETRIES): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// Nomes de campo confirmados contra a resposta REAL do endpoint
// /v1/contratacoes/publicacao (RJ, modalidades 6 e 8). Notas de campo:
// - dataAberturaProposta/dataEncerramentoProposta: null em ~30% das dispensas.
// - linkSistemaOrigem: preenchido em ~15% das dispensas; linkProcessoEletronico
//   cobre boa parte do restante -> encadeamos os dois (ambos campos reais).
// - informacaoComplementar: null em ~60% das dispensas; nomeUnidade/processo
//   vêm 100% preenchidos e servem de contexto para o raw_text.
function mapPncpItem(raw: any): BiddingOpportunity {
  const objeto: string = (raw?.objetoCompra ?? "").trim();
  const complemento: string = (raw?.informacaoComplementar ?? "").trim();
  const unidade: string = (raw?.unidadeOrgao?.nomeUnidade ?? "").trim();
  const processo: string = (raw?.processo ?? "").trim();
  const valor = raw?.valorTotalEstimado;
  return {
    external_id: String(raw?.numeroControlePNCP ?? ""),
    source: "PNCP",
    title: objeto || (raw?.modalidadeNome ?? "Contratação"),
    description: objeto || null,
    agency: (raw?.orgaoEntidade?.razaoSocial ?? unidade) || null,
    uasg: raw?.unidadeOrgao?.codigoUnidade ?? null,
    opening_date: toISO(raw?.dataAberturaProposta),
    proposal_deadline: toISO(raw?.dataEncerramentoProposta),
    bidding_mode: raw?.modalidadeNome ?? null,
    estimated_value: Number.isFinite(valor) ? valor : null,
    uf: raw?.unidadeOrgao?.ufSigla ?? null,
    source_url: raw?.linkSistemaOrigem ?? raw?.linkProcessoEletronico ?? null,
    raw_text:
      [objeto, complemento, processo && `Processo: ${processo}`, unidade]
        .filter(Boolean)
        .join("\n") || null,
    fetched_at: new Date().toISOString(),
  };
}

// Mapeia um item da API de busca (/api/search) -> BiddingOpportunity.
// Campos confirmados contra a resposta real (q=tecnologia/limpeza):
// - description carrega o objeto da contratação (usado como título);
// - valor_global vem null com frequência; item_url é relativo.
function mapSearchItem(raw: any): BiddingOpportunity {
  const objeto: string = (raw?.description ?? "").trim();
  const orgao: string = (raw?.orgao_nome ?? "").trim();
  const unidade: string = (raw?.unidade_nome ?? "").trim();
  const valor = raw?.valor_global;
  const itemUrl: string | null = raw?.item_url ?? null;
  return {
    external_id: String(raw?.numero_controle_pncp ?? raw?.id ?? ""),
    source: "PNCP",
    title: objeto || (raw?.title ?? "Contratação"),
    description: objeto || null,
    agency: orgao || unidade || null,
    uasg: raw?.unidade_codigo ?? null,
    opening_date: toISO(raw?.data_inicio_vigencia ?? raw?.data_publicacao_pncp),
    proposal_deadline: toISO(raw?.data_fim_vigencia),
    bidding_mode: raw?.modalidade_licitacao_nome ?? null,
    estimated_value: Number.isFinite(valor) ? valor : null,
    uf: raw?.uf ?? null,
    source_url: itemUrl ? `${PNCP_ORIGIN}${itemUrl}` : null,
    raw_text:
      [objeto, orgao, unidade].filter(Boolean).join("\n") || null,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Busca textual real via /api/search (o `q` é o parâmetro de termo). O
 * endpoint /consulta não suporta palavra-chave, por isso a busca por termo é
 * roteada para cá. Filtros de valor são best-effort sobre a página.
 */
async function searchByKeyword(
  keyword: string,
  params: SearchParams,
): Promise<SearchResult> {
  const page = params.page ?? 1;
  const limit = Math.max(params.limit ?? DEFAULT_LIMIT, MIN_LIMIT);

  const query = new URLSearchParams({
    q: keyword,
    tipos_documento: "edital",
    ordenacao: "-data",
    pagina: String(page),
    tam_pagina: String(limit),
  });
  if (params.uf) query.set("ufs", params.uf);

  const url = `${PNCP_SEARCH}/?${query.toString()}`;
  const json = await withRetry(() => fetchJson(url), RETRIES);
  const items: BiddingOpportunity[] = Array.isArray(json?.items)
    ? json.items.map(mapSearchItem)
    : [];
  const total = typeof json?.total === "number" ? json.total : items.length;

  // O termo já foi aplicado no servidor; reaplicar keyword aqui poderia
  // descartar acertos cujo match veio de campos não exibidos. Só refinamos
  // por faixa de valor (best-effort).
  const data = applyClientFilters(items, { ...params, keyword: undefined });

  return { data, total, page, hasMore: page * limit < total };
}

/**
 * A API por publicação não filtra por palavra-chave nem faixa de valor, então
 * aplicamos esses filtros sobre a página retornada (best-effort).
 */
function applyClientFilters(
  items: BiddingOpportunity[],
  params: SearchParams,
): BiddingOpportunity[] {
  let result = items;

  if (params.keyword?.trim()) {
    const needle = normalize(params.keyword.trim());
    result = result.filter((item) =>
      normalize(`${item.title} ${item.agency ?? ""}`).includes(needle),
    );
  }
  if (typeof params.valorMin === "number") {
    const min = params.valorMin;
    result = result.filter(
      (i) => i.estimated_value != null && i.estimated_value >= min,
    );
  }
  if (typeof params.valorMax === "number") {
    const max = params.valorMax;
    result = result.filter(
      (i) => i.estimated_value != null && i.estimated_value <= max,
    );
  }
  return result;
}

// --- API pública -----------------------------------------------------------

export async function searchOpportunities(
  params: SearchParams = {},
): Promise<SearchResult> {
  // Busca por termo usa a API de texto livre do PNCP (/api/search), pois o
  // endpoint /consulta não aceita palavra-chave.
  if (params.keyword?.trim()) {
    try {
      const byKeyword = await searchByKeyword(params.keyword.trim(), params);
      if (byKeyword.data.length > 0 || byKeyword.total > 0) return byKeyword;
    } catch {
      // cai para o fluxo padrão (publicacao + fallback) abaixo.
    }
  }

  const page = params.page ?? 1;
  const limit = Math.max(params.limit ?? DEFAULT_LIMIT, MIN_LIMIT);
  const modalidade = params.modalidade ?? DEFAULT_MODALIDADE;
  const { dataInicial, dataFinal } = resolveWindow(
    params.dataInicio,
    params.dataFim,
  );

  const query = new URLSearchParams({
    dataInicial,
    dataFinal,
    codigoModalidadeContratacao: String(modalidade),
    pagina: String(page),
    tamanhoPagina: String(limit),
  });
  if (params.uf) query.set("uf", params.uf);

  const url = `${PNCP_BASE}/v1/contratacoes/publicacao?${query.toString()}`;

  try {
    const json = await withRetry(() => fetchJson(url), RETRIES);
    const items: BiddingOpportunity[] = Array.isArray(json?.data)
      ? json.data.map(mapPncpItem)
      : [];

    // 0 resultados na fonte primária -> tenta o fallback do Compras.gov.
    if (items.length === 0) {
      const fallback = await searchComprasnet(params).catch(() => null);
      if (fallback && fallback.data.length > 0) return fallback;
    }

    return {
      data: applyClientFilters(items, params),
      total:
        typeof json?.totalRegistros === "number"
          ? json.totalRegistros
          : items.length,
      page,
      hasMore: (json?.paginasRestantes ?? 0) > 0,
    };
  } catch {
    // PNCP indisponível -> tenta fallback; se também falhar, erro amigável.
    const fallback = await searchComprasnet(params).catch(() => null);
    if (fallback) return fallback;
    throw new Error(API_OFFLINE_MESSAGE);
  }
}
