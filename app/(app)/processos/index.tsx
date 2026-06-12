import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useProcesses } from "../../../hooks/useProcesses";
import { applyProcessFilters, countActiveFilters } from "../../../lib/processFilters";
import type { ProcessFilters } from "../../../types/processFilters";
import { KanbanBoard } from "../../../components/KanbanBoard";
import { ProcessListItem, ProcessListItemSkeleton } from "../../../components/ProcessListItem";
import { ProcessCardSkeleton } from "../../../components/ProcessCard";
import { ProcessFilterSheet } from "../../../components/ProcessFilterSheet";
import { Button } from "../../../components/ui/Button";

type ViewMode = "lista" | "kanban";

export default function ProcessosScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<ProcessFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError, error, refetch } = useProcesses();

  const processes = useMemo(
    () => applyProcessFilters(data ?? [], filters),
    [data, filters],
  );

  const activeFilterCount = countActiveFilters(filters);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold text-gray-900">Minhas Licitações</Text>

        <View className="flex-row items-center gap-2">
          <View className="flex-row rounded-xl border border-gray-300 bg-white p-1">
            <Pressable
              className={`rounded-lg px-3 py-1.5 ${viewMode === "lista" ? "bg-blue-600" : ""}`}
              onPress={() => setViewMode("lista")}
            >
              <Text
                className={`text-sm font-semibold ${
                  viewMode === "lista" ? "text-white" : "text-gray-600"
                }`}
              >
                Lista
              </Text>
            </Pressable>
            <Pressable
              className={`rounded-lg px-3 py-1.5 ${viewMode === "kanban" ? "bg-blue-600" : ""}`}
              onPress={() => setViewMode("kanban")}
            >
              <Text
                className={`text-sm font-semibold ${
                  viewMode === "kanban" ? "text-white" : "text-gray-600"
                }`}
              >
                Kanban
              </Text>
            </Pressable>
          </View>

          <Pressable
            className="items-center justify-center rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 active:bg-gray-100"
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={20} color="#374151" />
            {activeFilterCount > 0 ? (
              <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-xs font-bold text-white">{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        viewMode === "kanban" ? (
          <View className="flex-row gap-3 px-4 pt-2">
            <ProcessCardSkeleton />
            <ProcessCardSkeleton />
          </View>
        ) : (
          <View className="px-4 pt-2">
            <ProcessListItemSkeleton />
            <ProcessListItemSkeleton />
            <ProcessListItemSkeleton />
          </View>
        )
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
          <Text className="mt-3 text-center text-base text-gray-600">
            {error instanceof Error
              ? error.message
              : "Não foi possível carregar seus processos."}
          </Text>
          <View className="mt-5 w-40">
            <Button title="Tentar novamente" onPress={() => refetch()} />
          </View>
        </View>
      ) : processes.length === 0 ? (
        <View className="flex-1 items-center px-8 pt-20">
          <Ionicons name="file-tray-outline" size={48} color="#9ca3af" />
          <Text className="mt-3 text-center text-lg font-semibold text-gray-700">
            Nenhum processo encontrado
          </Text>
          <Text className="mt-1 text-center text-sm text-gray-500">
            Monitore licitações na busca para acompanhá-las aqui.
          </Text>
        </View>
      ) : viewMode === "kanban" ? (
        <KanbanBoard processes={processes} />
      ) : (
        <FlatList
          data={processes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProcessListItem process={item} />}
          contentContainerClassName="px-4 pb-8 pt-2"
        />
      )}

      <ProcessFilterSheet
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}
