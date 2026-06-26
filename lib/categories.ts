import type { OpportunityCategory } from "../types/opportunity";

/**
 * Taxonomia canônica de temas de licitação. A mesma lista de slugs é espelhada
 * na Edge Function classify-opportunities (Deno, sem import do app) — manter as
 * duas em sincronia. A `description` orienta tanto o usuário quanto o prompt.
 */
export const CATEGORIES: {
  id: OpportunityCategory;
  label: string;
  description: string;
}[] = [
  { id: "tecnologia", label: "Tecnologia e TI", description: "hardware, software, redes, sistemas, serviços de informática" },
  { id: "obras", label: "Obras e Engenharia", description: "construção, reforma, pavimentação, infraestrutura, projetos de engenharia" },
  { id: "saude", label: "Saúde", description: "medicamentos, insumos e equipamentos médico-hospitalares, serviços de saúde" },
  { id: "alimentacao", label: "Alimentação", description: "gêneros alimentícios, merenda, refeições, água, copa e cozinha" },
  { id: "limpeza", label: "Limpeza e Conservação", description: "material e serviços de limpeza, higiene, conservação e jardinagem" },
  { id: "transporte", label: "Veículos e Transporte", description: "veículos, combustível, locação de frota, fretes e transporte" },
  { id: "mobiliario", label: "Mobiliário e Equipamentos", description: "móveis, eletrodomésticos, máquinas e equipamentos em geral" },
  { id: "escritorio", label: "Material de Escritório", description: "papelaria, suprimentos de expediente, material de consumo administrativo" },
  { id: "comunicacao", label: "Comunicação e Mídia", description: "publicidade, vídeo, áudio, fotografia, eventos, gráfica e impressos" },
  { id: "educacao", label: "Educação", description: "material didático, livros, cursos, capacitação e serviços educacionais" },
  { id: "servicos", label: "Serviços Gerais", description: "mão de obra, vigilância, consultoria e demais serviços terceirizados" },
  { id: "outros", label: "Outros", description: "não se enquadra claramente em nenhuma das categorias acima" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const CATEGORY_LABELS: Record<OpportunityCategory, string> =
  Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<
    OpportunityCategory,
    string
  >;

/** Garante que um valor arbitrário (ex.: vindo do LLM) é um tema válido. */
export function isOpportunityCategory(v: unknown): v is OpportunityCategory {
  return typeof v === "string" && (CATEGORY_IDS as string[]).includes(v);
}
