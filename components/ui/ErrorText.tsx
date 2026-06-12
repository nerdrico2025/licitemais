import { Text } from "react-native";

interface ErrorTextProps {
  message?: string;
}

export function ErrorText({ message }: ErrorTextProps) {
  if (!message) return null;
  return <Text className="mt-1 text-sm text-red-600">{message}</Text>;
}
