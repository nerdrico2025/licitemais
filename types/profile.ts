export interface CompanyProfile {
  cnpj?: string;
  areaAtuacao?: string;
  estadosInteresse?: string[];
  palavrasChave?: string[];
}

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  company_profile: CompanyProfile | null;
  created_at: string;
  updated_at: string;
}
