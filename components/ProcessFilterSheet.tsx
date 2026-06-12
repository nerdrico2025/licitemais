import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ProcessStatus } from "../types/process";
import type { ProcessFilters } from "../types/processFilters";
import { ALL_STATUSES, STATUS_LABELS } from "../lib/processStatus";
import { Button } from "./ui/Button";

interface ProcessFilterSheetProps {
  visible: boolean;
  filters: ProcessFilters;
  onClose: () => void;
  onApply: (filters: ProcessFilters) => void;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-full border px-3 py-1.5 ${
        selected ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
      }`}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-medium ${selected ? "text-white" : "text-gray-700"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-5 text-sm font-semibold text-gray-900">
      {children}
    </Text>
  );
}

export function ProcessFilterSheet({
  visible,
  filters,
  onClose,
  onApply,
}: ProcessFilterSheetProps) {
  const [statuses, setStatuses] = useState<ProcessStatus[]>(filters.statuses ?? []);
  const [valorMin, setValorMin] = useState(
    filters.valorMin != null ? String(filters.valorMin) : "",
  );
  const [valorMax, setValorMax] = useState(
    filters.valorMax != null ? String(filters.valorMax) : "",
  );
  const [dataInicio, setDataInicio] = useState(filters.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(filters.dataFim ?? "");

  function toggleStatus(status: ProcessStatus) {
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((s) => s !== status)
        : [...current, status],
    );
  }

  function handleApply() {
    onApply({
      statuses: statuses.length > 0 ? statuses : undefined,
      valorMin: valorMin ? Number(valorMin) : undefined,
      valorMax: valorMax ? Number(valorMax) : undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    });
    onClose();
  }

  function handleClear() {
    setStatuses([]);
    setValorMin("");
    setValorMax("");
    setDataInicio("");
    setDataFim("");
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white px-6 pb-8 pt-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">Filtros</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <SectionLabel>Status</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {ALL_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={STATUS_LABELS[status]}
                  selected={statuses.includes(status)}
                  onPress={() => toggleStatus(status)}
                />
              ))}
            </View>

            <SectionLabel>Faixa de valor estimado (R$)</SectionLabel>
            <View className="flex-row gap-3">
              <TextInput
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base"
                placeholder="Mínimo"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={valorMin}
                onChangeText={setValorMin}
              />
              <TextInput
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base"
                placeholder="Máximo"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={valorMax}
                onChangeText={setValorMax}
              />
            </View>

            <SectionLabel>Data de abertura</SectionLabel>
            <View className="flex-row gap-3">
              <TextInput
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base"
                placeholder="Início (AAAA-MM-DD)"
                placeholderTextColor="#9ca3af"
                value={dataInicio}
                onChangeText={setDataInicio}
              />
              <TextInput
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base"
                placeholder="Fim (AAAA-MM-DD)"
                placeholderTextColor="#9ca3af"
                value={dataFim}
                onChangeText={setDataFim}
              />
            </View>

            <View className="mt-8 gap-3">
              <Button title="Aplicar filtros" onPress={handleApply} />
              <Button
                title="Limpar filtros"
                variant="secondary"
                onPress={handleClear}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
