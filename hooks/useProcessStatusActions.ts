import { useState } from "react";
import { Alert } from "react-native";
import type { ProcessStatus } from "../types/process";
import {
  KANBAN_COLUMNS,
  STATUS_LABELS,
  STATUS_REQUIRES_CONFIRMATION,
} from "../lib/processStatus";
import { useUpdateProcess } from "./useUpdateProcess";
import type { ActionSheetOption } from "../components/ui/ActionSheet";

/** Opções de status (exceto o atual) + confirmação para WON/LOST. */
export function useProcessStatusActions(processId: string, currentStatus: ProcessStatus) {
  const updateProcess = useUpdateProcess();
  const [showActions, setShowActions] = useState(false);

  const statusOptions: ActionSheetOption[] = KANBAN_COLUMNS.filter(
    (status) => status !== currentStatus,
  ).map((status) => ({
    key: status,
    label: STATUS_LABELS[status],
    destructive: status === "LOST",
  }));

  function applyStatus(status: ProcessStatus) {
    updateProcess.mutate({ id: processId, status });
  }

  function handleSelectStatus(key: string) {
    setShowActions(false);
    const status = key as ProcessStatus;

    if (STATUS_REQUIRES_CONFIRMATION.includes(status)) {
      Alert.alert(
        `Marcar como "${STATUS_LABELS[status]}"?`,
        "Essa ação atualiza o status final do processo.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            style: status === "LOST" ? "destructive" : "default",
            onPress: () => applyStatus(status),
          },
        ],
      );
      return;
    }

    applyStatus(status);
  }

  return { statusOptions, showActions, setShowActions, handleSelectStatus };
}
