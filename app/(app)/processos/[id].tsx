import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Placeholder — a tela de acompanhamento do processo (kanban, checklist, análise
// de IA) será implementada em outra etapa. Existe para o fluxo "Monitorar" da
// tela de detalhes navegar para um destino real (RF07).
export default function Processo() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 border-b border-slate-100 px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-lg font-semibold text-slate-900">Processo</Text>
      </View>

      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Ionicons name="checkmark-circle-outline" size={40} color="#22c55e" />
        <Text className="text-center text-base font-semibold text-slate-700">
          Licitação monitorada!
        </Text>
        <Text className="text-center text-sm text-slate-500">
          O acompanhamento do processo será exibido aqui.
        </Text>
        <Text className="mt-2 text-center text-xs text-slate-400">{id}</Text>
      </View>
    </SafeAreaView>
  );
}
