import { useQueryClient } from "@tanstack/react-query";
import type {
  BiddingOpportunity,
  SearchOpportunitiesResult,
} from "../types/opportunity";

interface InfiniteOpportunities {
  pages: SearchOpportunitiesResult[];
}

/** Localiza uma oportunidade no cache das buscas já carregadas. */
export function useOpportunityFromCache(
  externalId: string | undefined,
): BiddingOpportunity | undefined {
  const queryClient = useQueryClient();
  if (!externalId) return undefined;

  const queries = queryClient.getQueriesData<InfiniteOpportunities>({
    queryKey: ["opportunities"],
  });

  for (const [, data] of queries) {
    if (!data?.pages) continue;
    for (const page of data.pages) {
      const found = page.data.find((item) => item.external_id === externalId);
      if (found) return found;
    }
  }

  return undefined;
}
