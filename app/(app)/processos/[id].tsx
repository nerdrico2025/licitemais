import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProcessStatusBadge } from "../../../components/ProcessStatusBadge";
import { useProcess } from "../../../hooks/useProcess";
import { useUpdateProcess } from "../../../hooks/useUpdateProcess";
import { formatDateTime } from "../../../lib/format";
import { toastError } from "../../../lib/toast";
import { supabase } from "../../../services/supabase";
import type { AiSummary, ChecklistState, UserProcess } from "../../../types/process";

const CHECKLIST_DEBOUNCE_MS = 500;
const NOTES_DEBOUNCE_MS = 800;

type Tab = "resumo" | "notas";

function Header() {
  return (
    <View className="flex-row items-center gap-3 border-b border-slate-100 px-4 py-3">
      <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
        <Ionicons name="arrow-back" size={24} color="#0f172a" />
      </Pressable>
      <Text className="text-lg font-semibold text-slate-900">Processo</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </Text>
  );
}

/** Skeleton exibido enquanto a IA processa o edital (status ANALYZING). */
function SummarySkeleton() {
  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-3 rounded-2xl bg-blue-50 px-4 py-4">
        <ActivityIndicator color="#2563eb" />
        <Text className="flex-1 text-sm text-blue-800">
          Analisando o edital com IA. Isso leva alguns instantes…
        </Text>
      </View>
      <View className="gap-2">
        <View className="h-3 w-24 rounded bg-slate-200" />
        <View className="h-4 w-full rounded bg-slate-200" />
        <View className="h-4 w-3/4 rounded bg-slate-200" />
      </View>
      <View className="flex-row gap-3">
        <View className="h-16 flex-1 rounded-2xl bg-slate-100" />
        <View className="h-16 flex-1 rounded-2xl bg-slate-100" />
      </View>
      <View className="gap-3">
        {[0, 1, 2].map((i) => (
          <View key={i} className="h-5 w-full rounded bg-slate-100" />
        ))}
      </View>
    </View>
  );
}

