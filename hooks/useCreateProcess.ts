import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { supabase } from "../services/supabase";
import { showError, showToast } from "../lib/toast";
import type { BiddingOpportunity } from "../types/opportunity";

interface CreateProcessResult {
  processId: string;
  alreadyExisted: boolean;
}

async function createProcess(
  opportunity: BiddingOpportunity,
): Promise<CreateProcessResult> {
  // 1. Garante a oportunidade no cache compartilhado.
  //    ignoreDuplicates (DO NOTHING) evita UPDATE, que a RLS não permite.
  const { error: upsertError } = await supabase
    .from("bidding_opportunities")
    .upsert(opportunity, { onConflict: "external_id", ignoreDuplicates: true });
  if (upsertError) {
    throw new Error("Não foi possível salvar a licitação. Tente novamente.");
  }

  const { data: opp, error: selectError } = await supabase
    .from("bidding_opportunities")
    .select("id")
    .eq("external_id", opportunity.external_id)
    .single();
  if (selectError || !opp) {
    throw new Error("Não foi possível salvar a licitação. Tente novamente.");
  }

  // 2. Idempotente: se já existe processo deste usuário, reaproveita.
  //    (a RLS garante que só os processos do próprio usuário são visíveis)
  const { data: existing } = await supabase
    .from("user_processes")
    .select("id")
    .eq("opportunity_id", opp.id)
    .maybeSingle();
  if (existing) {
    return { processId: existing.id, alreadyExisted: true };
  }

  const { data: created, error: insertError } = await supabase
    .from("user_processes")
    .insert({ opportunity_id: opp.id })
    .select("id")
    .single();

  if (insertError) {
    // 23505 = unique violation: outro fluxo criou o processo no meio do caminho
    if (insertError.code === "23505") {
      const { data: raced } = await supabase
        .from("user_processes")
        .select("id")
        .eq("opportunity_id", opp.id)
        .single();
      if (raced) return { processId: raced.id, alreadyExisted: true };
    }
    throw new Error("Não foi possível criar o processo. Tente novamente.");
  }

  // 3. Dispara a análise por IA sem bloquear a navegação
  supabase.functions
    .invoke("analyze-edital", { body: { processId: created.id } })
    .catch(() => {});

  return { processId: created.id, alreadyExisted: false };
}

export function useCreateProcess() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProcess,
    onSuccess: ({ processId, alreadyExisted }) => {
      if (alreadyExisted) {
        showToast("Você já monitora esta licitação.");
      } else {
        showToast("Licitação adicionada aos seus processos.");
        queryClient.invalidateQueries({ queryKey: ["processes"] });
      }
      router.push({
        pathname: "/(app)/processos/[id]",
        params: { id: processId },
      });
    },
    onError: (error) => {
      showError(
        error instanceof Error
          ? error.message
          : "Algo deu errado. Tente novamente.",
      );
    },
  });
}
