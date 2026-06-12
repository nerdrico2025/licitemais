import { Text, TextInput, View, type TextInputProps } from "react-native";
import { ErrorText } from "./ErrorText";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        className={`rounded-xl border bg-white px-4 py-3 text-base text-gray-900 ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      <ErrorText message={error} />
    </View>
  );
}
