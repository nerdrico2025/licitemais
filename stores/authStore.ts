import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "../services/auth";

type AuthState = {
  session: Session | null;
  user: User | null;
  /** true enquanto a sessão inicial ainda está sendo resolvida. */
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * Carrega a sessão persistida e assina supabase.auth.onAuthStateChange.
   * Retorna uma função para cancelar a assinatura.
   */
  initialize: () => () => void;
};

export const useAuthStore = create<AuthState>((set) => {
  const apply = (session: Session | null) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading: false,
    });

  return {
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,

    initialize: () => {
      // Sessão persistida (AsyncStorage) — resolve o isLoading inicial.
      getSession()
        .then(apply)
        .catch(() => apply(null));

      // Mantém o store em sincronia com login/logout/refresh de token.
      const subscription = onAuthStateChange((_event, session) => {
        apply(session);
      });

      return () => subscription.unsubscribe();
    },
  };
});
