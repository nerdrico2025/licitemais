import { useQuery } from "@tanstack/react-query";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../stores/authStore";
import type { Profile } from "../types/profile";

export const PROFILE_QUERY_KEY = ["profile"] as const;

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("Não foi possível carregar seu perfil. Tente novamente.");
  }

  return data as Profile;
}

export function useProfile() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
}
