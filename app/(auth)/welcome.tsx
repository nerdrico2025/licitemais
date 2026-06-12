import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between px-6 py-10">
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl font-bold text-blue-600">Licite Mais</Text>
          <Text className="mt-4 text-center text-lg text-gray-600">
            Encontre licitações públicas, analise editais com inteligência
            artificial e organize seus processos em um só lugar.
          </Text>

          <View className="mt-8 gap-3">
            <Text className="text-base text-gray-700">
              ✓ Oportunidades do PNCP e ComprasNet
            </Text>
            <Text className="text-base text-gray-700">
              ✓ Resumo de editais com IA
            </Text>
            <Text className="text-base text-gray-700">
              ✓ Checklist de documentos e prazos
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Button
            title="Criar conta"
            onPress={() => router.push("/(auth)/cadastro")}
          />
          <Button
            title="Já tenho conta"
            variant="secondary"
            onPress={() => router.push("/(auth)/login")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
