import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { resetPassword } from "../../services/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ErrorText } from "../../components/ui/ErrorText";

const recuperarSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
});

type RecuperarForm = z.infer<typeof recuperarSchema>;

export default function RecuperarScreen() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarForm>({
    resolver: zodResolver(recuperarSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RecuperarForm) {
    setSubmitError(undefined);
    try {
      await resetPassword(values.email);
      setSent(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Algo deu errado. Tente novamente.",
      );
    }
  }

  if (sent) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center px-6">
          <Text className="text-6xl">✉️</Text>
          <Text className="mt-4 text-3xl font-bold text-gray-900">
            E-mail enviado
          </Text>
          <Text className="mt-3 text-base text-gray-600">
            Se houver uma conta com esse e-mail, você receberá um link para
            redefinir sua senha. Verifique também a caixa de spam.
          </Text>
          <View className="mt-8">
            <Button
              title="Voltar para o login"
              onPress={() => router.push("/(auth)/login")}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-gray-900">
          Recuperar senha
        </Text>
        <Text className="mb-8 mt-2 text-gray-500">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
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

        <ErrorText message={submitError} />

        <View className="mt-6 gap-3">
          <Button
            title="Enviar link"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
          <Button
            title="Voltar"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
