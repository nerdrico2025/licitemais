import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCachedOpportunity } from "../../../hooks/useCachedOpportunity";
import { useCreateProcess } from "../../../hooks/useCreateProcess";
import { formatCurrency, formatDateTime } from "../../../lib/format";
import { toastError, toastSuccess } from "../../../lib/toast";
import type { BiddingOpportunity } from "../../../types/opportunity";

/** Reverte o encodeURIComponent feito no BidCard. Idempotente p/ ids sem "%". */
function decodeId(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Abre o edital original — web-compatible (RF06). */
async function openEdital(url: string | null) {
  if (!url) {
    toastError("O edital original não está disponível para esta licitação.");
    return;
  }
  try {
    if (Platform.OS === "web") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      await WebBrowser.openBrowserAsync(url);
    }
  } catch {
    toastError("Não foi possível abrir o edital.");
  }
}

/** Compartilha a licitação — Web Share API na web, Share nativo no mobile (RF08). */
async function shareOpportunity(o: BiddingOpportunity) {
  const message = [o.title, o.agency, o.source_url].filter(Boolean).join("\n");
  try {
    if (Platform.OS === "web") {
      const nav = globalThis.navigator;
      if (nav?.share) {
        await nav.share({ title: o.title, text: message, url: o.source_url ?? undefined });
      } else if (nav?.clipboard) {
        await nav.clipboard.writeText(message);
        toastSuccess("Licitação copiada para a área de transferência.");
      } else {
        toastError("Compartilhamento não suportado neste navegador.");
      }
    } else {
      await Share.share({ message });
    }
  } catch {
    // Usuário cancelou o compartilhamento — silencioso.
  }
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row gap-3 border-b border-slate-100 py-3">
      <Ionicons name={icon} size={18} color="#64748b" style={{ marginTop: 2 }} />
      <View className="flex-1 gap-0.5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </Text>
        <Text className="text-sm text-slate-800">{value}</Text>
      </View>
    </View>
  );
}

export default function Detalhes() {
  const params = useLocalSearchParams<{ external_id: string }>();
  const externalId = decodeId(params.external_id);
  const opportunity = useCachedOpportunity(externalId);
  const monitor = useCreateProcess();

  if (!opportunity) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Header />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="document-outline" size={40} color="#94a3b8" />
          <Text className="text-center text-base text-slate-600">
            Não encontramos os detalhes desta licitação. Volte à busca e abra a
            licitação novamente.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header />

      <ScrollView
        contentContainerClassName="px-4 pb-32 pt-4 gap-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho da licitação */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            {opportunity.bidding_mode ? (
              <View className="self-start rounded-full bg-blue-50 px-2.5 py-1">
                <Text className="text-xs font-semibold text-blue-700">
                  {opportunity.bidding_mode}
                </Text>
              </View>
            ) : null}
            {opportunity.uf ? (
              <View className="self-start rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="text-xs font-bold text-slate-500">
                  {opportunity.uf}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xl font-bold leading-7 text-slate-900">
            {opportunity.title}
          </Text>
          {opportunity.agency ? (
            <Text className="text-sm text-slate-500">{opportunity.agency}</Text>
          ) : null}
        </View>

        {/* Valor em destaque */}
        <View className="rounded-2xl bg-slate-50 px-4 py-3">
          <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Valor estimado
          </Text>
          <Text className="text-2xl font-bold text-slate-900">
            {formatCurrency(opportunity.estimated_value)}
          </Text>
        </View>

        {/* Campos (RF05) */}
        <View>
          <DetailRow
            icon="business-outline"
            label="Órgão"
            value={opportunity.agency ?? "—"}
          />
          <DetailRow
            icon="id-card-outline"
            label="UASG / Unidade"
            value={opportunity.uasg ?? "—"}
          />
          <DetailRow
            icon="calendar-outline"
            label="Abertura das propostas"
            value={formatDateTime(opportunity.opening_date)}
          />
          <DetailRow
            icon="time-outline"
            label="Encerramento das propostas"
            value={formatDateTime(opportunity.proposal_deadline)}
          />
          <DetailRow
            icon="layers-outline"
            label="Modalidade"
            value={opportunity.bidding_mode ?? "—"}
          />
          <DetailRow
            icon="globe-outline"
            label="Fonte"
            value={opportunity.source}
          />
        </View>

        {/* Objeto / texto completo */}
        {opportunity.raw_text ? (
          <View className="gap-1.5">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Objeto
            </Text>
            <Text className="text-sm leading-6 text-slate-700">
              {opportunity.raw_text}
            </Text>
          </View>
        ) : null}

        {/* Ações: abrir edital + compartilhar */}
        <View className="mt-2 gap-3">
          <Pressable
            onPress={() => openEdital(opportunity.source_url)}
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5"
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text className="text-base font-semibold text-white">
              Abrir edital original
            </Text>
          </Pressable>
          <Pressable
            onPress={() => shareOpportunity(opportunity)}
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 rounded-xl border border-slate-300 py-3.5"
          >
            <Ionicons name="share-social-outline" size={18} color="#0f172a" />
            <Text className="text-base font-semibold text-slate-900">
              Compartilhar
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* FAB Monitorar (RF07) */}
      <Pressable
        onPress={() => monitor.mutate(opportunity)}
        disabled={monitor.isPending}
        accessibilityRole="button"
        className="absolute bottom-6 right-5 flex-row items-center gap-2 rounded-full bg-blue-600 px-5 py-4 shadow-lg"
        style={{ opacity: monitor.isPending ? 0.7 : 1 }}
      >
        <Ionicons
          name={monitor.isPending ? "hourglass-outline" : "bookmark-outline"}
          size={20}
          color="#fff"
        />
        <Text className="text-base font-bold text-white">
          {monitor.isPending ? "Monitorando..." : "Monitorar"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View className="flex-row items-center gap-3 border-b border-slate-100 px-4 py-3">
      <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </Pressable>
      <Text className="text-lg font-semibold text-slate-900">Detalhes</Text>
    </View>
  );
}
