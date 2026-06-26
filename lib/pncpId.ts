/**
 * Parser do `numeroControlePNCP` — o `external_id` das oportunidades do PNCP.
 *
 * Formato real confirmado contra a API de consulta:
 *   "32512501000143-1-000192/2026"
 *    └─ CNPJ (14) ┘ │ └ seq ┘ └ ano ┘
 *                   └ dígito do tipo de instrumento (fixo na composição)
 *
 * A API de detalhe do PNCP é indexada por cnpj/ano/sequencial (sequencial SEM
 * zeros à esquerda — ex.: /orgaos/32512501000143/compras/2026/192), por isso
 * expomos `sequencial` como número além do `sequencialRaw` original.
 */
export type PncpControlId = {
  /** CNPJ do órgão (14 dígitos, sem máscara). */
  cnpj: string;
  /** Ano da compra (4 dígitos). */
  ano: string;
  /** Sequencial da compra sem zeros à esquerda (usado na API de detalhe). */
  sequencial: number;
  /** Sequencial como veio no id (com zeros à esquerda). */
  sequencialRaw: string;
  /** O id original, intacto. */
  raw: string;
};

const PNCP_CONTROL = /^(\d{14})-(\d+)-(\d+)\/(\d{4})$/;

/**
 * Faz o parse do `numeroControlePNCP`. Retorna `null` para qualquer string fora
 * do formato (ids do Compras.gov, valores vazios, lixo) — o chamador decide o
 * fallback. Nunca lança.
 */
export function parsePncpControlId(value: string | null | undefined): PncpControlId | null {
  if (!value) return null;
  const match = PNCP_CONTROL.exec(value.trim());
  if (!match) return null;
  const [, cnpj, , sequencialRaw, ano] = match;
  return {
    cnpj,
    ano,
    sequencial: Number(sequencialRaw),
    sequencialRaw,
    raw: value,
  };
}
