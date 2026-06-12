import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { OpportunityFilters } from "../types/opportunity";
import { MODALIDADES } from "../types/opportunity";
import { Button } from "./ui/Button";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface FilterSheetProps {
  visible: boolean;
  filters: OpportunityFilters;
  onClose: () => void;
  onApply: (filters: OpportunityFilters) => void;
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

export function FilterSheet({
  visible,
  filters,
  onClose,
  onApply,
}: FilterSheetProps) {
  const [uf, setUf] = useState(filters.uf);
  const [modalidade, setModalidade] = useState(filters.modalidade);
  const [valorMin, setValorMin] = useState(
    filters.valorMin != null ? String(filters.valorMin) : "",
  );
  const [valorMax, setValorMax] = useState(
    filters.valorMax != null ? String(filters.valorMax) : "",
  );
  const [dataInicio, setDataInicio] = useState(filters.dataInicio ?? "");
  const [dataFim, setDataFim] = useState(filters.dataFim ?? "");

  function handleApply() {
    onApply({
      ...filters,
      uf,
      modalidade,
      valorMin: valorMin ? Number(valorMin) : undefined,
      valorMax: valorMax ? Number(valorMax) : undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
    });
    onClose();
  }

  function handleClear() {
    setUf(undefined);
    setModalidade(undefined);
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
            <SectionLabel>Estado (UF)</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {UFS.map((sigla) => (
                <Chip
                  key={sigla}
                  label={sigla}
                  selected={uf === sigla}
                  onPress={() => setUf(uf === sigla ? undefined : sigla)}
                />
              ))}
            </View>

            <SectionLabel>Modalidade</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {Object.entries(MODALIDADES).map(([code, nome]) => (
                <Chip
                  key={code}
                  label={nome}
                  selected={modalidade === Number(code)}
                  onPress={() =>
                    setModalidade(
                      modalidade === Number(code) ? undefined : Number(code),
                    )
                  }
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

            <SectionLabel>Período de publicação</SectionLabel>
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
