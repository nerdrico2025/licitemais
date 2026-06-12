import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import type { UserProcessWithOpportunity } from "../types/process";
import { formatCurrency, formatDateTime } from "../lib/format";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "../lib/processStatus";
import { useProcessStatusActions } from "../hooks/useProcessStatusActions";
import { ActionSheet } from "./ui/ActionSheet";
import { Skeleton } from "./ui/Skeleton";

interface ProcessListItemProps {
  process: UserProcessWithOpportunity;
}

export function ProcessListItem({ process }: ProcessListItemProps) {
  const router = useRouter();
  const { statusOptions, showActions, setShowActions, handleSelectStatus } =
    useProcessStatusActions(process.id, process.status);

  const opportunity = process.opportunity;
  const openingDate = formatDateTime(opportunity?.opening_date);
  const value = formatCurrency(opportunity?.estimated_value);

  const checklist = process.ai_summary?.documentsChecklist;
  const checklistTotal = checklist?.length ?? 0;
  const checklistDone = checklist
    ? checklist.filter((item) => process.checklist_state?.[item.id]).length
    : 0;

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        layout={Layout.duration(200)}
      >
        <Pressable
          className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 active:bg-gray-50"
          onPress={() =>
            router.push({
              pathname: "/(app)/processos/[id]",
              params: { id: process.id },
            })
          }
          onLongPress={() => setShowActions(true)}
        >
          <View className="flex-row items-start justify-between gap-2">
            <Text
              className="flex-1 text-base font-semibold text-gray-900"
              numberOfLines={2}
            >
              {opportunity?.title ?? "Licitação"}
            </Text>
            <View className={`rounded-full px-2.5 py-0.5 ${STATUS_BADGE_CLASSES[process.status]}`}>
              <Text className="text-xs font-semibold">
                {STATUS_LABELS[process.status]}
              </Text>
            </View>
          </View>

          {opportunity?.agency ? (
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Ionicons name="business-outline" size={14} color="#6b7280" />
              <Text className="flex-1 text-sm text-gray-500" numberOfLines={1}>
                {opportunity.agency}
              </Text>
            </View>
          ) : null}

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              {openingDate ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                  <Text className="text-sm text-gray-600">{openingDate}</Text>
                </View>
              ) : null}

              {checklistTotal > 0 ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkbox-outline" size={14} color="#6b7280" />
                  <Text className="text-sm font-medium text-gray-600">
                    {checklistDone}/{checklistTotal}
                  </Text>
                </View>
              ) : null}
            </View>

            {value ? (
              <Text className="text-sm font-bold text-green-700">{value}</Text>
            ) : null}
          </View>
        </Pressable>
      </Animated.View>

      <ActionSheet
        visible={showActions}
        title="Mover para"
        options={statusOptions}
        onSelect={handleSelectStatus}
        onClose={() => setShowActions(false)}
      />
    </>
  );
}

export function ProcessListItemSkeleton() {
  return (
    <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </View>
      <Skeleton className="mt-2 h-3.5 w-1/2" />
      <View className="mt-3 flex-row items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-20" />
      </View>
    </View>
  );
}
