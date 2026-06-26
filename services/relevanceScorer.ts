import type { BiddingOpportunity } from "../types/opportunity";

/**
 * Scoring de relevância (0–100) de uma licitação contra as keywords de busca.
 *
 * O PNCP faz matching de texto livre no objeto, sem contexto semântico, então
 * buscas amplas (ex.: "TI") trazem muito ruído (merenda, material escolar...).
 * Este scorer reordena/filtra por relevância usando sinônimos e penalidades.
 *
 * Pontuação (somada, clamp 0–100):
 *  +40  keyword no início do objeto (primeiros ~40 chars; cobre "AQUISIÇÃO DE X")
 *  +30  keyword exata (palavra inteira) em qualquer posição do objeto
 *  +20  sinônimo/termo relacionado no objeto
 *  +10  keyword na modalidade ou no nome do órgão
 *  -30  termo de outro contexto (penalidade) sem nenhum termo do contexto buscado
 */

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
function norm(s: string): string {
  return s.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Índice da 1ª ocorrência de `term` como palavra inteira (ou -1). Tolera plural
 * pt-BR (sufixo opcional "s"/"es") para casar "computador" em "computadores",
 * "rede" em "redes" etc. — sem isso o recall cai muito.
 */
function wordIndex(haystack: string, term: string): number {
  if (!term) return -1;
  const m = new RegExp(`\\b${escapeRe(term)}(?:es|s)?\\b`).exec(haystack);
  return m ? m.index : -1;
}
function hasWord(haystack: string, term: string): boolean {
  return wordIndex(haystack, term) !== -1;
}

// Posição (em chars) até a qual consideramos o termo "no início" do objeto.
const START_WINDOW = 40;

// Tabela de sinônimos — chaves e valores normalizados (sem acento, minúsculas).
const SYNONYMS: Record<string, string[]> = {
  ti: [
    "tecnologia da informacao", "informatica", "software", "hardware", "sistema",
    "computador", "servidor", "rede", "licenca", "suporte tecnico",
    "desenvolvimento", "dados", "cloud", "digitalizacao", "automacao",
  ],
  software: [
    "sistema", "licenca", "plataforma", "aplicativo", "erp", "crm", "saas",
    "desenvolvimento",
  ],
  seguranca: ["vigilancia", "monitoramento", "camera", "cftv", "alarme", "protecao"],
  consultoria: ["assessoria", "servico especializado", "prestacao de servico"],
  limpeza: ["higienizacao", "conservacao", "asseio"],
  obras: ["construcao", "reforma", "manutencao predial", "engenharia"],
};

// Aliases -> chave canônica da tabela de sinônimos.
const ALIASES: Record<string, string> = {
  ti: "ti",
  tecnologia: "ti",
  "tecnologia da informacao": "ti",
  informatica: "ti",
};

function canonical(keyword: string): string {
  return ALIASES[keyword] ?? keyword;
}
function synonymsFor(keyword: string): string[] {
  return SYNONYMS[canonical(keyword)] ?? [];
}

// Penalidades por contexto: se a busca é de TI mas o objeto é claramente de
// outro domínio (e sem nenhum negador de TI), penaliza.
const TI_CONTEXT = new Set(["ti", "tecnologia", "tecnologia da informacao", "informatica", "software"]);
const TI_PENALTY_TERMS = [
  "alimento", "merenda", "material escolar", "papel", "caneta",
  "material de limpeza", "combustivel", "uniforme", "fardamento",
  "medicamento", "vacina", "mobiliario", "moveis", "cadeira", "mesa",
];
const TI_NEGATORS = ["ti", "tecnologia", ...SYNONYMS.ti];

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function scoreRelevance(
  opportunity: BiddingOpportunity,
  keywords: string[],
): number {
  if (!keywords || keywords.length === 0) return 0;

  const objeto = norm(
    `${opportunity.title} ${opportunity.description ?? opportunity.raw_text ?? ""}`,
  );
  if (!objeto) return 0;
  const meta = norm(`${opportunity.bidding_mode ?? ""} ${opportunity.agency ?? ""}`);

  let positional = 0; // melhor entre 40 (início) / 30 (qualquer posição) / 0
  let synonymHit = false;
  let metaHit = false;
  let tiContext = false;

  for (const raw of keywords) {
    const k = norm(raw);
    if (!k) continue;

    const idx = wordIndex(objeto, k);
    if (idx !== -1) {
      positional = Math.max(positional, idx <= START_WINDOW ? 40 : 30);
    }
    if (hasWord(meta, k)) metaHit = true;
    if (synonymsFor(k).some((s) => hasWord(objeto, s))) synonymHit = true;
    if (TI_CONTEXT.has(canonical(k)) || TI_CONTEXT.has(k)) tiContext = true;
  }

  let score = positional + (synonymHit ? 20 : 0) + (metaHit ? 10 : 0);

  if (tiContext) {
    const hasPenalty = TI_PENALTY_TERMS.some((t) => hasWord(objeto, t));
    const hasNegator = TI_NEGATORS.some((t) => hasWord(objeto, t));
    if (hasPenalty && !hasNegator) score -= 30;
  }

  return clamp(score);
}
