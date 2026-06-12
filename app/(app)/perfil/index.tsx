import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../../../stores/authStore";
import { useProfile } from "../../../hooks/useProfile";
import { useUpdateProfile } from "../../../hooks/useUpdateProfile";
import { signOut } from "../../../services/auth";
import { showError } from "../../../lib/toast";
import { formatCnpj, isValidCnpj } from "../../../lib/cnpj";
import { AREAS_ATUACAO, UF_LIST } from "../../../lib/profileOptions";
import type { CompanyProfile } from "../../../types/profile";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Chip } from "../../../components/ui/Chip";
import { Skeleton } from "../../../components/ui/Skeleton";

const companyProfileSchema = z.object({
  cnpj: z
    .string()
    .optional()
    .refine((value) => !value || isValidCnpj(value), "CNPJ inválido."),
  areaAtuacao: z.string().optional(),
});

type CompanyProfileForm = z.infer<typeof companyProfileSchema>;

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-5 text-sm font-semibold text-gray-900">{children}</Text>
  );
}

export default function PerfilScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const updateProfile = useUpdateProfile();

  const [estadosInteresse, setEstadosInteresse] = useState<string[]>([]);
  const [palavrasChave, setPalavrasChave] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyProfileForm>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: { cnpj: "", areaAtuacao: "" },
  });

  useEffect(() => {
    if (!profile) return;
    const company = profile.company_profile ?? {};
    reset({
      cnpj: company.cnpj ?? "",
      areaAtuacao: company.areaAtuacao ?? "",
    });
    setEstadosInteresse(company.estadosInteresse ?? []);
    setPalavrasChave(company.palavrasChave ?? []);
  }, [profile, reset]);

  function toggleEstado(uf: string) {
    setEstadosInteresse((current) =>
      current.includes(uf) ? current.filter((item) => item !== uf) : [...current, uf],
    );
  }

  function addKeyword() {
    const keyword = keywordInput.trim();
    if (!keyword || palavrasChave.includes(keyword)) {
      setKeywordInput("");
      return;
    }
    setPalavrasChave((current) => [...current, keyword]);
    setKeywordInput("");
  }

  function removeKeyword(keyword: string) {
    setPalavrasChave((current) => current.filter((item) => item !== keyword));
  }

  function onSubmit(values: CompanyProfileForm) {
    const companyProfile: CompanyProfile = {
      cnpj: values.cnpj || undefined,
      areaAtuacao: values.areaAtuacao || undefined,
      estadosInteresse: estadosInteresse.length > 0 ? estadosInteresse : undefined,
      palavrasChave: palavrasChave.length > 0 ? palavrasChave : undefined,
    };
    updateProfile.mutate(companyProfile);
  }

  async function handleLogout() {
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Não foi possível sair. Tente novamente.");
    } finally {
      setSigningOut(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-white px-6 py-6">
        <Skeleton className="h-8 w-32" />

        <Skeleton className="mb-2 mt-5 h-4 w-32" />
        <View className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-1.5 h-5 w-40" />
          <View className="my-3 h-px bg-gray-200" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-1.5 h-5 w-48" />
        </View>

        <Skeleton className="mb-2 mt-5 h-4 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />

        <Skeleton className="mb-2 mt-5 h-4 w-32" />
        <View className="flex-row flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </View>

        <Skeleton className="mb-2 mt-5 h-4 w-32" />
        <View className="flex-row flex-wrap gap-2">
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
          <Skeleton className="h-8 w-12 rounded-full" />
        </View>
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Ionicons name="alert-circle-outline" size={48} color="#9ca3af" />
        <Text className="mt-3 text-center text-base text-gray-600">
          {error instanceof Error ? error.message : "Não foi possível carregar seu perfil."}
        </Text>
        <View className="mt-5 w-40">
          <Button title="Tentar novamente" onPress={() => refetch()} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerClassName="py-6 pb-12"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-2xl font-bold text-gray-900">Perfil</Text>

          <SectionLabel>Dados da conta</SectionLabel>
          <View className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <Text className="text-xs font-medium uppercase text-gray-400">Nome</Text>
            <Text className="mt-0.5 text-base text-gray-900">
              {profile.name || "Não informado"}
            </Text>

            <View className="my-3 h-px bg-gray-200" />

            <Text className="text-xs font-medium uppercase text-gray-400">E-mail</Text>
            <Text className="mt-0.5 text-base text-gray-900">
              {profile.email ?? user?.email ?? "Não informado"}
            </Text>
          </View>

          <SectionLabel>Perfil da empresa</SectionLabel>

          <Controller
            control={control}
            name="cnpj"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="CNPJ"
                placeholder="00.000.000/0000-00"
                keyboardType="numeric"
                value={value}
                onChangeText={(text) => onChange(formatCnpj(text))}
                onBlur={onBlur}
                error={errors.cnpj?.message}
              />
            )}
          />

          <Text className="mb-2 text-sm font-medium text-gray-700">Área de atuação</Text>
          <View className="flex-row flex-wrap gap-2">
            {AREAS_ATUACAO.map((area) => (
              <Controller
                key={area}
                control={control}
                name="areaAtuacao"
                render={({ field: { value, onChange } }) => (
                  <Chip
                    label={area}
                    selected={value === area}
                    onPress={() => onChange(value === area ? "" : area)}
                  />
                )}
              />
            ))}
          </View>

          <SectionLabel>Estados de interesse</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {UF_LIST.map((uf) => (
              <Chip
                key={uf}
                label={uf}
                selected={estadosInteresse.includes(uf)}
                onPress={() => toggleEstado(uf)}
              />
            ))}
          </View>

          <SectionLabel>Palavras-chave</SectionLabel>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900"
              placeholder="Ex: equipamentos de informática"
              placeholderTextColor="#9ca3af"
              value={keywordInput}
              onChangeText={setKeywordInput}
              onSubmitEditing={addKeyword}
              returnKeyType="done"
            />
            <Pressable
              className="items-center justify-center rounded-xl bg-blue-600 px-4 active:bg-blue-700"
              onPress={addKeyword}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </View>

          {palavrasChave.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {palavrasChave.map((keyword) => (
                <View
                  key={keyword}
                  className="flex-row items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5"
                >
                  <Text className="text-sm font-medium text-gray-700">{keyword}</Text>
                  <Pressable hitSlop={8} onPress={() => removeKeyword(keyword)}>
                    <Ionicons name="close" size={14} color="#6b7280" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View className="mt-8 gap-3">
            <Button
              title="Salvar perfil da empresa"
              loading={updateProfile.isPending}
              onPress={handleSubmit(onSubmit)}
            />
            <Button
              title="Sair"
              variant="secondary"
              loading={signingOut}
              onPress={handleLogout}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
