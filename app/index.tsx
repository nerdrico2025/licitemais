import { Redirect } from "expo-router";

import { useAuthStore } from "../stores/authStore";

// Rota inicial ("/"): redireciona conforme a sessão.
// O _layout só monta esta tela depois de resolver isLoading, então
// isAuthenticated já reflete a sessão persistida aqui.
export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Redirect href={isAuthenticated ? "/(app)" : "/(auth)/welcome"} />;
}
