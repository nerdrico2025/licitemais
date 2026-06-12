import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import type { UserProcessWithOpportunity } from "../types/process";
import { formatDateTime } from "../lib/format";
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from "../lib/processStatus";
import { useProcessStatusActions } from "../hooks/useProcessStatusActions";
import { ActionSheet } from "./ui/ActionSheet";
import { Skeleton } from "./ui/Skeleton";

interface ProcessCardProps {
  process: UserProcessWithOpportunity;
}

export function ProcessCard({ process }: ProcessCardProps) {
  const router = useRouter();
  const { statusOptions, showActions, setShowActions, handleSelectStatus } =
    useProcessStatusActions(process.id, process.status);

  const opportunity = process.opportunity;
  const openingDate = formatDateTime(opportunity?.opening_date);

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
          className="mb-3 w-64 rounded-2xl border border-gray-200 bg-white p-3 active:bg-gray-50"
          onPress={() =>
            router.push({
              pathname: "/(app)/processos/[id]",
              params: { id: process.id },
            })
          }
          onLongPress={() => setShowActions(true)}
        >
          <View
            className={`mb-2 self-start rounded-full px-2.5 py-0.5 ${STATUS_BADGE_CLASSES[process.status]}`}
          >
            <Text className="text-xs font-semibold">
              {STATUS_LABELS[process.status]}
            </Text>
          </View>

          <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>
            {opportunity?.title ?? "Licitação"}
          </Text>

          {opportunity?.agency ? (
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Ionicons name="business-outline" size={13} color="#6b7280" />
              <Text className="flex-1 text-xs text-gray-500" numberOfLines={1}>
                {opportunity.agency}
              </Text>
            </View>
          ) : null}

          {openingDate ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              <Ionicons name="calendar-outline" size={13} color="#6b7280" />
              <Text className="text-xs text-gray-500">{openingDate}</Text>
            </View>
          ) : null}

          {checklistTotal > 0 ? (
            <View className="mt-2 flex-row items-center gap-1.5">
              <Ionicons name="checkbox-outline" size={13} color="#6b7280" />
              <Text className="text-xs font-medium text-gray-600">
                {checklistDone}/{checklistTotal} documentos
              </Text>
            </View>
          ) : null}
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

export function ProcessCardSkeleton() {
  return (
    <View className="mb-3 w-64 rounded-2xl border border-gray-200 bg-white p-3">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3.5 w-32" />
      <Skeleton className="mt-1 h-3.5 w-24" />
    </View>
  );
}
