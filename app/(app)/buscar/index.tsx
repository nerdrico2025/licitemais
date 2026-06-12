import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { OpportunityFilters } from "../../../types/opportunity";
import { useOpportunities } from "../../../hooks/useOpportunities";
import { BidCard, BidCardSkeleton } from "../../../components/BidCard";
import { FilterSheet } from "../../../components/FilterSheet";
import { Button } from "../../../components/ui/Button";

export default function BuscarScreen() {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOpportunities(filters);

  const opportunities = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const activeFilterCount = [
    filters.uf,
    filters.modalidade,
    filters.valorMin,
    filters.valorMax,
    filters.dataInicio,
    filters.dataFim,
  ].filter((value) => value != null).length;

  function handleSearch() {
    setFilters((current) => ({
      ...current,
      keyword: searchInput.trim() || undefined,
    }));
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pb-3 pt-2">
        <Text className="mb-3 text-2xl font-bold text-gray-900">
          Buscar licitações
        </Text>

        <View className="flex-row gap-2">
          <View className="flex-1 flex-row items-center rounded-xl border border-gray-300 bg-white px-3">
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              className="flex-1 px-2 py-3 text-base text-gray-900"
              placeholder="Palavra-chave, órgão..."
              placeholderTextColor="#9ca3af"
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchInput ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setSearchInput("");
                  setFilters((current) => ({ ...current, keyword: undefined }));
                }}
              >
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            className="items-center justify-center rounded-xl border border-gray-300 bg-white px-3.5 active:bg-gray-100"
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={20} color="#374151" />
            {activeFilterCount > 0 ? (
              <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-xs font-bold text-white">
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View className="px-4 pt-2">
          <BidCardSkeleton />
          <BidCardSkeleton />
          <BidCardSkeleton />
          <BidCardSkeleton />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={48} color="#9ca3af" />
          <Text className="mt-3 text-center text-base text-gray-600">
            {error instanceof Error
              ? error.message
              : "Não foi possível carregar as licitações."}
          </Text>
          <View className="mt-5 w-40">
            <Button title="Tentar novamente" onPress={() => refetch()} />
          </View>
        </View>
      ) : (
        <FlatList
          data={opportunities}
          keyExtractor={(item) => `${item.source}-${item.external_id}`}
          renderItem={({ item }) => <BidCard opportunity={item} />}
          contentContainerClassName="px-4 pb-8 pt-2"
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center px-8 pt-20">
              <Ionicons name="file-tray-outline" size={48} color="#9ca3af" />
              <Text className="mt-3 text-center text-lg font-semibold text-gray-700">
                Nenhuma licitação encontrada
              </Text>
              <Text className="mt-1 text-center text-sm text-gray-500">
                Tente ajustar a palavra-chave ou os filtros de busca.
              </Text>
            </View>
          }
        />
      )}

      <FilterSheet
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}
