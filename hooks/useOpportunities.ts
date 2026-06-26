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
  const { categoria } = params;
  const limit = categoria ? CATEGORY_PAGE_SIZE : PAGE_SIZE;
  const result = await searchOpportunities({ ...params, page, limit });

  if (!categoria) return result;

  // Classifica a página (LLM) e mantém só o tema escolhido. `total` segue da
  // fonte (aproximado): a classificação é best-effort sobre o que foi carregado.
  const categories = await classifyOpportunities(result.data);
  const data = result.data
    .map((item) => ({ ...item, category: categories.get(item.external_id) ?? null }))
    .filter((item) => item.category === categoria);

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
