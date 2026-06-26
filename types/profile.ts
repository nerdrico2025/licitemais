/** Perfil da empresa do usuário (jsonb em profiles.company_profile) — RF/AU04. */
export type CompanyProfile = {
  /** CNPJ apenas com dígitos. */
  cnpj: string;
  /** Área de atuação / segmento. */
  area: string;
  /** UFs de interesse para alertas e busca. */
  estados: string[];
  /** Palavras-chave de interesse. */
  palavrasChave: string[];
};

/** Linha de public.profiles. */
export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  company_profile: CompanyProfile | null;
  created_at: string;
  updated_at: string;
};
