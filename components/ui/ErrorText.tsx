import { Text } from "react-native";

/** Mensagem de erro em vermelho. Não renderiza nada quando vazio. */
export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text className="text-sm text-red-600">{children}</Text>;
}
