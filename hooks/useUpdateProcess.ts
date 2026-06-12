import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import { showError, showToast } from "../lib/toast";
import { processQueryKey } from "./useProcess";
import type {
  ProcessStatus,
  UserProcessWithOpportunity,
} from "../types/process";

const PROCESSES_QUERY_KEY = ["processes"] as const;

export interface UpdateProcessInput {
  id: string;
  status?: ProcessStatus;
  checklist_state?: Record<string, boolean>;
  notes?: string;
}

async function updateProcess({ id, ...changes }: UpdateProcessInput) {
  const { error } = await supabase
    .from("user_processes")
    .update(changes)
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível salvar a alteração. Tente novamente.");
  }
}

function applyChanges(
  process: UserProcessWithOpportunity,
  changes: Omit<UpdateProcessInput, "id">,
): UserProcessWithOpportunity {
  return {
    ...process,
    ...changes,
    updated_at: new Date().toISOString(),
  };
}

interface MutationContext {
  previousDetail?: UserProcessWithOpportunity;
  previousList?: UserProcessWithOpportunity[];
}

export function useUpdateProcess() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateProcessInput, MutationContext>({
    mutationFn: updateProcess,
    onMutate: async ({ id, ...changes }) => {
      await queryClient.cancelQueries({ queryKey: processQueryKey(id) });
      await queryClient.cancelQueries({ queryKey: PROCESSES_QUERY_KEY });

      const previousDetail = queryClient.getQueryData<UserProcessWithOpportunity>(
        processQueryKey(id),
      );
      const previousList = queryClient.getQueryData<UserProcessWithOpportunity[]>(
        PROCESSES_QUERY_KEY,
      );

      queryClient.setQueryData<UserProcessWithOpportunity | undefined>(
        processQueryKey(id),
        (current) => (current ? applyChanges(current, changes) : current),
      );

      queryClient.setQueryData<UserProcessWithOpportunity[] | undefined>(
        PROCESSES_QUERY_KEY,
        (current) =>
          current?.map((process) =>
            process.id === id ? applyChanges(process, changes) : process,
          ),
      );

      return { previousDetail, previousList };
    },
    onError: (error, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(processQueryKey(id), context.previousDetail);
      }
      if (context?.previousList) {
        queryClient.setQueryData(PROCESSES_QUERY_KEY, context.previousList);
      }
      showError(error.message);
    },
    onSuccess: () => {
      showToast("Processo atualizado.");
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: processQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: PROCESSES_QUERY_KEY });
    },
  });
}
