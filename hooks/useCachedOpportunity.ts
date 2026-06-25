import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { BiddingOpportunity, SearchResult } from "../types/opportunity";

/**
 * Recupera uma oportunidade já carregada pela busca, lendo o cache do React
 * Query por `external_id`. Evitamos um re-fetch porque a API de detalhe do PNCP
 * (cnpj/ano/sequencial) se mostrou instável (301 em loop). Limitação conhecida:
 * em deep link / cold start sem busca prévia o cache está vazio e retorna
 * undefined — a tela trata esse caso.
 */
export function useCachedOpportunity(
  externalId: string | undefined,
): BiddingOpportunity | undefined {
  const queryClient = useQueryClient();

  return useMemo(() => {
    if (!externalId) return undefined;
    // Todas as queries de busca ficam sob a chave ["opportunities", params].
    const queries = queryClient.getQueriesData<{ pages: SearchResult[] }>({
      queryKey: ["opportunities"],
    });
    for (const [, data] of queries) {
      const pages = data?.pages;
      if (!pages) continue;
      for (const page of pages) {
        const hit = page.data.find((o) => o.external_id === externalId);
        if (hit) return hit;
      }
    }
    return undefined;
  }, [queryClient, externalId]);
}
