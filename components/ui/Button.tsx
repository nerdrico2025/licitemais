import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost";

type ButtonProps = Omit<PressableProps, "children"> & {
  title: string;
  loading?: boolean;
  variant?: Variant;
};

const containerByVariant: Record<Variant, string> = {
  primary: "bg-blue-600",
  secondary: "bg-slate-100",
  ghost: "bg-transparent",
};

const textByVariant: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-slate-900",
  ghost: "text-blue-600",
};

export function Button({
  title,
  loading = false,
  variant = "primary",
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`w-full flex-row items-center justify-center rounded-xl px-6 py-4 ${
        containerByVariant[variant]
      } ${isDisabled ? "opacity-60" : ""}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#ffffff" : "#2563eb"} />
      ) : (
        <Text className={`text-base font-semibold ${textByVariant[variant]}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
