import { useAuthStore } from "../stores/authStore";

export function useAuth() {
  const { session, user, isLoading, isAuthenticated } = useAuthStore();
  return { session, user, isLoading, isAuthenticated };
}
