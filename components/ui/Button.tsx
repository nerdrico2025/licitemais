import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from "react-native";

interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export function Button({
  title,
  variant = "primary",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerClass =
    variant === "primary"
      ? "rounded-xl bg-blue-600 py-3.5 items-center active:bg-blue-700"
      : "rounded-xl border border-blue-600 bg-white py-3.5 items-center active:bg-blue-50";

  const textClass =
    variant === "primary"
      ? "text-base font-semibold text-white"
      : "text-base font-semibold text-blue-600";

  return (
    <Pressable
      className={`${containerClass} ${isDisabled ? "opacity-50" : ""}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#2563eb"} />
      ) : (
        <Text className={textClass}>{title}</Text>
      )}
    </Pressable>
  );
}
