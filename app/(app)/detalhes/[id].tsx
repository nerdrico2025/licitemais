import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useOpportunityFromCache } from "../../../hooks/useOpportunity";
import { useCreateProcess } from "../../../hooks/useCreateProcess";
import { formatCurrency, formatDateTime } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
}) {
  return (
    <View className="flex-row items-start gap-3 border-b border-gray-100 py-3">
      <Ionicons name={icon} size={18} color="#6b7280" style={{ marginTop: 2 }} />
      <View className="flex-1">
        <Text className="text-xs font-medium uppercase text-gray-400">
          {label}
        </Text>
        <Text className="mt-0.5 text-base text-gray-900">
          {value ?? "Não informado"}
        </Text>
      </View>
    </View>
  );
}

export default function DetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const opportunity = useOpportunityFromCache(id);
  const createProcess = useCreateProcess();

  if (!opportunity) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text className="mt-3 text-center text-base text-gray-600">
            Licitação não encontrada. Volte à busca e tente novamente.
          </Text>
          <View className="mt-5 w-40">
            <Button title="Voltar" onPress={() => router.back()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  async function handleOpenEdital() {
    if (!opportunity?.source_url) {
      // RF06: aviso quando o edital original não está disponível
      Alert.alert(
        "Edital indisponível",
        "O portal de origem não disponibilizou o link do edital para esta licitação.",
      );
      return;
    }
    await WebBrowser.openBrowserAsync(opportunity.source_url);
  }

  async function handleShare() {
    if (!opportunity) return;
    const parts = [
      `📋 ${opportunity.title}`,
      opportunity.agency ? `Órgão: ${opportunity.agency}` : null,
      opportunity.opening_date
        ? `Abertura: ${formatDateTime(opportunity.opening_date)}`
        : null,
      formatCurrency(opportunity.estimated_value)
        ? `Valor estimado: ${formatCurrency(opportunity.estimated_value)}`
        : null,
      opportunity.source_url,
    ].filter(Boolean);

    await Share.share({ message: parts.join("\n") });
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-4 py-3">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-gray-900" numberOfLines={1}>
          Detalhes da licitação
        </Text>
        <Pressable hitSlop={8} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#111827" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-32 pt-4">
        <View className="flex-row flex-wrap gap-2">
          {opportunity.bidding_mode ? (
            <View className="self-start rounded-full bg-blue-100 px-3 py-1">
              <Text className="text-xs font-semibold text-blue-700">
                {opportunity.bidding_mode}
              </Text>
            </View>
          ) : null}
          <View className="self-start rounded-full bg-gray-100 px-3 py-1">
            <Text className="text-xs font-semibold text-gray-600">
              {opportunity.source}
            </Text>
          </View>
        </View>

        <Text className="mt-3 text-xl font-bold text-gray-900">
          {opportunity.title}
        </Text>

        {opportunity.description &&
        opportunity.description !== opportunity.title ? (
          <Text className="mt-2 text-base leading-6 text-gray-600">
            {opportunity.description}
          </Text>
        ) : null}

        <View className="mt-4">
          <InfoRow
            icon="business-outline"
            label="Órgão"
            value={opportunity.agency}
          />
          <InfoRow icon="key-outline" label="UASG" value={opportunity.uasg} />
          <InfoRow
            icon="calendar-outline"
            label="Abertura das propostas"
            value={formatDateTime(opportunity.opening_date)}
          />
          <InfoRow
            icon="time-outline"
            label="Prazo final das propostas"
            value={formatDateTime(opportunity.proposal_deadline)}
          />
          <InfoRow
            icon="cash-outline"
            label="Valor estimado"
            value={formatCurrency(opportunity.estimated_value)}
          />
          <InfoRow
            icon="location-outline"
            label="UF"
            value={opportunity.uf}
          />
          <InfoRow
            icon="document-text-outline"
            label="Identificador"
            value={opportunity.external_id}
          />
        </View>

        <View className="mt-6 gap-3">
          <Button title="Abrir edital original" onPress={handleOpenEdital} />
          <Button
            title="Compartilhar"
            variant="secondary"
            onPress={handleShare}
          />
        </View>
      </ScrollView>

      {/* FAB Monitorar (RF07) */}
      <Pressable
        className="absolute bottom-8 right-5 h-14 flex-row items-center gap-2 rounded-full bg-blue-600 px-5 shadow-lg active:bg-blue-700"
        disabled={createProcess.isPending}
        onPress={() => createProcess.mutate(opportunity)}
      >
        {createProcess.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="bookmark-outline" size={20} color="#fff" />
        )}
        <Text className="text-base font-semibold text-white">Monitorar</Text>
      </Pressable>
    </SafeAreaView>
  );
}
