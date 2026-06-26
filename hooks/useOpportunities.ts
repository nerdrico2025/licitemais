import { useInfiniteQuery } from "@tanstack/react-query";

import { classifyOpportunities } from "../services/classify";
import { searchOpportunities } from "../services/pncp";
import type { OpportunityFilters, SearchResult } from "../types/opportunity";

const STALE_TIME = 15 * 60 * 1000; // 15 min de cache client-side
const PAGE_SIZE = 20;
// Com filtro de categoria, parte da página é descartada após a classificação;
// puxamos mais itens por página para a lista não vir esparsa (over-fetch).
const CATEGORY_PAGE_SIZE = 50;

export type UseOpportunitiesParams = OpportunityFilters & {
  keyword?: string;
};

async function fetchOpportunitiesPage(
  params: UseOpportunitiesParams,
  page: number,
): Promise<SearchResult> {
  const { categoria, relevanceFilter } = params;
  const limit = categoria ? CATEGORY_PAGE_SIZE : PAGE_SIZE;
  const result = await searchOpportunities({
    ...params,
    page,
    limit,
    // Pontua a relevância pela keyword da busca atual (se houver).
    relevanceKeywords: params.keyword?.trim() ? [params.keyword.trim()] : undefined,
  });

  let data = result.data;

  // Filtro de categoria: classifica a página (LLM) e mantém só o tema escolhido.
  if (categoria) {
    const categories = await classifyOpportunities(data);
    data = data
      .map((item) => ({ ...item, category: categories.get(item.external_id) ?? null }))
      .filter((item) => item.category === categoria);
  }

  // Filtro de relevância (client-side). LIMITAÇÃO: opera SOBRE a página já
  // paginada — não substitui a paginação. Em buscas muito específicas, o
  // usuário pode ver menos resultados por página do que o esperado; o infinite
  // scroll continua puxando as próximas páginas normalmente.
  if (relevanceFilter && relevanceFilter !== "all") {
    const min = relevanceFilter === "high" ? 60 : 30;
    data = data.filter((item) => (item.relevanceScore ?? 0) >= min);
  }

  return { ...result, data };
}

export function useOpportunities(params: UseOpportunitiesParams = {}) {
  return useInfiniteQuery({
    queryKey: ["opportunities", params],
    queryFn: ({ pageParam }) => fetchOpportunitiesPage(params, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: STALE_TIME,
  });
}
