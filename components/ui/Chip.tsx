import { Pressable, Text } from "react-native";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-3 py-2 ${
        selected ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white"
      }`}
    >
      <Text
        className={`text-sm ${
          selected ? "font-semibold text-blue-700" : "text-slate-600"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
