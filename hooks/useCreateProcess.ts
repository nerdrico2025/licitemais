import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { toastError } from "../lib/toast";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../stores/authStore";
import type { BiddingOpportunity } from "../types/opportunity";

const GENERIC_ERROR =
  "Não foi possível monitorar esta licitação agora. Tente novamente em instantes.";

type MonitorResult = { processId: string; isNew: boolean };

/**
 * Monitora uma licitação (RF07). Fluxo:
 *  1. upsert da BiddingOpportunity em bidding_opportunities (por external_id);
 *  2. idempotência: se já existe user_processes para (user, opportunity), reusa;
 *     senão insere com status SAVED;
 *  3. dispara analyze-edital (fire-and-forget) só para processos novos;
 *  4. navega para /(app)/processos/[id].
 *
 * Obs.: a Edge Function "analyze-edital" ainda não está implantada — a invocação
 * degrada graciosamente (.catch) e vira no-op até a função existir.
 */
export function useCreateProcess() {
  const queryClient = useQueryClient();

  return useMutation<MonitorResult, Error, BiddingOpportunity>({
    mutationFn: async (opportunity) => {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Sessão expirada. Faça login novamente.");

      // 1. upsert da oportunidade (colunas espelham BiddingOpportunity 1:1).
      // `category` é inferida por IA no client e não tem coluna na tabela.
      const { category: _category, ...oppRow } = opportunity;
      const { data: opp, error: oppError } = await supabase
        .from("bidding_opportunities")
        .upsert(oppRow, { onConflict: "external_id" })
        .select("id")
        .single();
      if (oppError || !opp) throw oppError ?? new Error(GENERIC_ERROR);

      // 2. idempotência: já monitora? reusa o processo existente.
      const { data: existing, error: existingError } = await supabase
        .from("user_processes")
        .select("id")
        .eq("user_id", user.id)
        .eq("opportunity_id", opp.id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return { processId: existing.id, isNew: false };

      // 2b. cria o processo (user_id default = auth.uid(); status default SAVED).
      const { data: created, error: createError } = await supabase
        .from("user_processes")
        .insert({ opportunity_id: opp.id })
        .select("id")
        .single();
      if (createError || !created) throw createError ?? new Error(GENERIC_ERROR);

      // 3. análise por IA — fire-and-forget, não bloqueia a navegação.
      void supabase.functions
        .invoke("analyze-edital", { body: { processId: created.id } })
        .catch(() => {
          /* função ainda não implantada / offline — ignora */
        });

      return { processId: created.id, isNew: true };
    },
    onSuccess: ({ processId }) => {
      queryClient.invalidateQueries({ queryKey: ["user_processes"] });
      // 4. navega para o processo (novo ou existente).
      router.push({
        pathname: "/(app)/processos/[id]",
        params: { id: processId },
      });
    },
    onError: (error) => {
      toastError(error.message || GENERIC_ERROR);
    },
  });
}
