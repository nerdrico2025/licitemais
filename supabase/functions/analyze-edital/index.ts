// analyze-edital — Supabase Edge Function (Deno / TypeScript)
//
// Recebe POST { processId }, baixa o edital (PDF ou HTML) da oportunidade
// relacionada, extrai o texto e usa um LLM via OpenRouter para produzir um
// resumo estruturado (ai_summary) que é gravado em public.user_processes.
//
// Secrets necessários (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetados pela plataforma)
//   OPENROUTER_API_KEY                        (chave da OpenRouter)
//   OPENROUTER_MODEL                          (modelo principal)
//   OPENROUTER_FALLBACK_MODEL                 (opcional, p. ex. um modelo :free)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@1.3.1";
import { z } from "https://esm.sh/zod@3.24.1";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MAX_TEXT_CHARS = 40_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const APP_TITLE = "Licite Mais";
const APP_REFERER = "https://licitemais.app";

const SYSTEM_PROMPT =
  "Você analisa editais de licitação. Retorne APENAS um objeto JSON válido, " +
  "sem markdown e sem texto extra, com objectSimplified (objeto da licitação " +
  "em 1 frase clara), importantDates (objeto com proposalDelivery e auctionStart " +
  "em ISO8601), requirements (array de strings com requisitos técnicos " +
  "impeditivos), documentsChecklist (array de documentos obrigatórios, cada um " +
  "com id uuid, item e type entre Habilitacao|Financeiro|Proposta|Tecnico).";

// ---------------------------------------------------------------------------
// Schema de validação do retorno do LLM (Zod)
// ---------------------------------------------------------------------------

const AiSummarySchema = z.object({
  objectSimplified: z.string(),
  importantDates: z.object({
    proposalDelivery: z.string(),
    auctionStart: z.string(),
  }),
  requirements: z.array(z.string()),
  documentsChecklist: z.array(
    z.object({
      id: z.string(),
      item: z.string(),
      type: z.enum(["Habilitacao", "Financeiro", "Proposta", "Tecnico"]),
    }),
  ),
});

type AiSummary = z.infer<typeof AiSummarySchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Extrai o objeto JSON da resposta do modelo. Alguns modelos devolvem o JSON
 * dentro de uma cerca markdown (```json ... ```) ou com texto antes/depois.
 * Removemos as cercas e recortamos do primeiro `{` ao último `}`.
 */
function parseLooseJson(raw: string): unknown {
  let text = raw.trim();

  // Remove cercas de código markdown (```json ... ``` ou ``` ... ```).
  text = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Recorta qualquer texto fora das chaves do objeto.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  return JSON.parse(text);
}

/**
 * Baixa a source_url com timeout e devolve os bytes + content-type.
 */
async function downloadSource(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, contentType };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Converte os bytes baixados em texto plano: extrai PDF com unpdf, ou
 * remove tags de HTML. Trunca para MAX_TEXT_CHARS.
 */
async function extractEditalText(
  bytes: Uint8Array,
  contentType: string,
  url: string,
): Promise<string> {
  const isPdf = contentType.includes("pdf") ||
    url.toLowerCase().endsWith(".pdf") ||
    (bytes.length > 4 &&
      bytes[0] === 0x25 && bytes[1] === 0x50 &&
      bytes[2] === 0x44 && bytes[3] === 0x46); // "%PDF"

  let text: string;
  if (isPdf) {
    const pdf = await getDocumentProxy(bytes);
    const { text: extracted } = await extractText(pdf, { mergePages: true });
    text = extracted;
  } else {
    const html = new TextDecoder().decode(bytes);
    text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ");
  }

  text = text.trim();
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}

/**
 * Chamada centralizada ao OpenRouter (API compatível com OpenAI).
 * Lança um erro com `status` 429 anexado quando há rate limit.
 */
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
      max_tokens: 1500,
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

/**
 * Pede o resumo ao LLM, faz o parse robusto e valida com Zod.
 */
async function summarizeWithModel(
  model: string,
  editalText: string,
): Promise<AiSummary> {
  const content = await callLLM(model, SYSTEM_PROMPT, editalText);
  const parsed = parseLooseJson(content);
  return AiSummarySchema.parse(parsed);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Cliente com service role key — bypassa RLS.
  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  let processId: string | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    processId = body?.processId;
    if (!processId || typeof processId !== "string") {
      return jsonResponse({ error: "processId is required" }, 400);
    }

    // 2. Marca como ANALYZING.
    {
      const { error } = await supabase
        .from("user_processes")
        .update({ status: "ANALYZING" })
        .eq("id", processId);
      if (error) throw new Error(`Failed to set ANALYZING: ${error.message}`);
    }

    // 3. Busca o processo + oportunidade relacionada (join).
    const { data: process, error: fetchError } = await supabase
      .from("user_processes")
      .select("id, opportunity_id, bidding_opportunities ( source_url, raw_text )")
      .eq("id", processId)
      .single();

    if (fetchError || !process) {
      throw new Error(`Process not found: ${fetchError?.message ?? processId}`);
    }

    const opportunity = Array.isArray(process.bidding_opportunities)
      ? process.bidding_opportunities[0]
      : process.bidding_opportunities;
    const sourceUrl: string | null = opportunity?.source_url ?? null;

    // 4. Baixa e extrai o texto do edital (fallback para raw_text em cache).
    let editalText = "";
    if (sourceUrl) {
      const { bytes, contentType } = await downloadSource(sourceUrl);
      editalText = await extractEditalText(bytes, contentType, sourceUrl);
    }
    if (!editalText && opportunity?.raw_text) {
      editalText = String(opportunity.raw_text).slice(0, MAX_TEXT_CHARS);
    }
    if (!editalText) {
      throw new Error("No edital text available (missing source_url/raw_text)");
    }

    // 5 + 6. Chama o modelo principal; em falha de parse/validação ou 429,
    // tenta UMA vez com o modelo de fallback.
    const primaryModel = requireEnv("OPENROUTER_MODEL");
    const fallbackModel = Deno.env.get("OPENROUTER_FALLBACK_MODEL");

    let summary: AiSummary;
    try {
      summary = await summarizeWithModel(primaryModel, editalText);
    } catch (primaryError) {
      const status = (primaryError as { status?: number })?.status;
      const isRateLimit = status === 429;
      const isParseOrValidation = primaryError instanceof z.ZodError ||
        primaryError instanceof SyntaxError;

      if (fallbackModel && (isRateLimit || isParseOrValidation)) {
        console.warn(
          `Primary model failed (${
            isRateLimit ? "429" : "parse/validation"
          }); retrying with fallback "${fallbackModel}".`,
        );
        summary = await summarizeWithModel(fallbackModel, editalText);
      } else {
        throw primaryError;
      }
    }

    // 7. Grava o resumo e avança o status.
    {
      const { error } = await supabase
        .from("user_processes")
        .update({
          ai_summary: summary,
          ai_processed_at: new Date().toISOString(),
          status: "DOCS_PENDING",
        })
        .eq("id", processId);
      if (error) throw new Error(`Failed to save summary: ${error.message}`);
    }

    return jsonResponse({ ok: true, processId, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("analyze-edital error:", message);

    // 8. Em erro persistente, marca o processo como ERROR (best-effort).
    if (processId) {
      await supabase
        .from("user_processes")
        .update({ status: "ERROR" })
        .eq("id", processId)
        .then(({ error }) => {
          if (error) console.error("Failed to set ERROR status:", error.message);
        });
    }

    return jsonResponse({ ok: false, error: message }, 500);
  }
});
