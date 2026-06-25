import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { ErrorText } from "../../components/ui/ErrorText";
import { Input } from "../../components/ui/Input";
import { signIn } from "../../services/auth";

const schema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const [formError, setFormError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setFormError("");
    try {
      // Em sucesso, a guarda de rota detecta a sessão e leva para (app).
      await signIn(data.email, data.password);
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Não foi possível entrar.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center gap-5 px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-1">
            <Text className="text-3xl font-bold text-slate-900">Entrar</Text>
            <Text className="text-base text-slate-500">
              Bem-vindo de volta ao Licite Mais.
            </Text>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="E-mail"
                  placeholder="voce@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
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
                  autoComplete="password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />
            <Link
              href="/(auth)/recuperar"
              className="self-end text-sm font-semibold text-blue-600"
            >
              Esqueci minha senha
            </Link>
          </View>

          <ErrorText>{formError}</ErrorText>

          <View className="gap-4">
            <Button
              title="Entrar"
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />
            <View className="flex-row justify-center gap-1">
              <Text className="text-sm text-slate-500">Não tem conta?</Text>
              <Link
                href="/(auth)/cadastro"
                className="text-sm font-semibold text-blue-600"
              >
                Criar conta
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
