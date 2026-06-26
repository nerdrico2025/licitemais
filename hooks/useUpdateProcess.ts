import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastError, toastSuccess } from "../lib/toast";
import { supabase } from "../services/supabase";
import type { UpdateProcessInput, UserProcess } from "../types/process";
import { processKey } from "./useProcess";
import { PROCESSES_KEY } from "./useProcesses";

// Mesmo payload enxuto do detalhe (§8.1) — alimenta o cache de useProcess.
const SELECT =
  "id, status, ai_summary, checklist_state, notes, ai_processed_at, created_at, " +
  "opportunity_id, bidding_opportunities ( id, title, agency, opening_date )";
const GENERIC_ERROR =
  "Não foi possível atualizar o processo agora. Tente novamente em instantes.";

type Context = {
  previousProcess?: UserProcess;
  previousList?: UserProcess[];
};

/** Aplica o patch a um processo, ignorando o campo `id`. */
function applyPatch(process: UserProcess, input: UpdateProcessInput): UserProcess {
  const { id: _id, ...patch } = input;
  return { ...process, ...patch };
}

/**
 * Atualiza status / checklist_state / notes de um processo com optimistic
 * update e rollback em caso de erro. O Realtime (useProcess/useProcesses)
 * eventualmente reconcilia, mas o optimistic update dá resposta imediata.
 */
export function useUpdateProcess() {
  const queryClient = useQueryClient();

  return useMutation<UserProcess, Error, UpdateProcessInput, Context>({
    mutationFn: async (input) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from("user_processes")
        .update(patch)
        .eq("id", id)
        .select(SELECT)
        .single();

      if (error || !data) throw error ?? new Error(GENERIC_ERROR);
      return data as unknown as UserProcess;
    },

    onMutate: async (input) => {
      const key = processKey(input.id);
      // Evita que fetches em voo sobrescrevam o optimistic update.
      await queryClient.cancelQueries({ queryKey: key });
      await queryClient.cancelQueries({ queryKey: PROCESSES_KEY });

      const previousProcess = queryClient.getQueryData<UserProcess>(key);
      const previousList = queryClient.getQueryData<UserProcess[]>(PROCESSES_KEY);

      if (previousProcess) {
        queryClient.setQueryData<UserProcess>(key, applyPatch(previousProcess, input));
      }
      if (previousList) {
        queryClient.setQueryData<UserProcess[]>(
          PROCESSES_KEY,
          previousList.map((p) => (p.id === input.id ? applyPatch(p, input) : p)),
        );
      }

      return { previousProcess, previousList };
    },

    onError: (error, input, context) => {
      // Rollback de ambos os caches.
      if (context?.previousProcess) {
        queryClient.setQueryData(processKey(input.id), context.previousProcess);
      }
      if (context?.previousList) {
        queryClient.setQueryData(PROCESSES_KEY, context.previousList);
      }
      toastError(error.message || GENERIC_ERROR);
    },

    onSuccess: (data) => {
      // Concilia com a linha autoritativa do servidor (inclui updated_at).
      queryClient.setQueryData(processKey(data.id), data);
      toastSuccess("Processo atualizado.");
    },

    onSettled: (_data, _error, input) => {
      queryClient.invalidateQueries({ queryKey: processKey(input.id) });
      queryClient.invalidateQueries({ queryKey: PROCESSES_KEY });
    },
  });
}
