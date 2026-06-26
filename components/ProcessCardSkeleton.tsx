import { View } from "react-native";

/** Placeholder com a silhueta de um card de processo (lista). */
export function ProcessCardSkeleton() {
  return (
    <View className="gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View className="h-5 w-24 rounded-full bg-slate-200" />
        <View className="h-3 w-16 rounded bg-slate-100" />
      </View>
      <View className="h-4 w-full rounded bg-slate-200" />
      <View className="h-4 w-2/3 rounded bg-slate-100" />
    </View>
  );
}

/** Lista de skeletons de processo. */
export function ProcessListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="gap-3 px-4 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProcessCardSkeleton key={i} />
      ))}
    </View>
  );
}
