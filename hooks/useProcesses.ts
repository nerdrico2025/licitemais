import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../stores/authStore";
import type { UserProcessWithOpportunity } from "../types/process";

const PROCESSES_QUERY_KEY = ["processes"] as const;

async function fetchProcesses(userId: string): Promise<UserProcessWithOpportunity[]> {
  const { data, error } = await supabase
    .from("user_processes")
    .select(
      "*, opportunity:bidding_opportunities(id, external_id, source, title, agency, opening_date, estimated_value)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar seus processos. Tente novamente.");
  }

  return (data ?? []) as unknown as UserProcessWithOpportunity[];
}

export function useProcesses() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PROCESSES_QUERY_KEY,
    queryFn: () => fetchProcesses(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user_processes:list:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_processes",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: PROCESSES_QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}
