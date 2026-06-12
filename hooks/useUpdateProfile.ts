import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../stores/authStore";
import { showError, showToast } from "../lib/toast";
import { PROFILE_QUERY_KEY } from "./useProfile";
import type { CompanyProfile, Profile } from "../types/profile";

async function updateCompanyProfile(userId: string, companyProfile: CompanyProfile) {
  const { error } = await supabase
    .from("profiles")
    .update({ company_profile: companyProfile })
    .eq("id", userId);

  if (error) {
    throw new Error("Não foi possível salvar o perfil da empresa. Tente novamente.");
  }
}

interface MutationContext {
  previous?: Profile;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation<void, Error, CompanyProfile, MutationContext>({
    mutationFn: (companyProfile) => updateCompanyProfile(userId!, companyProfile),
    onMutate: async (companyProfile) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });

      const previous = queryClient.getQueryData<Profile>(PROFILE_QUERY_KEY);

      queryClient.setQueryData<Profile | undefined>(PROFILE_QUERY_KEY, (current) =>
        current ? { ...current, company_profile: companyProfile } : current,
      );

      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PROFILE_QUERY_KEY, context.previous);
      }
      showError(error.message);
    },
    onSuccess: () => {
      showToast("Perfil da empresa atualizado.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
