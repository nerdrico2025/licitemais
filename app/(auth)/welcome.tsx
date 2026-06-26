import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";

export default function Welcome() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between px-6 py-10">
        <View className="flex-1 justify-center gap-5">
          <Text className="text-4xl font-bold text-slate-900">Licite Mais</Text>
          <Text className="text-lg leading-relaxed text-slate-600">
            Encontre, organize e acompanhe licitações públicas em um só lugar.
            Com análise inteligente de editais, você foca no que realmente
            importa para vencer.
          </Text>
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
