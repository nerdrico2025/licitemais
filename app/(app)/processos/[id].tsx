import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { processQueryKey, useProcess } from "../../../hooks/useProcess";
import { useUpdateProcess } from "../../../hooks/useUpdateProcess";
import { supabase } from "../../../services/supabase";
import { showError } from "../../../lib/toast";
import { formatDate, formatDateTime } from "../../../lib/format";
import {
  CHECKLIST_TYPE_BADGE_CLASSES,
  CHECKLIST_TYPE_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "../../../lib/processStatus";
import type { UserProcessWithOpportunity } from "../../../types/process";
import { Skeleton } from "../../../components/ui/Skeleton";
import { Button } from "../../../components/ui/Button";

type TabKey = "resumo" | "notas";

const CHECKLIST_SAVE_DELAY = 800;
const NOTES_SAVE_DELAY = 1000;

function friendlyDate(value: string | undefined): string {
  if (!value) return "Não informado";
  return formatDateTime(value) ?? formatDate(value) ?? value;
}

function ResumoSkeleton() {
  return (
    <View className="px-4 pt-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-20 w-full" />
      <Skeleton className="mt-6 h-4 w-32" />
      <Skeleton className="mt-3 h-12 w-full" />
      <Skeleton className="mt-2 h-12 w-full" />
      <Skeleton className="mt-6 h-4 w-32" />
      <Skeleton className="mt-3 h-10 w-full" />
      <Skeleton className="mt-2 h-10 w-full" />
      <Skeleton className="mt-2 h-10 w-full" />
    </View>
  );
}

export default function ProcessoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: process, isLoading, isError, error, refetch } = useProcess(id);
  const updateProcess = useUpdateProcess();

  const [activeTab, setActiveTab] = useState<TabKey>("resumo");
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [retrying, setRetrying] = useState(false);

  const checklistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (process) {
      setChecklistState(process.checklist_state ?? {});
      setNotes(process.notes ?? "");
    }
  }, [process?.id, process?.checklist_state, process?.notes]);

  useEffect(() => {
    return () => {
      if (checklistTimeout.current) clearTimeout(checklistTimeout.current);
      if (notesTimeout.current) clearTimeout(notesTimeout.current);
    };
  }, []);

  function toggleChecklistItem(itemId: string) {
    if (!process) return;

    const next = { ...checklistState, [itemId]: !checklistState[itemId] };
    setChecklistState(next);

    if (checklistTimeout.current) clearTimeout(checklistTimeout.current);
    checklistTimeout.current = setTimeout(() => {
      updateProcess.mutate({ id: process.id, checklist_state: next });
    }, CHECKLIST_SAVE_DELAY);
  }

  function handleNotesChange(value: string) {
    if (!process) return;

    setNotes(value);

    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(() => {
      updateProcess.mutate({ id: process.id, notes: value });
    }, NOTES_SAVE_DELAY);
  }

  async function handleRetry() {
    if (!process) return;

    setRetrying(true);

    queryClient.setQueryData<UserProcessWithOpportunity | undefined>(
      processQueryKey(process.id),
      (current) => (current ? { ...current, status: "ANALYZING" } : current),
    );

    try {
      const { error: invokeError } = await supabase.functions.invoke("analyze-edital", {
        body: { processId: process.id },
      });

      if (invokeError) {
        throw new Error("Não foi possível reanalisar o edital. Tente novamente.");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Não foi possível reanalisar o edital.");
      queryClient.invalidateQueries({ queryKey: processQueryKey(process.id) });
    } finally {
      setRetrying(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ResumoSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !process) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
          <Text className="mt-3 text-center text-base text-gray-600">
            {error instanceof Error
              ? error.message
              : "Não foi possível carregar este processo."}
          </Text>
          <View className="mt-5 w-40">
            <Button title="Tentar novamente" onPress={() => refetch()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const opportunity = process.opportunity;
  const summary = process.ai_summary;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-4 py-3">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-gray-900" numberOfLines={1}>
          {opportunity?.title ?? "Meu processo"}
        </Text>
      </View>

      <View className="flex-row items-center gap-2 px-4 pt-3">
        <View className={`self-start rounded-full px-2.5 py-0.5 ${STATUS_BADGE_CLASSES[process.status]}`}>
          <Text className="text-xs font-semibold">{STATUS_LABELS[process.status]}</Text>
        </View>
        {opportunity?.agency ? (
          <Text className="flex-1 text-xs text-gray-500" numberOfLines={1}>
            {opportunity.agency}
          </Text>
        ) : null}
      </View>

      <View className="mt-3 flex-row border-b border-gray-100 px-4">
        <Pressable
          className={`mr-6 border-b-2 pb-2 ${activeTab === "resumo" ? "border-blue-600" : "border-transparent"}`}
          onPress={() => setActiveTab("resumo")}
        >
          <Text
            className={`text-sm font-semibold ${
              activeTab === "resumo" ? "text-blue-600" : "text-gray-500"
            }`}
          >
            Resumo IA
          </Text>
        </Pressable>
        <Pressable
          className={`border-b-2 pb-2 ${activeTab === "notas" ? "border-blue-600" : "border-transparent"}`}
          onPress={() => setActiveTab("notas")}
        >
          <Text
            className={`text-sm font-semibold ${
              activeTab === "notas" ? "text-blue-600" : "text-gray-500"
            }`}
          >
            Notas
          </Text>
        </Pressable>
      </View>

      {activeTab === "resumo" ? (
        process.status === "ANALYZING" || retrying ? (
          <ResumoSkeleton />
        ) : process.status === "ERROR" ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="warning-outline" size={48} color="#ef4444" />
            <Text className="mt-3 text-center text-base text-gray-700">
              Não foi possível analisar este edital com a IA.
            </Text>
            <View className="mt-5 w-48">
              <Button title="Tentar novamente" onPress={handleRetry} />
            </View>
          </View>
        ) : !summary ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
            <Text className="mt-3 text-center text-base text-gray-600">
              Este processo ainda não tem um resumo gerado pela IA.
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1 px-4" contentContainerClassName="pb-32 pt-4">
            <Text className="text-sm font-semibold uppercase text-gray-400">
              Objeto simplificado
            </Text>
            <Text className="mt-2 text-base leading-6 text-gray-900">
              {summary.objectSimplified}
            </Text>

            <Text className="mt-6 text-sm font-semibold uppercase text-gray-400">
              Datas importantes
            </Text>
            <View className="mt-2 gap-2">
              <View className="flex-row items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                <Ionicons name="document-text-outline" size={18} color="#6b7280" />
                <View className="flex-1">
                  <Text className="text-xs text-gray-400">Entrega da proposta</Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {friendlyDate(summary.importantDates?.proposalDelivery)}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
                <Ionicons name="hammer-outline" size={18} color="#6b7280" />
                <View className="flex-1">
                  <Text className="text-xs text-gray-400">Início da sessão pública</Text>
                  <Text className="text-sm font-medium text-gray-900">
                    {friendlyDate(summary.importantDates?.auctionStart)}
                  </Text>
                </View>
              </View>
            </View>

            {summary.requirements?.length > 0 ? (
              <>
                <Text className="mt-6 text-sm font-semibold uppercase text-gray-400">
                  Requisitos
                </Text>
                <View className="mt-2 gap-1.5">
                  {summary.requirements.map((requirement, index) => (
                    <View key={index} className="flex-row items-start gap-2">
                      <Ionicons name="ellipse" size={6} color="#9ca3af" style={{ marginTop: 7 }} />
                      <Text className="flex-1 text-sm leading-5 text-gray-700">
                        {requirement}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {summary.documentsChecklist?.length > 0 ? (
              <>
                <Text className="mt-6 text-sm font-semibold uppercase text-gray-400">
                  Checklist de documentos
                </Text>
                <View className="mt-2 gap-2">
                  {summary.documentsChecklist.map((item) => {
                    const checked = !!checklistState[item.id];
                    return (
                      <Pressable
                        key={item.id}
                        className="flex-row items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 active:bg-gray-100"
                        onPress={() => toggleChecklistItem(item.id)}
                      >
                        <Ionicons
                          name={checked ? "checkbox" : "square-outline"}
                          size={20}
                          color={checked ? "#2563eb" : "#9ca3af"}
                        />
                        <View className="flex-1">
                          <Text
                            className={`text-sm ${checked ? "text-gray-400 line-through" : "text-gray-900"}`}
                          >
                            {item.item}
                          </Text>
                          <View
                            className={`mt-1.5 self-start rounded-full px-2 py-0.5 ${CHECKLIST_TYPE_BADGE_CLASSES[item.type] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            <Text className="text-xs font-semibold">
                              {CHECKLIST_TYPE_LABELS[item.type] ?? item.type}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </ScrollView>
        )
      ) : (
        <View className="flex-1 px-4 pt-4">
          <Text className="text-sm font-semibold uppercase text-gray-400">
            Notas
          </Text>
          <TextInput
            className="mt-2 flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3 text-base text-gray-900"
            placeholder="Anote observações sobre este processo..."
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={handleNotesChange}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
