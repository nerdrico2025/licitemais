import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUp } from "../../services/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ErrorText } from "../../components/ui/ErrorText";

const cadastroSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo."),
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

type CadastroForm = z.infer<typeof cadastroSchema>;

export default function CadastroScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: CadastroForm) {
    setSubmitError(undefined);
    try {
      await signUp(values.name, values.email, values.password);
      router.push("/(auth)/verificacao");
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
          <Text className="text-3xl font-bold text-gray-900">Criar conta</Text>
          <Text className="mb-8 mt-2 text-gray-500">
            Comece a acompanhar licitações em poucos minutos.
          </Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nome"
                placeholder="Seu nome completo"
                autoCapitalize="words"
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
                placeholder="Mínimo de 8 caracteres"
                secureTextEntry
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <ErrorText message={submitError} />

          <View className="mt-6 gap-3">
            <Button
              title="Criar conta"
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />
            <Button
              title="Já tenho conta"
              variant="secondary"
              onPress={() => router.push("/(auth)/login")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
