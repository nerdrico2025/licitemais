import type { Tables } from "./database";

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

/**
 * Linha de public.profiles, derivada do schema gerado (types/database.ts) com
 * a coluna jsonb company_profile tipada de forma rica.
 */
export type Profile = Omit<Tables<"profiles">, "company_profile"> & {
  company_profile: CompanyProfile | null;
};
