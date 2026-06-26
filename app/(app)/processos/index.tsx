import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { KanbanBoard } from "../../../components/KanbanBoard";
import { ProcessListSkeleton } from "../../../components/ProcessCardSkeleton";
import { ProcessStatusBadge } from "../../../components/ProcessStatusBadge";
import { Button } from "../../../components/ui/Button";
import { Chip } from "../../../components/ui/Chip";
import { Input } from "../../../components/ui/Input";
import { useProcesses } from "../../../hooks/useProcesses";
import { formatDate } from "../../../lib/format";
import { STATUS_META } from "../../../lib/processStatus";
import type { ProcessStatus, UserProcess } from "../../../types/process";

type ViewMode = "list" | "kanban";

const STATUS_ORDER: ProcessStatus[] = [
  "SAVED",
  "ANALYZING",
  "DOCS_PENDING",
  "READY_TO_BID",
  "SUBMITTED",
  "WON",
  "LOST",
];

type ProcessFilters = {
  statuses: ProcessStatus[];
  valorMin?: number;
  valorMax?: number;
  /** YYYY-MM-DD — filtra pela data de abertura da licitação. */
  dataInicio?: string;
  dataFim?: string;
};

const EMPTY_FILTERS: ProcessFilters = { statuses: [] };

function countFilters(f: ProcessFilters): number {
  return (
    f.statuses.length +
    (f.valorMin != null ? 1 : 0) +
    (f.valorMax != null ? 1 : 0) +
    (f.dataInicio ? 1 : 0) +
    (f.dataFim ? 1 : 0)
  );
}

function applyFilters(processes: UserProcess[], f: ProcessFilters): UserProcess[] {
  return processes.filter((p) => {
    if (f.statuses.length > 0 && !f.statuses.includes(p.status)) return false;

    const opp = p.bidding_opportunities;
    const value = opp?.estimated_value ?? null;
    if (f.valorMin != null && (value == null || value < f.valorMin)) return false;
    if (f.valorMax != null && (value == null || value > f.valorMax)) return false;

    const opening = opp?.opening_date ? new Date(opp.opening_date) : null;
    if (f.dataInicio) {
      const from = new Date(f.dataInicio);
      if (!opening || opening < from) return false;
    }
    if (f.dataFim) {
      const to = new Date(`${f.dataFim}T23:59:59`);
      if (!opening || opening > to) return false;
    }
    return true;
  });
}

