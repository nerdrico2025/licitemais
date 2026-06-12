import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "../../services/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ErrorText } from "../../components/ui/ErrorText";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    setSubmitError(undefined);
    try {
      await signIn(values.email, values.password);
      // A guarda de rota no _layout redireciona para (app) ao autenticar
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Algo deu errado. Tente novamente.",
      );
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerClassName="py-10"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-3xl font-bold text-gray-900">Entrar</Text>
          <Text className="mb-8 mt-2 text-gray-500">
            Bem-vindo de volta ao Licite Mais.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="E-mail"
                placeholder="voce@empresa.com.br"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Senha"
                placeholder="Sua senha"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Pressable onPress={() => router.push("/(auth)/recuperar")}>
            <Text className="text-sm font-medium text-blue-600">
              Esqueci minha senha
            </Text>
          </Pressable>

          <ErrorText message={submitError} />

          <View className="mt-6 gap-3">
            <Button
              title="Entrar"
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />
            <Button
              title="Criar conta"
              variant="secondary"
              onPress={() => router.push("/(auth)/cadastro")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
