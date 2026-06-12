import { Pressable, Text } from "react-native";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      className={`rounded-full border px-3 py-1.5 ${
        selected ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
      }`}
      onPress={onPress}
    >
      <Text className={`text-sm font-medium ${selected ? "text-white" : "text-gray-700"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
