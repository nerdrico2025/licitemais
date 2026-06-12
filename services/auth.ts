import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed":
    "E-mail ainda não confirmado. Verifique sua caixa de entrada.",
  "User already registered": "Este e-mail já está cadastrado.",
  "Password should be at least 6 characters":
    "A senha deve ter pelo menos 6 caracteres.",
  "Unable to validate email address: invalid format": "E-mail inválido.",
  "Email rate limit exceeded":
    "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "For security purposes, you can only request this once every 60 seconds":
    "Por segurança, aguarde 60 segundos antes de tentar novamente.",
  "New password should be different from the old password":
    "A nova senha deve ser diferente da anterior.",
  "User not found": "Usuário não encontrado.",
  "Signup is disabled": "Cadastro de novos usuários está desativado.",
};

export function translateAuthError(message: string): string {
  if (AUTH_ERROR_MESSAGES[message]) return AUTH_ERROR_MESSAGES[message];

  const partial = Object.entries(AUTH_ERROR_MESSAGES).find(([key]) =>
    message.toLowerCase().includes(key.toLowerCase()),
  );
  if (partial) return partial[1];

  if (/network|fetch/i.test(message)) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return "Algo deu errado. Tente novamente em instantes.";
}

export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(translateAuthError(error.message));
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(translateAuthError(error.message));
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(translateAuthError(error.message));
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(translateAuthError(error.message));
  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
