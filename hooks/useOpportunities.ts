import { useInfiniteQuery } from "@tanstack/react-query";

import { searchOpportunities } from "../services/pncp";
import type { OpportunityFilters } from "../types/opportunity";

const STALE_TIME = 15 * 60 * 1000; // 15 min de cache client-side
const PAGE_SIZE = 20;

export type UseOpportunitiesParams = OpportunityFilters & {
  keyword?: string;
};

export function useOpportunities(params: UseOpportunitiesParams = {}) {
  return useInfiniteQuery({
    queryKey: ["opportunities", params],
    queryFn: ({ pageParam }) =>
      searchOpportunities({ ...params, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    staleTime: STALE_TIME,
  });
}
