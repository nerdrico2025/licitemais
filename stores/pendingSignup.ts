import { create } from "zustand";

/**
 * Guarda em memória (não persistido) as credenciais do cadastro recém-feito,
 * para que a tela de verificação possa tentar o login após o e-mail ser
 * confirmado — sem expor a senha na URL/params de navegação.
 */
type PendingSignupState = {
  email: string;
  password: string;
  set: (credentials: { email: string; password: string }) => void;
  clear: () => void;
};

export const usePendingSignup = create<PendingSignupState>((set) => ({
  email: "",
  password: "",
  set: (credentials) => set(credentials),
  clear: () => set({ email: "", password: "" }),
}));
