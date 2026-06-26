import { isOpportunityCategory } from "../lib/categories";
import type { BiddingOpportunity, OpportunityCategory } from "../types/opportunity";
import { supabase } from "./supabase";

/**
 * Classifica um lote de oportunidades por tema via Edge Function
 * classify-opportunities (LLM). Retorna um mapa external_id -> categoria.
 *
 * Best-effort: qualquer falha (função indisponível, LLM fora) devolve um mapa
 * vazio — a busca não deve quebrar por causa da classificação.
 */
export async function classifyOpportunities(
  items: BiddingOpportunity[],
): Promise<Map<string, OpportunityCategory>> {
  const map = new Map<string, OpportunityCategory>();
  if (items.length === 0) return map;

  const payload = items.map((o) => ({
    id: o.external_id,
    // O objeto (title/raw_text) é o que melhor descreve o tema.
    text: o.raw_text ?? o.title,
  }));

  try {
    const { data, error } = await supabase.functions.invoke(
      "classify-opportunities",
      { body: { items: payload } },
    );
    if (error) throw error;

    const results: unknown = (data as any)?.results;
    if (Array.isArray(results)) {
      for (const r of results) {
        if (r && typeof r.id === "string" && isOpportunityCategory(r.category)) {
          map.set(r.id, r.category);
        }
      }
    }
  } catch (e) {
    console.warn("classifyOpportunities falhou:", e instanceof Error ? e.message : e);
  }
  return map;
}