function toPositiveNumber(text: string): number | undefined {
  const n = Number(text.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// ---------------------------------------------------------------------------
// Filtro (RF18)
// ---------------------------------------------------------------------------

function ProcessFilterSheet({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: ProcessFilters;
  onClose: () => void;
  onApply: (f: ProcessFilters) => void;
}) {
  const [draft, setDraft] = useState<ProcessFilters>(value);

  // Reabre sempre sincronizado com o filtro vigente.
  const reset = () => setDraft(value);

  const toggleStatus = (status: ProcessStatus) =>
    setDraft((d) => ({
      ...d,
      statuses: d.statuses.includes(status)
        ? d.statuses.filter((s) => s !== status)
        : [...d.statuses, status],
    }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={reset}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="max-h-[85%] gap-4 rounded-t-3xl bg-white px-5 pb-8 pt-4" onPress={() => {}}>
          <View className="h-1 w-10 self-center rounded-full bg-slate-200" />
          <Text className="text-lg font-bold text-slate-900">Filtrar processos</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-5">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-slate-700">Status</Text>
              <View className="flex-row flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <Chip
                    key={s}
                    label={STATUS_META[s].label}
                    selected={draft.statuses.includes(s)}
                    onPress={() => toggleStatus(s)}
                  />
                ))}
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Valor mín. (R$)"
                  keyboardType="numeric"
                  defaultValue={draft.valorMin?.toString()}
                  onChangeText={(t) => setDraft((d) => ({ ...d, valorMin: toPositiveNumber(t) }))}
                  placeholder="0"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Valor máx. (R$)"
                  keyboardType="numeric"
                  defaultValue={draft.valorMax?.toString()}
                  onChangeText={(t) => setDraft((d) => ({ ...d, valorMax: toPositiveNumber(t) }))}
                  placeholder="—"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Abertura de"
                  defaultValue={draft.dataInicio}
                  onChangeText={(t) => setDraft((d) => ({ ...d, dataInicio: t || undefined }))}
                  placeholder="AAAA-MM-DD"
                  autoCapitalize="none"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Abertura até"
                  defaultValue={draft.dataFim}
                  onChangeText={(t) => setDraft((d) => ({ ...d, dataFim: t || undefined }))}
                  placeholder="AAAA-MM-DD"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </ScrollView>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button title="Limpar" variant="secondary" onPress={() => setDraft(EMPTY_FILTERS)} />
            </View>
            <View className="flex-1">
              <Button
                title="Aplicar"
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Card da visão Lista
// ---------------------------------------------------------------------------

function ProcessListCard({ process }: { process: UserProcess }) {
  const opp = process.bidding_opportunities;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({ pathname: "/(app)/processos/[id]", params: { id: process.id } })
      }
      className="gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 active:bg-slate-50"
    >
      <View className="flex-row items-center justify-between gap-2">
        <ProcessStatusBadge status={process.status} />
        <Text className="text-xs text-slate-400">{formatDate(opp?.opening_date)}</Text>
      </View>
      <Text className="text-base font-semibold leading-6 text-slate-900" numberOfLines={2}>
        {opp?.title ?? "Licitação"}
      </Text>
      {opp?.agency ? (
        <Text className="text-sm text-slate-500" numberOfLines={1}>
          {opp.agency}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Tela (RF13)
// ---------------------------------------------------------------------------

export default function Processos() {
  const { data, isLoading, isError, refetch, isRefetching } = useProcesses();
  const [mode, setMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<ProcessFilters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const processes = useMemo(() => applyFilters(data ?? [], filters), [data, filters]);
  const activeFilters = countFilters(filters);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="gap-3 border-b border-slate-100 px-4 py-3">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </Pressable>
          <Text className="flex-1 text-lg font-semibold text-slate-900">Minhas Licitações</Text>
          <Pressable
            onPress={() => setFilterOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            className="flex-row items-center gap-1.5"
          >
            <Ionicons name="options-outline" size={22} color="#0f172a" />
            {activeFilters > 0 ? (
              <View className="min-w-5 items-center rounded-full bg-blue-600 px-1.5">
                <Text className="text-xs font-bold text-white">{activeFilters}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Toggle Lista <-> Kanban */}
        <View className="flex-row self-start rounded-xl bg-slate-100 p-1">
          {(["list", "kanban"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === m }}
              className={`flex-row items-center gap-1.5 rounded-lg px-4 py-1.5 ${
                mode === m ? "bg-white shadow-sm" : ""
              }`}
            >
              <Ionicons
                name={m === "list" ? "list-outline" : "grid-outline"}
                size={16}
                color={mode === m ? "#0f172a" : "#94a3b8"}
              />
              <Text
                className={`text-sm font-semibold ${
                  mode === m ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {m === "list" ? "Lista" : "Kanban"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Conteúdo */}
      {isLoading ? (
        <ProcessListSkeleton />
      ) : isError ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
          <Text className="text-center text-base text-slate-600">
            Não foi possível carregar seus processos.
          </Text>
          <Pressable
            onPress={() => refetch()}
            accessibilityRole="button"
            className="rounded-xl bg-slate-900 px-5 py-3"
          >
            <Text className="text-sm font-semibold text-white">Tentar novamente</Text>
          </Pressable>
        </View>
      ) : mode === "kanban" ? (
        <View className="flex-1">
          <KanbanBoard processes={processes} />
        </View>
      ) : (
        <FlatList
          data={processes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProcessListCard process={item} />}
          contentContainerClassName="px-4 py-4 gap-3"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
          }
          ListEmptyComponent={
            <View className="mt-24 items-center gap-3 px-8">
              <Ionicons name="bookmark-outline" size={40} color="#94a3b8" />
              <Text className="text-center text-base text-slate-600">
                {activeFilters > 0
                  ? "Nenhum processo corresponde aos filtros."
                  : "Você ainda não monitora nenhuma licitação."}
              </Text>
              {activeFilters > 0 ? (
                <Pressable
                  onPress={() => setFilters(EMPTY_FILTERS)}
                  accessibilityRole="button"
                  className="rounded-xl bg-slate-900 px-5 py-3"
                >
                  <Text className="text-sm font-semibold text-white">Limpar filtros</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push("/(app)/buscar")}
                  accessibilityRole="button"
                  className="rounded-xl bg-blue-600 px-5 py-3"
                >
                  <Text className="text-sm font-semibold text-white">Buscar licitações</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      <ProcessFilterSheet
        visible={filterOpen}
        value={filters}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}
