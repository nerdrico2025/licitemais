import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { CATEGORY_LABELS } from "../lib/categories";
import { formatCurrency, formatDate } from "../lib/format";
import type { BiddingOpportunity } from "../types/opportunity";

function ModalityBadge({ label }: { label: string }) {
  return (
    <View className="self-start rounded-full bg-blue-50 px-2.5 py-1">
      <Text className="text-xs font-semibold text-blue-700">{label}</Text>
    </View>
  );
}

/** Tema inferido por IA (classify-opportunities). Cor distinta da modalidade. */
function CategoryBadge({ label }: { label: string }) {
  return (
    <View className="self-start rounded-full bg-emerald-50 px-2.5 py-1">
      <Text className="text-xs font-semibold text-emerald-700">{label}</Text>
    </View>
  );
}

/**
 * Indicador de relevância (relevanceScorer). >=60 verde "Alta relevância";
 * 30–59 amarelo "Relevância média"; <30 só um ponto cinza (discreto).
 */
function RelevanceBadge({ score }: { score: number }) {
  if (score >= 60) {
    return (
      <View className="self-start rounded-full bg-green-100 px-2.5 py-1">
        <Text className="text-xs font-semibold text-green-700">Alta relevância</Text>
      </View>
    );
  }
  if (score >= 30) {
    return (
      <View className="self-start rounded-full bg-amber-100 px-2.5 py-1">
        <Text className="text-xs font-semibold text-amber-700">Relevância média</Text>
      </View>
    );
  }
  return (
    <View
      accessibilityLabel="Baixa relevância"
      className="h-2 w-2 self-center rounded-full bg-slate-300"
    />
  );
}

export function BidCard({ opportunity }: { opportunity: BiddingOpportunity }) {
  const openDetails = () =>
    router.push({
      pathname: "/(app)/detalhes/[external_id]",
      // numeroControlePNCP contém "/" (ex.: "...-000192/2026"); sem encode o
      // Expo Router o interpreta como separador de segmento e a rota não casa.
      params: { external_id: encodeURIComponent(opportunity.external_id) },
    });

  return (
    <Pressable
      onPress={openDetails}
      accessibilityRole="button"
      className="gap-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
          {opportunity.bidding_mode ? (
            <ModalityBadge label={opportunity.bidding_mode} />
          ) : null}
          {opportunity.category ? (
            <CategoryBadge label={CATEGORY_LABELS[opportunity.category]} />
          ) : null}
          {opportunity.relevanceScore != null ? (
            <RelevanceBadge score={opportunity.relevanceScore} />
          ) : null}
        </View>
        {opportunity.uf ? (
          <Text className="text-xs font-bold text-slate-400">{opportunity.uf}</Text>
        ) : null}
      </View>

      <Text numberOfLines={2} className="text-base font-semibold text-slate-900">
        {opportunity.title}
      </Text>

      {opportunity.agency ? (
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="business-outline" size={14} color="#64748b" />
          <Text numberOfLines={1} className="flex-1 text-sm text-slate-500">
            {opportunity.agency}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text className="text-sm text-slate-500">
            {formatDate(opportunity.opening_date)}
          </Text>
        </View>
        {opportunity.estimated_value != null ? (
          <Text className="text-sm font-bold text-slate-900">
            {formatCurrency(opportunity.estimated_value)}
          </Text>
        ) : (
          // O valor pode existir, só não veio nesta chamada (ex.: /api/search).
          // É consultado sob demanda na tela de detalhes — não na lista (3G).
          <Text className="text-sm font-medium text-slate-400">A consultar</Text>
        )}
      </View>
    </Pressable>
  );
}

/** Placeholder de carregamento com a mesma silhueta do card. */
export function BidCardSkeleton() {
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="h-5 w-28 rounded-full bg-slate-200" />
      <View className="h-4 w-full rounded bg-slate-200" />
      <View className="h-4 w-2/3 rounded bg-slate-200" />
      <View className="mt-1 h-4 w-1/2 rounded bg-slate-100" />
    </View>
  );
}
