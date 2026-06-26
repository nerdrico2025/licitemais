import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import type { OpportunityFilters } from "../types/opportunity";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Input } from "./ui/Input";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

// Categorias de licitação = codigoModalidadeContratacao do PNCP (Lei 14.133).
// Ids confirmados contra a resposta real de /api/search. Modalidades extintas
// pela 14.133 (Tomada de Preços, Convite) não têm código e ficam de fora.
const CATEGORIAS: { id: number; nome: string }[] = [
  { id: 6, nome: "Pregão Eletrônico" },
  { id: 4, nome: "Concorrência" },
  { id: 8, nome: "Dispensa" },
  { id: 9, nome: "Inexigibilidade" },
  { id: 1, nome: "Leilão" },
  { id: 2, nome: "Diálogo Competitivo" },
];

type Props = {
  visible: boolean;
  value: OpportunityFilters;
  onClose: () => void;
  onApply: (filters: OpportunityFilters) => void;
};

function toPositiveNumber(text: string): number | undefined {
  const n = Number(text.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function FilterSheet({ visible, value, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<OpportunityFilters>(value);

  // Sincroniza o rascunho com os filtros vigentes sempre que reabre.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const patch = (next: Partial<OpportunityFilters>) =>
    setDraft((prev) => ({ ...prev, ...next }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />

      <View
        className="absolute bottom-0 w-full gap-5 rounded-t-3xl bg-white p-6"
        style={{ maxHeight: "85%" }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-900">Filtros</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <Ionicons name="close" size={24} color="#0f172a" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-6"
        >
          {/* UF */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-700">Estado (UF)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 pr-2"
            >
              {UFS.map((uf) => (
                <Chip
                  key={uf}
                  label={uf}
                  selected={draft.uf === uf}
                  onPress={() => patch({ uf: draft.uf === uf ? undefined : uf })}
                />
              ))}
            </ScrollView>
          </View>

          {/* Categoria (modalidade de contratação) */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-700">Categoria</Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIAS.map((c) => (
                <Chip
                  key={c.id}
                  label={c.nome}
                  selected={draft.modalidade === c.id}
                  onPress={() =>
                    patch({
                      modalidade: draft.modalidade === c.id ? undefined : c.id,
                    })
                  }
                />
              ))}
            </View>
          </View>

          {/* Faixa de valor */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-700">
              Faixa de valor (R$)
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  placeholder="Mínimo"
                  keyboardType="numeric"
                  value={draft.valorMin != null ? String(draft.valorMin) : ""}
                  onChangeText={(t) => patch({ valorMin: toPositiveNumber(t) })}
                />
              </View>
              <View className="flex-1">
                <Input
                  placeholder="Máximo"
                  keyboardType="numeric"
                  value={draft.valorMax != null ? String(draft.valorMax) : ""}
                  onChangeText={(t) => patch({ valorMax: toPositiveNumber(t) })}
                />
              </View>
            </View>
          </View>

          {/* Período */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-slate-700">
              Período de publicação
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  placeholder="Início (AAAA-MM-DD)"
                  autoCapitalize="none"
                  value={draft.dataInicio ?? ""}
                  onChangeText={(t) => patch({ dataInicio: t || undefined })}
                />
              </View>
              <View className="flex-1">
                <Input
                  placeholder="Fim (AAAA-MM-DD)"
                  autoCapitalize="none"
                  value={draft.dataFim ?? ""}
                  onChangeText={(t) => patch({ dataFim: t || undefined })}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button
              title="Limpar"
              variant="secondary"
              onPress={() => setDraft({})}
            />
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
      </View>
    </Modal>
  );
}
