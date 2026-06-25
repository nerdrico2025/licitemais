import type { SearchParams, SearchResult } from "../types/opportunity";

/**
 * Fallback do Compras.gov.br (ComprasNet).
 *
 * A API de Dados Abertos do Compras.gov.br foi reestruturada e os endpoints
 * públicos de licitações/contratações retornam 404 no momento. Esta função
 * mantém a assinatura e o contrato esperados pelo PNCP (mesmo SearchResult) e
 * **degrada graciosamente para vazio** em qualquer falha, para nunca quebrar a
 * busca. Quando o endpoint correto for confirmado, basta implementar a chamada
 * e o mapeamento aqui, mantendo o retorno BiddingOpportunity[].
 */
export async function searchComprasnet(
  params: SearchParams,
): Promise<SearchResult> {
  const page = params.page ?? 1;

  // TODO: integrar o endpoint oficial do Compras.gov.br quando confirmado.
  // Até lá, retorna vazio (o PNCP é a fonte primária).
  return { data: [], total: 0, page, hasMore: false };
}
