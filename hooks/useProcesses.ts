import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "../services/supabase";
import { useAuthStore } from "../stores/authStore";
import type { UserProcess } from "../types/process";

/** Chave da lista de processos do usuário. */
export const PROCESSES_KEY = ["user_processes"] as const;

// Payload enxuto p/ 3G (§8.1): só as colunas usadas na lista/Kanban — sem
// raw_text, notes, etc. ai_summary/checklist_state alimentam o progresso (X/Y).
const SELECT =
  "id, status, ai_summary, checklist_state, created_at, opportunity_id, " +
  "bidding_opportunities ( id, title, agency, opening_date )";

async function fetchProcesses(): Promise<UserProcess[]> {
  // RLS restringe a auth.uid(); ordenamos do mais recente para o mais antigo.
  const { data, error } = await supabase
    .from("user_processes")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as UserProcess[];
}

/**
 * Lista os processos do usuário (RF08). React Query para o fetch + cache e
 * Supabase Realtime para manter a lista viva: qualquer INSERT/UPDATE em
 * user_processes do usuário invalida a query (substitui SSE/polling).
 */
export function useProcesses() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: PROCESSES_KEY,
    queryFn: fetchProcesses,
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });
    };

    const channel = supabase
      .channel(`user_processes:list:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_processes",
          filter: `user_id=eq.${userId}`,
        },
        invalidate,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_processes",
          filter: `user_id=eq.${userId}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}
