import type {
  AuthChangeEvent,
  AuthError,
  Session,
  Subscription,
} from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Traduz erros de autenticação do Supabase para mensagens amigáveis em PT-BR.
 * Tenta primeiro pelo `code` (estável) e cai para a mensagem em inglês.
 */
export function translateAuthError(error: AuthError | Error | null): string {
  if (!error) return "";

  const code = "code" in error ? error.code : undefined;
  const message = error.message ?? "";

  // Mapeamento por código (preferencial — não muda entre versões/idiomas).
  const byCode: Record<string, string> = {
    invalid_credentials: "E-mail ou senha incorretos.",
    email_not_confirmed:
      "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
    user_already_exists: "Este e-mail já está cadastrado.",
    email_exists: "Este e-mail já está cadastrado.",
    weak_password: "A senha é muito fraca. Use pelo menos 6 caracteres.",
    over_email_send_rate_limit:
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    over_request_rate_limit:
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    validation_failed: "Dados inválidos. Verifique os campos e tente novamente.",
    signup_disabled: "Os cadastros estão desabilitados no momento.",
    email_address_invalid: "E-mail inválido.",
    same_password: "A nova senha deve ser diferente da anterior.",
    session_not_found: "Sua sessão expirou. Entre novamente.",
    user_not_found: "Usuário não encontrado.",
  };

  if (code && byCode[code]) return byCode[code];

  // Fallback por trecho da mensagem em inglês.
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado.";
  if (m.includes("password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "E-mail inválido.";
  if (m.includes("for security purposes") || m.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("signups not allowed"))
    return "Os cadastros estão desabilitados no momento.";
  if (
    m.includes("network") ||
    m.includes("failed to fetch") ||
    m.includes("fetch failed")
  )
    return "Não foi possível conectar. Verifique sua conexão com a internet.";

  // Último recurso: mensagem genérica (evita expor texto técnico em inglês).
  return "Algo deu errado. Tente novamente em instantes.";
}

export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Grava o nome no metadata do usuário. Com "Confirm email" habilitado
      // (padrão), o Supabase já dispara o e-mail de verificação neste passo.
      data: { name },
    },
  });
  if (error) throw new Error(translateAuthError(error));
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(translateAuthError(error));
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(translateAuthError(error));
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw new Error(translateAuthError(error));
  return data;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(translateAuthError(error));
  return data.session;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): Subscription {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
