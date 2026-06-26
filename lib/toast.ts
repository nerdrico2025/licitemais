import { Alert, Platform } from "react-native";

/**
 * Feedback mínimo e web-compatible. Em nativo usa Alert.alert; na web o
 * Alert do react-native-web cai em window.alert. Sem dependência de lib de
 * toast (removida no refactor) — quando houver um sistema de toast próprio,
 * basta trocar a implementação aqui.
 */
function show(title: string, message: string) {
  if (Platform.OS === "web") {
    // window.alert é síncrono e bloqueante, mas garante feedback na web.
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export function toastError(message: string) {
  show("Ops", message);
}

export function toastSuccess(message: string) {
  show("Pronto", message);
}
