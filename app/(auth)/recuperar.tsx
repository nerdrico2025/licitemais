import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { router } from "expo-router";
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
import { resetPassword } from "../../services/auth";

const schema = z.object({
  email: z.string().trim().email("E-mail inválido."),
});

type FormData = z.infer<typeof schema>;

export default function Recuperar() {
  const [formError, setFormError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormData) => {
    setFormError("");
    try {
      await resetPassword(data.email);
      setSentTo(data.email);
    } catch (e) {
      setFormError(
        e instanceof Error
          ? e.message
          : "Não foi possível enviar o e-mail de recuperação.",
      );
    }
  };

  if (sentTo) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center gap-6 px-6 py-10">
          <View className="gap-3">
            <Text className="text-3xl font-bold text-slate-900">
              Verifique seu e-mail
            </Text>
            <Text className="text-base leading-relaxed text-slate-600">
              Se houver uma conta para
              <Text className="font-semibold text-slate-800"> {sentTo}</Text>,
              enviamos um link para redefinir sua senha.
            </Text>
          </View>
          <Button
            title="Voltar para o login"
            onPress={() => router.replace("/(auth)/login")}
          />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text className="text-3xl font-bold text-slate-900">
              Recuperar senha
            </Text>
            <Text className="text-base text-slate-500">
              Informe seu e-mail e enviaremos um link para redefinir a senha.
            </Text>
          </View>

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

          <ErrorText>{formError}</ErrorText>

          <View className="gap-4">
            <Button
              title="Enviar link"
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />
            <Button
              title="Voltar"
              variant="ghost"
              onPress={() => router.back()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
