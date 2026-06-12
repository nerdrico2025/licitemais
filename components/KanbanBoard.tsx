import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { UserProcessWithOpportunity } from "../types/process";
import { KANBAN_COLUMNS, STATUS_LABELS } from "../lib/processStatus";
import { ProcessCard } from "./ProcessCard";

interface KanbanBoardProps {
  processes: UserProcessWithOpportunity[];
}

export function KanbanBoard({ processes }: KanbanBoardProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-4 py-3 gap-3"
    >
      {KANBAN_COLUMNS.map((status) => {
        const columnProcesses = processes.filter((p) => p.status === status);

        return (
          <View key={status} className="w-64">
            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text className="text-sm font-bold text-gray-900">
                {STATUS_LABELS[status]}
              </Text>
              <View className="rounded-full bg-gray-200 px-2 py-0.5">
                <Text className="text-xs font-semibold text-gray-600">
                  {columnProcesses.length}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {columnProcesses.length === 0 ? (
                <View className="items-center rounded-2xl border border-dashed border-gray-200 px-4 py-8">
                  <Ionicons name="file-tray-outline" size={28} color="#d1d5db" />
                  <Text className="mt-2 text-center text-xs text-gray-400">
                    Nenhum processo aqui
                  </Text>
                </View>
              ) : (
                columnProcesses.map((process) => (
                  <ProcessCard key={process.id} process={process} />
                ))
              )}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}
