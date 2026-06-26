import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "../lib/toast";
import { supabase } from "../services/supabase";
import type { UserProcess } from "../types/process";
import { PROCESSES_KEY } from "./useProcesses";

/** Chave de um processo individual. */
export const processKey = (id: string) => ["user_processes", id] as const;

// Payload enxuto p/ 3G (§8.1): colunas do detalhe (sem raw_text da oportunidade).
const SELECT =
  "id, status, ai_summary, checklist_state, notes, ai_processed_at, created_at, " +
  "opportunity_id, bidding_opportunities ( id, title, agency, opening_date )";

async function fetchProcess(id: string): Promise<UserProcess> {
  const { data, error } = await supabase
    .from("user_processes")
    .select(SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as UserProcess;
}

/**
 * Carrega um processo e assina o Realtime específico dele. Quando chega um
 * UPDATE com `ai_summary` preenchido (análise concluída) ou `status === ERROR`
 * (falha), atualizamos o cache em vez de refazer o fetch. O payload do Realtime
 * não traz o join, então fazemos merge preservando a bidding_opportunity.
 */
export function useProcess(id: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: processKey(id ?? ""),
    queryFn: () => fetchProcess(id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`user_processes:item:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_processes",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const next = payload.new as Partial<UserProcess>;
          const hasSummary = !!next.ai_summary;
          const isError = next.status === "ERROR";

          // Só reagimos às transições relevantes (análise pronta / falha).
          if (!hasSummary && !isError) return;

          queryClient.setQueryData<UserProcess>(processKey(id), (prev) =>
            prev
              ? { ...prev, ...next, bidding_opportunities: prev.bidding_opportunities }
              : prev,
          );
          // A lista mostra status/resumo resumidos — mantém em sincronia.
          queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });

          if (isError) {
            toastError(
              "Não foi possível analisar o edital. Tente novamente mais tarde.",
            );
          } else if (hasSummary) {
            toastSuccess("Análise do edital concluída!");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  return query;
}
