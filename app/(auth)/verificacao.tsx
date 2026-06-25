import { useState } from "react";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { ErrorText } from "../../components/ui/ErrorText";
import { signIn } from "../../services/auth";
import { usePendingSignup } from "../../stores/pendingSignup";

export default function Verificacao() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { email, password, clear } = usePendingSignup();

  const onConfirm = async () => {
    setError("");

    if (!email || !password) {
      router.replace("/(auth)/login");
      return;
    }

    setLoading(true);
    try {
      // Só obtém sessão depois que o e-mail foi confirmado; caso contrário o
      // helper lança "Confirme seu e-mail...". Em sucesso, a guarda de rota
      // detecta a sessão e leva para (app) automaticamente.
      await signIn(email, password);
      clear();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível verificar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center gap-6 px-6 py-10">
        <View className="gap-3">
          <Text className="text-3xl font-bold text-slate-900">
            Confirme seu e-mail
          </Text>
          <Text className="text-base leading-relaxed text-slate-600">
            Enviamos um link de confirmação
            {email ? (
              <Text className="font-semibold text-slate-800"> para {email}</Text>
            ) : null}
            . Abra o e-mail e toque no link para ativar sua conta.
          </Text>
          <Text className="text-sm text-slate-500">
            Não esqueça de checar a caixa de spam.
          </Text>
        </View>

        <ErrorText>{error}</ErrorText>

        <View className="gap-3">
          <Button title="Já confirmei" loading={loading} onPress={onConfirm} />
          <Button
            title="Voltar para o login"
            variant="ghost"
            onPress={() => router.replace("/(auth)/login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
