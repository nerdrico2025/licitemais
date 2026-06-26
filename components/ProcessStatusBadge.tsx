import { Text, View } from "react-native";

import { STATUS_META } from "../lib/processStatus";
import type { ProcessStatus } from "../types/process";

/** Badge colorido com o rótulo PT-BR do status do processo. */
export function ProcessStatusBadge({ status }: { status: ProcessStatus }) {
  const meta = STATUS_META[status];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${meta.badgeClass}`}>
      <Text className={`text-xs font-semibold ${meta.textClass}`}>{meta.label}</Text>
    </View>
  );
}
