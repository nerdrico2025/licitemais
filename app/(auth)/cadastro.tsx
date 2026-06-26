import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, router } from "expo-router";
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
import { signUp } from "../../services/auth";
import { usePendingSignup } from "../../stores/pendingSignup";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo."),
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

type FormData = z.infer<typeof schema>;

export default function Cadastro() {
  const [formError, setFormError] = useState("");
  const setPending = usePendingSignup((s) => s.set);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setFormError("");
    try {
      await signUp(data.name, data.email, data.password);
      setPending({ email: data.email, password: data.password });
      router.replace("/(auth)/verificacao");
    } catch (e) {
      setFormError(
        e instanceof Error ? e.message : "Não foi possível criar a conta.",
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
            <Text className="text-3xl font-bold text-slate-900">Criar conta</Text>
            <Text className="text-base text-slate-500">
              Leva menos de um minuto.
            </Text>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Nome"
                  placeholder="Seu nome completo"
                  autoCapitalize="words"
                  autoComplete="name"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                />
              )}
            />
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
                  placeholder="Mínimo de 8 caracteres"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />
          </View>

          <ErrorText>{formError}</ErrorText>

          <View className="gap-4">
            <Button
              title="Criar conta"
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />
            <View className="flex-row justify-center gap-1">
              <Text className="text-sm text-slate-500">Já tem conta?</Text>
              <Link href="/(auth)/login" className="text-sm font-semibold text-blue-600">
                Entrar
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
