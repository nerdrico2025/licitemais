import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSession } from "../../services/auth";
import { Button } from "../../components/ui/Button";

export default function VerificacaoScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState<string | undefined>();

  async function handleConfirmed() {
    setChecking(true);
    setInfo(undefined);
    try {
      const session = await getSession();
      if (session) {
        router.replace("/(app)/buscar");
      } else {
        setInfo(
          "Ainda não identificamos a confirmação. Após confirmar o e-mail, faça login para continuar.",
        );
        router.push("/(auth)/login");
      }
    } catch {
      setInfo("Não foi possível verificar agora. Tente fazer login.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <Text className="text-6xl">📬</Text>
        <Text className="mt-4 text-3xl font-bold text-gray-900">
          Confirme seu e-mail
        </Text>
        <Text className="mt-3 text-base text-gray-600">
          Enviamos um link de confirmação para o seu e-mail. Abra a mensagem e
          toque no link para ativar sua conta.
        </Text>
        <Text className="mt-2 text-sm text-gray-400">
          Não recebeu? Verifique a caixa de spam.
        </Text>

        {info ? <Text className="mt-4 text-sm text-amber-600">{info}</Text> : null}

        <View className="mt-8 gap-3">
          <Button
            title="Já confirmei"
            loading={checking}
            onPress={handleConfirmed}
          />
          <Button
            title="Voltar para o login"
            variant="secondary"
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
