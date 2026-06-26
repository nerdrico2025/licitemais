import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { STATUS_META } from "../lib/processStatus";
import { formatDate } from "../lib/format";
import { useUpdateProcess } from "../hooks/useUpdateProcess";
import type { ProcessStatus, UserProcess } from "../types/process";
import { ProcessStatusBadge } from "./ProcessStatusBadge";

/** Ordem e rótulos curtos das colunas do quadro. */
const COLUMNS: { status: ProcessStatus; label: string }[] = [
  { status: "SAVED", label: "Salvo" },
  { status: "ANALYZING", label: "Analisando" },
  { status: "DOCS_PENDING", label: "Docs. Pendentes" },
  { status: "READY_TO_BID", label: "Pronto p/ Enviar" },
  { status: "SUBMITTED", label: "Enviado" },
  { status: "WON", label: "Ganhou" },
  { status: "LOST", label: "Perdeu" },
];

/** WON/LOST pedem confirmação antes de aplicar. */
const CONFIRM_STATUSES: ProcessStatus[] = ["WON", "LOST"];

/** Confirmação web-compatible (window.confirm na web, Alert no nativo). */
function confirmStatusChange(label: string, onConfirm: () => void) {
  const message = `Marcar este processo como "${label}"?`;
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(message)) onConfirm();
    return;
  }
  Alert.alert("Confirmar mudança", message, [
    { text: "Cancelar", style: "cancel" },
    { text: "Confirmar", onPress: onConfirm },
  ]);
}

/** Progresso do checklist a partir do ai_summary + checklist_state. */
function checklistProgress(process: UserProcess): { done: number; total: number } | null {
  const docs = process.ai_summary?.documentsChecklist;
  if (!docs || docs.length === 0) return null;
  const state = process.checklist_state ?? {};
  const done = docs.reduce((n, d) => (state[d.id] ? n + 1 : n), 0);
  return { done, total: docs.length };
}

function ProcessCard({
  process,
  onLongPress,
}: {
  process: UserProcess;
  onLongPress: () => void;
}) {
  const opp = process.bidding_opportunities;
  const progress = checklistProgress(process);

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      layout={LinearTransition.springify().damping(18)}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname: "/(app)/processos/[id]", params: { id: process.id } })
        }
        onLongPress={onLongPress}
        delayLongPress={250}
        className="gap-2 rounded-2xl border border-slate-100 bg-white p-3 active:bg-slate-50"
      >
        <ProcessStatusBadge status={process.status} />

        <Text numberOfLines={2} className="text-sm font-semibold leading-5 text-slate-900">
          {opp?.title ?? "Licitação"}
        </Text>

        {opp?.agency ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="business-outline" size={13} color="#64748b" />
            <Text numberOfLines={1} className="flex-1 text-xs text-slate-500">
              {opp.agency}
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="calendar-outline" size={13} color="#64748b" />
            <Text className="text-xs text-slate-500">{formatDate(opp?.opening_date)}</Text>
          </View>
          {progress ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="checkbox-outline" size={13} color="#2563eb" />
              <Text className="text-xs font-semibold text-blue-600">
                {progress.done}/{progress.total}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Column({
  label,
  processes,
  onCardLongPress,
}: {
  label: string;
  processes: UserProcess[];
  onCardLongPress: (process: UserProcess) => void;
}) {
  return (
    <View className="w-72 gap-3">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-sm font-bold text-slate-900">{label}</Text>
        <View className="min-w-6 items-center rounded-full bg-slate-100 px-2 py-0.5">
          <Text className="text-xs font-semibold text-slate-600">{processes.length}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-3 pb-4"
      >
        {processes.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-8">
            <Ionicons name="albums-outline" size={24} color="#cbd5e1" />
            <Text className="text-center text-xs text-slate-400">
              Nenhum processo por aqui ainda.
            </Text>
          </View>
        ) : (
          processes.map((p) => (
            <ProcessCard key={p.id} process={p} onLongPress={() => onCardLongPress(p)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

/** Bottom sheet com os status disponíveis (exceto o atual). */
function StatusActionSheet({
  target,
  onSelect,
  onClose,
}: {
  target: UserProcess | null;
  onSelect: (status: ProcessStatus) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable className="gap-1 rounded-t-3xl bg-white px-4 pb-8 pt-3" onPress={() => {}}>
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-slate-200" />
          <Text className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Mover para
          </Text>

          {COLUMNS.filter((c) => c.status !== target?.status).map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <Pressable
                key={c.status}
                onPress={() => onSelect(c.status)}
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-xl px-2 py-3 active:bg-slate-50"
              >
                <View className={`h-2.5 w-2.5 rounded-full ${meta.badgeClass}`} />
                <Text className="text-base text-slate-800">{meta.label}</Text>
              </Pressable>
            );
          })}

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            className="mt-2 items-center rounded-xl bg-slate-100 py-3"
          >
            <Text className="text-base font-semibold text-slate-700">Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function KanbanBoard({ processes }: { processes: UserProcess[] }) {
  const update = useUpdateProcess();
  const [target, setTarget] = useState<UserProcess | null>(null);

  // Agrupa os processos por status preservando a ordem recebida.
  const grouped = useMemo(() => {
    const map = new Map<ProcessStatus, UserProcess[]>();
    for (const col of COLUMNS) map.set(col.status, []);
    for (const p of processes) map.get(p.status)?.push(p);
    return map;
  }, [processes]);

  const handleSelect = (status: ProcessStatus) => {
    const process = target;
    setTarget(null);
    if (!process) return;

    const apply = () => update.mutate({ id: process.id, status });
    if (CONFIRM_STATUSES.includes(status)) {
      confirmStatusChange(STATUS_META[status].label, apply);
    } else {
      apply();
    }
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4 py-4"
      >
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            label={col.label}
            processes={grouped.get(col.status) ?? []}
            onCardLongPress={setTarget}
          />
        ))}
      </ScrollView>

      <StatusActionSheet target={target} onSelect={handleSelect} onClose={() => setTarget(null)} />
    </>
  );
}
