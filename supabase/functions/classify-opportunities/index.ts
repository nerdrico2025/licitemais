// classify-opportunities — Supabase Edge Function (Deno / TypeScript)
//
// Recebe POST { items: [{ id, text }] } e devolve { results: [{ id, category }] }
// classificando cada licitação em um tema (taxonomia fixa) a partir do objeto.
// O PNCP não fornece categoria temática; ela é inferida por LLM em lote.
//
// Secrets necessários (supabase secrets set ...):
//   OPENROUTER_API_KEY        (chave da OpenRouter)
//   OPENROUTER_MODEL          (modelo principal)
//   OPENROUTER_FALLBACK_MODEL (opcional, p. ex. um modelo :free)

import { z } from "https://esm.sh/zod@3.24.1";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const APP_TITLE = "Licite Mais";
const APP_REFERER = "https://licitemais.app";

// Máximo de itens por chamada (protege custo/latência da função).
const MAX_ITEMS = 60;
// Trunca o objeto: o início já basta para classificar e reduz tokens.
const MAX_TEXT_CHARS = 280;

// Taxonomia espelhada de lib/categories.ts (manter em sincronia).
const CATEGORIES: { id: string; description: string }[] = [
  { id: "tecnologia", description: "hardware, software, redes, sistemas, serviços de informática" },
  { id: "obras", description: "construção, reforma, pavimentação, infraestrutura, engenharia" },
  { id: "saude", description: "medicamentos, insumos e equipamentos médico-hospitalares, serviços de saúde" },
  { id: "alimentacao", description: "gêneros alimentícios, merenda, refeições, água, copa e cozinha" },
  { id: "limpeza", description: "material e serviços de limpeza, higiene, conservação e jardinagem" },
  { id: "transporte", description: "veículos, combustível, locação de frota, fretes e transporte" },
  { id: "mobiliario", description: "móveis, eletrodomésticos, máquinas e equipamentos em geral" },
  { id: "escritorio", description: "papelaria, suprimentos de expediente, material de consumo administrativo" },
  { id: "comunicacao", description: "publicidade, vídeo, áudio, fotografia, eventos, gráfica e impressos" },
  { id: "educacao", description: "material didático, livros, cursos, capacitação e serviços educacionais" },
  { id: "servicos", description: "mão de obra, vigilância, consultoria e demais serviços terceirizados" },
  { id: "outros", description: "não se enquadra claramente em nenhuma categoria acima" },
];
const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const SYSTEM_PROMPT =
  "Você classifica licitações públicas brasileiras por tema, a partir do objeto. " +
  "Categorias disponíveis (use exatamente o id):\n" +
  CATEGORIES.map((c) => `- ${c.id}: ${c.description}`).join("\n") +
  "\nResponda APENAS com um objeto JSON válido, sem markdown e sem texto extra, " +
  'no formato {"results":[{"id":"<id-do-item>","category":"<categoria>"}]}. ' +
  "Use exatamente o id recebido para cada item e escolha uma única categoria por item. " +
  'Em caso de dúvida, use "outros".';

const ResultsSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      category: z.string(),
    }),
  ),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Recorta o JSON da resposta do modelo (remove cercas e texto fora das chaves). */
function parseLooseJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text);
}

async function callLLM(
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const apiKey = requireEnv("OPENROUTER_API_KEY");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": APP_REFERER,
      "X-Title": APP_TITLE,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(
      `OpenRouter ${res.status} (${model}): ${detail.slice(0, 500)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error(`OpenRouter returned empty content (${model})`);
  }
  return content;
}

type Item = { id: string; text: string };

async function classifyWithModel(
  model: string,
  items: Item[],
): Promise<Record<string, string>> {
  const userPayload = JSON.stringify(
    items.map((it) => ({
      id: it.id,
      objeto: (it.text ?? "").slice(0, MAX_TEXT_CHARS),
    })),
  );
  const content = await callLLM(model, SYSTEM_PROMPT, userPayload);
  const parsed = ResultsSchema.parse(parseLooseJson(content));

  const map: Record<string, string> = {};
  for (const r of parsed.results) {
    map[r.id] = CATEGORY_IDS.includes(r.category) ? r.category : "outros";
  }
  return map;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawItems = Array.isArray(body?.items) ? body.items : null;
    if (!rawItems) {
      return jsonResponse({ error: "items[] is required" }, 400);
    }

    const items: Item[] = rawItems
      .filter((it: any) => it && typeof it.id === "string")
      .slice(0, MAX_ITEMS)
      .map((it: any) => ({ id: it.id, text: String(it.text ?? "") }));

    if (items.length === 0) return jsonResponse({ results: [] });

    const primaryModel = requireEnv("OPENROUTER_MODEL");
    const fallbackModel = Deno.env.get("OPENROUTER_FALLBACK_MODEL");

    let map: Record<string, string>;
    try {
      map = await classifyWithModel(primaryModel, items);
    } catch (primaryError) {
      const status = (primaryError as { status?: number })?.status;
      const isRateLimit = status === 429;
      const isParseOrValidation = primaryError instanceof z.ZodError ||
        primaryError instanceof SyntaxError;
      if (fallbackModel && (isRateLimit || isParseOrValidation)) {
        console.warn(
          `Primary model failed (${isRateLimit ? "429" : "parse/validation"}); ` +
            `retrying with fallback "${fallbackModel}".`,
        );
        map = await classifyWithModel(fallbackModel, items);
      } else {
        throw primaryError;
      }
    }

    // Itens sem retorno do modelo caem em "outros" (resposta sempre completa).
    const results = items.map((it) => ({
      id: it.id,
      category: map[it.id] ?? "outros",
    }));
    return jsonResponse({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("classify-opportunities error:", message);
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
