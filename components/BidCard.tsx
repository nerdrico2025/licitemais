import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { BiddingOpportunity } from "../types/opportunity";
import { formatCurrency, formatDateTime } from "../lib/format";

interface BidCardProps {
  opportunity: BiddingOpportunity;
}

export function BidCard({ opportunity }: BidCardProps) {
  const router = useRouter();
  const value = formatCurrency(opportunity.estimated_value);
  const openingDate = formatDateTime(opportunity.opening_date);

  return (
    <Pressable
      className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 active:bg-gray-50"
      onPress={() =>
        router.push({
          pathname: "/(app)/detalhes/[id]",
          params: { id: opportunity.external_id },
        })
      }
    >
      {opportunity.bidding_mode ? (
        <View className="mb-2 self-start rounded-full bg-blue-100 px-2.5 py-0.5">
          <Text className="text-xs font-semibold text-blue-700">
            {opportunity.bidding_mode}
          </Text>
        </View>
      ) : null}

      <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
        {opportunity.title}
      </Text>

      {opportunity.agency ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="business-outline" size={14} color="#6b7280" />
          <Text className="flex-1 text-sm text-gray-500" numberOfLines={1}>
            {opportunity.agency}
          </Text>
        </View>
      ) : null}

      <View className="mt-3 flex-row items-center justify-between">
        {openingDate ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-600">{openingDate}</Text>
          </View>
        ) : (
          <View />
        )}

        {value ? (
          <Text className="text-sm font-bold text-green-700">{value}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function BidCardSkeleton() {
  return (
    <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="mb-2 h-5 w-28 rounded-full bg-gray-200" />
      <View className="h-4 w-full rounded bg-gray-200" />
      <View className="mt-1.5 h-4 w-3/4 rounded bg-gray-200" />
      <View className="mt-3 flex-row justify-between">
        <View className="h-4 w-32 rounded bg-gray-200" />
        <View className="h-4 w-24 rounded bg-gray-200" />
      </View>
    </View>
  );
}
