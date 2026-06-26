import { Redirect } from "expo-router";

// A área autenticada usa tabs; a rota índice cai direto na primeira aba.
export default function AppIndex() {
  return <Redirect href="/(app)/buscar" />;
}
