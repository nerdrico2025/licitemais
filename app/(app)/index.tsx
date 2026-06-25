import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";

export default function Home() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center gap-6 px-6">
        <View className="gap-2">
          <Text className="text-2xl font-bold text-slate-900">Início</Text>
          <Text className="text-base text-slate-500">
            Área autenticada do Licite Mais.
          </Text>
        </View>
        <Button
          title="Buscar licitações"
          onPress={() => router.push("/(app)/buscar")}
        />
      </View>
    </SafeAreaView>
  );
}
