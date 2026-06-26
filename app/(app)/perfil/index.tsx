import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Button } from "../../../components/ui/Button";
import { Chip } from "../../../components/ui/Chip";
import { ErrorText } from "../../../components/ui/ErrorText";
import { Input } from "../../../components/ui/Input";
import { formatCNPJ, isValidCNPJ, onlyDigits } from "../../../lib/cnpj";
import { toastError, toastSuccess } from "../../../lib/toast";
import { signOut } from "../../../services/auth";
import { supabase } from "../../../services/supabase";
import { useAuthStore } from "../../../stores/authStore";
import type { CompanyProfile, Profile } from "../../../types/profile";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

const schema = z.object({
  cnpj: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidCNPJ(v), "CNPJ inválido."),
  area: z.string().trim().max(120, "Máximo de 120 caracteres.").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

function SectionTitle({ children }: { children: string }) {
  return <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">{children}</Text>;
}

function PerfilHeader() {
  return (
    <View className="border-b border-slate-100 px-4 py-3">
      <Text className="text-lg font-semibold text-slate-900">Perfil</Text>
    </View>
  );
}

export default function Perfil() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  // Dados da conta vindos da sessão (fallbacks até o profile carregar).
  const accountName = user?.user_metadata?.name as string | undefined;
  const accountEmail = user?.email ?? undefined;

  const [estados, setEstados] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState("");

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      // Payload enxuto (§8.1): só o que a tela usa.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, company_profile")
        .eq("id", userId as string)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { cnpj: "", area: "" },
  });

  // Popula o formulário quando o perfil carrega.
  useEffect(() => {
    const cp = profile?.company_profile;
    if (!cp) return;
    reset({ cnpj: cp.cnpj ? formatCNPJ(cp.cnpj) : "", area: cp.area ?? "" });
    setEstados(cp.estados ?? []);
    setKeywords(cp.palavrasChave ?? []);
  }, [profile, reset]);

  const save = useMutation({
    mutationFn: async (companyProfile: CompanyProfile) => {
      const { error } = await supabase
        .from("profiles")
        .update({ company_profile: companyProfile, updated_at: new Date().toISOString() })
        .eq("id", userId as string);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toastSuccess("Perfil da empresa salvo.");
    },
    onError: () => toastError("Não foi possível salvar o perfil. Tente novamente."),
  });

  const onSubmit = (data: FormData) => {
    save.mutate({
      cnpj: onlyDigits(data.cnpj ?? ""),
      area: (data.area ?? "").trim(),
      estados,
      palavrasChave: keywords,
    });
  };

  const toggleEstado = (uf: string) =>
    setEstados((prev) => (prev.includes(uf) ? prev.filter((e) => e !== uf) : [...prev, uf]));

  const addKeyword = () => {
    const k = keywordDraft.trim();
    if (k && !keywords.includes(k)) setKeywords((prev) => [...prev, k]);
    setKeywordDraft("");
  };

  const removeKeyword = (k: string) => setKeywords((prev) => prev.filter((x) => x !== k));

  const onLogout = () => {
    const doLogout = async () => {
      try {
        await signOut();
        queryClient.clear(); // limpa o cache do usuário anterior
      } catch {
        toastError("Não foi possível sair. Tente novamente.");
      }
    };
    if (Platform.OS === "web") {
      if (globalThis.confirm?.("Deseja sair da sua conta?")) doLogout();
      return;
    }
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: doLogout },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <PerfilHeader />
        <View className="gap-6 px-4 pt-5">
          <View className="h-20 w-full rounded-2xl bg-slate-100" />
          <View className="h-12 w-full rounded-xl bg-slate-100" />
          <View className="h-12 w-full rounded-xl bg-slate-100" />
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} className="h-9 w-12 rounded-full bg-slate-100" />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <PerfilHeader />
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
          <Text className="text-center text-base text-slate-600">
            Não foi possível carregar seu perfil.
          </Text>
          <Pressable
            onPress={() => refetch()}
            accessibilityRole="button"
            className="rounded-xl bg-slate-900 px-5 py-3"
          >
            <Text className="text-sm font-semibold text-white">Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <PerfilHeader />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="gap-6 px-4 pb-12 pt-5"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Dados da conta */}
          <View className="flex-row items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Ionicons name="person" size={22} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900">
                {profile?.name ?? accountName ?? "Sua conta"}
              </Text>
              <Text className="text-sm text-slate-500">
                {profile?.email ?? accountEmail ?? "—"}
              </Text>
            </View>
          </View>

          {/* Perfil da empresa (RF/AU04) */}
          <View className="gap-4">
            <SectionTitle>Perfil da empresa</SectionTitle>

            <Controller
              control={control}
              name="cnpj"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="CNPJ"
                  value={value}
                  onChangeText={(t) => onChange(formatCNPJ(t))}
                  keyboardType="numeric"
                  placeholder="00.000.000/0000-00"
                  error={errors.cnpj?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="area"
              render={({ field: { value, onChange } }) => (
                <Input
                  label="Área de atuação"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Ex.: Construção civil, TI, limpeza…"
                  error={errors.area?.message}
                />
              )}
            />

            {/* Estados de interesse (multi-select) */}
            <View className="gap-2">
              <Text className="text-sm font-medium text-slate-700">Estados de interesse</Text>
              <View className="flex-row flex-wrap gap-2">
                {UFS.map((uf) => (
                  <Chip
                    key={uf}
                    label={uf}
                    selected={estados.includes(uf)}
                    onPress={() => toggleEstado(uf)}
                  />
                ))}
              </View>
            </View>

            {/* Palavras-chave */}
            <View className="gap-2">
              <Text className="text-sm font-medium text-slate-700">Palavras-chave</Text>
              <View className="flex-row items-end gap-2">
                <View className="flex-1">
                  <Input
                    value={keywordDraft}
                    onChangeText={setKeywordDraft}
                    onSubmitEditing={addKeyword}
                    returnKeyType="done"
                    placeholder="Adicione um termo e toque em +"
                    autoCapitalize="none"
                  />
                </View>
                <Pressable
                  onPress={addKeyword}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar palavra-chave"
                  className="h-12 w-12 items-center justify-center rounded-xl bg-blue-600"
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </Pressable>
              </View>
              {keywords.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {keywords.map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => removeKeyword(k)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${k}`}
                      className="flex-row items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5"
                    >
                      <Text className="text-sm font-medium text-blue-700">{k}</Text>
                      <Ionicons name="close-circle" size={15} color="#2563eb" />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <Button title="Salvar perfil" loading={save.isPending} onPress={handleSubmit(onSubmit)} />
            <ErrorText>{save.isError ? "Falha ao salvar." : ""}</ErrorText>
          </View>

          {/* Logout */}
          <Pressable
            onPress={onLogout}
            accessibilityRole="button"
            className="mt-2 flex-row items-center justify-center gap-2 rounded-xl border border-rose-200 py-3.5"
          >
            <Ionicons name="log-out-outline" size={18} color="#e11d48" />
            <Text className="text-base font-semibold text-rose-600">Sair da conta</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
