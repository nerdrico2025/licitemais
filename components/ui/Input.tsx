import { forwardRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { ErrorText } from "./ErrorText";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, ...props },
  ref,
) {
  return (
    <View className="w-full gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-slate-700">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#94a3b8"
        className={`w-full rounded-xl border bg-white px-4 py-3 text-base text-slate-900 ${
          error ? "border-red-500" : "border-slate-300"
        }`}
        {...props}
      />
      <ErrorText>{error}</ErrorText>
    </View>
  );
});
