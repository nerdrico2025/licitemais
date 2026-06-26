import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BidCard, BidCardSkeleton } from "../../../components/BidCard";
import { FilterSheet } from "../../../components/FilterSheet";
import { Button } from "../../../components/ui/Button";
import { CATEGORY_LABELS } from "../../../lib/categories";
import { useOpportunities } from "../../../hooks/useOpportunities";
import type { OpportunityFilters } from "../../../types/opportunity";

// Sugestões de busca (RF UX): termo enviado à API pode diferir do rótulo
// curto exibido no chip (ex.: "TI" -> "tecnologia da informação").
const SEARCH_SUGGESTIONS: { label: string; term: string }[] = [
  { label: "Obras", term: "obras" },
  { label: "TI", term: "tecnologia da informação" },
  { label: "Limpeza", term: "limpeza" },
  { label: "Segurança", term: "segurança" },
  { label: "Saúde", term: "saúde" },
  { label: "Transporte", term: "transporte" },
];

export default function Buscar() {
  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [sheetOpen, setSheetOpen] = useState(false);

  const submitSearch = (term: string) => {
    setKeyword(term);
    setSubmittedKeyword(term.trim());
  };

  const params = useMemo(
    () => ({ ...filters, keyword: submittedKeyword || undefined }),
    [filters, submittedKeyword],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOpportunities(params);

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const activeFilterCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== "",
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      {/* Cabeçalho: busca + filtros */}
      <View className="gap-3 bg-white px-4 pb-4 pt-2">
        <Text className="text-2xl font-bold text-slate-900">Buscar licitações</Text>
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              className="flex-1 py-3 text-base text-slate-900"
              placeholder="Palavra-chave (ex: notebooks)"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              returnKeyType="search"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={() => setSubmittedKeyword(keyword.trim())}
            />
            {keyword ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setKeyword("");
                  setSubmittedKeyword("");
                }}
              >
                <Ionicons name="close-circle" size={18} color="#cbd5e1" />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            className="h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white"
          >
            <Ionicons name="options-outline" size={20} color="#0f172a" />
            {activeFilterCount > 0 ? (
              <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-[10px] font-bold text-white">
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Sugestões de busca: atalho para termos comuns (visível sem termo). */}
        {!submittedKeyword ? (
          <View className="flex-row flex-wrap gap-2">
            {SEARCH_SUGGESTIONS.map(({ label, term }) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                onPress={() => submitSearch(term)}
                className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 active:bg-slate-200"
              >
                <Text className="text-sm font-medium text-slate-700">{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Conteúdo */}
      {isLoading ? (
        <View className="gap-3 px-4 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BidCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Ionicons name="cloud-offline-outline" size={48} color="#94a3b8" />
          <Text className="text-center text-base text-slate-600">
            {error instanceof Error
              ? error.message
              : "Não foi possível carregar as licitações."}
          </Text>
          <View className="w-40">
            <Button title="Tentar novamente" onPress={() => refetch()} />
          </View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.external_id}-${index}`}
          renderItem={({ item }) => <BidCard opportunity={item} />}
          contentContainerClassName="gap-3 px-4 py-4"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            items.length > 0 ? (
              <Text className="pb-1 text-sm font-semibold text-slate-500">
                {submittedKeyword
                  ? `Resultados para "${submittedKeyword}"`
                  : "Licitações recentes"}
                {filters.categoria
                  ? ` · ${CATEGORY_LABELS[filters.categoria]}`
                  : ""}
              </Text>
            ) : null
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View className="mt-24 items-center gap-3 px-8">
              <Ionicons name="search-outline" size={48} color="#94a3b8" />
              <Text className="text-center text-base font-semibold text-slate-700">
                Nenhuma licitação encontrada
              </Text>
              <Text className="text-center text-sm text-slate-500">
                Tente outra palavra-chave ou ajuste os filtros de estado,
                modalidade e período.
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6">
                <ActivityIndicator color="#2563eb" />
              </View>
            ) : null
          }
        />
      )}

      <FilterSheet
        visible={sheetOpen}
        value={filters}
        onClose={() => setSheetOpen(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}
