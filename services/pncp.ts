import type {
  BiddingOpportunity,
  SearchParams,
  SearchResult,
} from "../types/opportunity";
import { searchComprasnet } from "./comprasnet";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";
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
