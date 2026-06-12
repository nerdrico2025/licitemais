import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "../services/auth";

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: () => {
    getSession()
      .then((session) => {
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session,
          isLoading: false,
        });
      })
      .catch(() => {
        set({ session: null, user: null, isAuthenticated: false, isLoading: false });
      });

    const subscription = onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      });
    });

    return () => subscription.unsubscribe();
  },
}));