function ChecklistRow({
  item,
  checked,
  onToggle,
}: {
  item: AiSummary["documentsChecklist"][number];
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-center gap-3 border-b border-slate-100 py-3"
    >
      <Ionicons
        name={checked ? "checkbox" : "square-outline"}
        size={22}
        color={checked ? "#2563eb" : "#94a3b8"}
      />
      <View className="flex-1 gap-0.5">
        <Text className="text-sm text-slate-800">{item.item}</Text>
        <Text className="text-xs text-slate-400">{item.type}</Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Aba: Resumo IA (RF11 / RF12 / RF16)
// ---------------------------------------------------------------------------

function ResumoTab({ process }: { process: UserProcess }) {
  const update = useUpdateProcess();
  const summary = process.ai_summary;

  // Estado local do checklist com persistência debounced (RF16).
  const [checklist, setChecklist] = useState<ChecklistState>(process.checklist_state ?? {});
  const pendingChecklist = useRef(false);
  const checklistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarda o último payload para conseguir dar flush no unmount sem perder edições.
  const flushChecklist = useRef<(() => void) | null>(null);

  // Reconcilia com o servidor (Realtime) quando não há edição local pendente.
  useEffect(() => {
    if (!pendingChecklist.current) setChecklist(process.checklist_state ?? {});
  }, [process.checklist_state]);

  // No unmount (ex.: troca de aba), dá flush de qualquer save pendente.
  useEffect(() => {
    return () => {
      if (checklistTimer.current) {
        clearTimeout(checklistTimer.current);
        flushChecklist.current?.();
      }
    };
  }, []);

  const toggleDoc = (docId: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [docId]: !prev[docId] };
      pendingChecklist.current = true;
      const persist = () =>
        update.mutate(
          { id: process.id, checklist_state: next },
          { onSettled: () => (pendingChecklist.current = false) },
        );
      flushChecklist.current = persist;
      if (checklistTimer.current) clearTimeout(checklistTimer.current);
      checklistTimer.current = setTimeout(persist, CHECKLIST_DEBOUNCE_MS);
      return next;
    });
  };

  const retryAnalysis = async () => {
    try {
      await supabase.from("user_processes").update({ status: "ANALYZING" }).eq("id", process.id);
      await supabase.functions.invoke("analyze-edital", { body: { processId: process.id } });
    } catch {
      toastError("Não foi possível reiniciar a análise. Tente novamente.");
    }
  };

  // Enquanto analisa: skeleton (RF11).
  if (process.status === "ANALYZING") return <SummarySkeleton />;

  // Falha persistente: mensagem + retry (RF12).
  if (process.status === "ERROR" && !summary) {
    return (
      <View className="gap-3 rounded-2xl bg-red-50 px-4 py-5">
        <View className="flex-row items-center gap-2">
          <Ionicons name="alert-circle-outline" size={20} color="#b91c1c" />
          <Text className="flex-1 text-sm text-red-800">
            Não foi possível analisar este edital automaticamente.
          </Text>
        </View>
        <Pressable
          onPress={retryAnalysis}
          accessibilityRole="button"
          className="self-start rounded-xl bg-red-600 px-4 py-2.5"
        >
          <Text className="text-sm font-semibold text-white">Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  // Ainda sem resumo (ex.: status SAVED antes de analisar).
  if (!summary) {
    return (
      <View className="items-center gap-2 py-10">
        <Ionicons name="sparkles-outline" size={32} color="#cbd5e1" />
        <Text className="text-center text-sm text-slate-400">
          A análise por IA aparecerá aqui assim que ficar pronta.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-5">
      <View className="gap-1.5">
        <SectionTitle>Objeto da licitação</SectionTitle>
        <Text className="text-sm leading-6 text-slate-800">{summary.objectSimplified}</Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-1 rounded-2xl bg-slate-50 px-4 py-3">
          <SectionTitle>Entrega da proposta</SectionTitle>
          <Text className="text-sm font-semibold text-slate-900">
            {formatDateTime(summary.importantDates.proposalDelivery)}
          </Text>
        </View>
        <View className="flex-1 gap-1 rounded-2xl bg-slate-50 px-4 py-3">
          <SectionTitle>Início do certame</SectionTitle>
          <Text className="text-sm font-semibold text-slate-900">
            {formatDateTime(summary.importantDates.auctionStart)}
          </Text>
        </View>
      </View>

      {summary.requirements.length > 0 ? (
        <View className="gap-2">
          <SectionTitle>Requisitos impeditivos</SectionTitle>
          {summary.requirements.map((req, i) => (
            <View key={i} className="flex-row gap-2">
              <Ionicons name="warning-outline" size={16} color="#d97706" style={{ marginTop: 2 }} />
              <Text className="flex-1 text-sm leading-6 text-slate-700">{req}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {summary.documentsChecklist.length > 0 ? (
        <View className="gap-1">
          <SectionTitle>Checklist de documentos</SectionTitle>
          {summary.documentsChecklist.map((doc) => (
            <ChecklistRow
              key={doc.id}
              item={doc}
              checked={!!checklist[doc.id]}
              onToggle={() => toggleDoc(doc.id)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Aba: Notas (RF17)
// ---------------------------------------------------------------------------

function NotasTab({ process }: { process: UserProcess }) {
  const update = useUpdateProcess();
  const [notes, setNotes] = useState(process.notes ?? "");
  const pendingNotes = useRef(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushNotes = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!pendingNotes.current) setNotes(process.notes ?? "");
  }, [process.notes]);

  // No unmount (ex.: troca de aba / sair da tela), salva o que estiver pendente.
  useEffect(() => {
    return () => {
      if (notesTimer.current) {
        clearTimeout(notesTimer.current);
        flushNotes.current?.();
      }
    };
  }, []);

  const onChange = (text: string) => {
    setNotes(text);
    pendingNotes.current = true;
    const persist = () =>
      update.mutate(
        { id: process.id, notes: text },
        { onSettled: () => (pendingNotes.current = false) },
      );
    flushNotes.current = persist;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(persist, NOTES_DEBOUNCE_MS);
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <SectionTitle>Suas anotações</SectionTitle>
        {update.isPending ? <Text className="text-xs text-slate-400">Salvando…</Text> : null}
      </View>
      <TextInput
        value={notes}
        onChangeText={onChange}
        placeholder="Escreva observações sobre este processo…"
        placeholderTextColor="#94a3b8"
        multiline
        className="min-h-40 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800"
        textAlignVertical="top"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

const TABS: { key: Tab; label: string }[] = [
  { key: "resumo", label: "Resumo IA" },
  { key: "notas", label: "Notas" },
];

export default function Processo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: process, isLoading, isError } = useProcess(id);
  const [tab, setTab] = useState<Tab>("resumo");

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !process) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Header />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="document-outline" size={40} color="#94a3b8" />
          <Text className="text-center text-base text-slate-600">
            Não encontramos este processo.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const opp = process.bidding_opportunities;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Header />

      {/* Título + status */}
      <View className="gap-2 px-4 pb-3 pt-4">
        <ProcessStatusBadge status={process.status} />
        <Text className="text-xl font-bold leading-7 text-slate-900">
          {opp?.title ?? "Licitação"}
        </Text>
        {opp?.agency ? <Text className="text-sm text-slate-500">{opp.agency}</Text> : null}
      </View>

      {/* Abas */}
      <View className="flex-row border-b border-slate-100 px-4">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`mr-6 border-b-2 pb-2.5 pt-1 ${
                active ? "border-blue-600" : "border-transparent"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${active ? "text-blue-600" : "text-slate-400"}`}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerClassName="px-4 pb-16 pt-4" showsVerticalScrollIndicator={false}>
        {tab === "resumo" ? <ResumoTab process={process} /> : <NotasTab process={process} />}
      </ScrollView>
    </SafeAreaView>
  );
}
