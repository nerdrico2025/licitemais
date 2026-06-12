import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import type { UserProcess, UserProcessWithOpportunity } from "../types/process";

export function processQueryKey(processId: string) {
  return ["processes", processId] as const;
}

async function fetchProcess(processId: string): Promise<UserProcessWithOpportunity> {
  const { data, error } = await supabase
    .from("user_processes")
    .select(
      "*, opportunity:bidding_opportunities(id, external_id, source, title, agency, opening_date, estimated_value)",
    )
    .eq("id", processId)
    .single();

  if (error || !data) {
    throw new Error("Não foi possível carregar este processo. Tente novamente.");
  }

  return data as unknown as UserProcessWithOpportunity;
}

export function useProcess(processId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: processQueryKey(processId ?? ""),
    queryFn: () => fetchProcess(processId!),
    enabled: !!processId,
  });

  useEffect(() => {
    if (!processId) return;

    const channel = supabase
      .channel(`user_processes:detail:${processId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_processes",
          filter: `id=eq.${processId}`,
        },
        (payload) => {
          const updated = payload.new as UserProcess;

          queryClient.setQueryData<UserProcessWithOpportunity | undefined>(
            processQueryKey(processId),
            (current) => (current ? { ...current, ...updated } : current),
          );

          if (updated.ai_summary != null || updated.status === "ERROR") {
            queryClient.invalidateQueries({ queryKey: processQueryKey(processId) });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processId, queryClient]);

  return query;
}
