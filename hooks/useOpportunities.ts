import { useInfiniteQuery } from "@tanstack/react-query";
import { searchOpportunities } from "../services/pncp";
import type { OpportunityFilters } from "../types/opportunity";

const STALE_TIME_MS = 15 * 60 * 1000; // 15 min de cache client-side

export function useOpportunities(filters: OpportunityFilters) {
  return useInfiniteQuery({
    queryKey: ["opportunities", filters],
    queryFn: ({ pageParam }) =>
      searchOpportunities({ ...filters, page: pageParam, limit: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: STALE_TIME_MS,
  });
}
