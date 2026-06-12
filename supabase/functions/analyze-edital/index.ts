import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf";
import { unzipSync } from "npm:fflate@0.8.2";
import { z } from "https://esm.sh/zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const OPENROUTER_MODEL = Deno.env.get("OPENROUTER_MODEL")!;
const OPENROUTER_FALLBACK_MODEL = Deno.env.get("OPENROUTER_FALLBACK_MODEL");

const MAX_TEXT_CHARS = 40_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT =
  "Você analisa editais de licitação. Retorne APENAS um objeto JSON válido, " +
  "sem markdown e sem texto extra, com objectSimplified (objeto da licitação " +
  "em 1 frase clara), importantDates (objeto com proposalDelivery e " +
  "auctionStart em ISO8601), requirements (array de strings com requisitos " +
  "técnicos impeditivos), documentsChecklist (array de documentos " +
  "obrigatórios, cada um com id uuid, item e type entre " +
  "Habilitacao|Financeiro|Proposta|Tecnico).";

const AnalysisSchema = z.object({
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

type Analysis = z.infer<typeof AnalysisSchema>;

class RateLimitError extends Error {
  constructor() {
    super("Rate limit (429) no OpenRouter");
    this.name = "RateLimitError";
  }
}

async function callLLM(
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://licitemais.com.br",
        "X-Title": "Licite Mais",
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
    },
  );

  if (response.status === 429) throw new RateLimitError();
  if (!response.ok) {
    throw new Error(`OpenRouter HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter retornou resposta vazia");
  return content;
}

/**
 * Alguns modelos devolvem o JSON dentro de cerca markdown (```json ... ```)
 * ou com texto ao redor — extrai apenas o objeto entre a primeira { e a
 * última }.
 */
function extractJson(raw: string): string {
  const withoutFences = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Resposta do modelo não contém um objeto JSON");
  }
  return withoutFences.slice(start, end + 1);
}

function parseAnalysis(raw: string): Analysis {
  return AnalysisSchema.parse(JSON.parse(extractJson(raw)));
}

async function analyzeWithFallback(editalText: string): Promise<Analysis> {
  try {
    const raw = await callLLM(OPENROUTER_MODEL, SYSTEM_PROMPT, editalText);
    return parseAnalysis(raw);
  } catch (error) {
    // Parse/validação inválidos ou 429: uma única retentativa no fallback
    if (!OPENROUTER_FALLBACK_MODEL) throw error;
    const raw = await callLLM(
      OPENROUTER_FALLBACK_MODEL,
      SYSTEM_PROMPT,
      editalText,
    );
    return parseAnalysis(raw);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isPdfBuffer(buffer: Uint8Array): boolean {
  return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44; // %PD
}

function isZipBuffer(buffer: Uint8Array): boolean {
  return buffer[0] === 0x50 && buffer[1] === 0x4b; // PK
}

async function pdfToText(buffer: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(buffer);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function downloadEditalText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Download falhou: HTTP ${response.status}`);

    const buffer = new Uint8Array(await response.arrayBuffer());

    if (isPdfBuffer(buffer)) {
      return await pdfToText(buffer);
    }

    // O PNCP entrega os editais como ZIP contendo um ou mais PDFs
    if (isZipBuffer(buffer)) {
      const entries = unzipSync(buffer);
      const pdfs = Object.entries(entries)
        .filter(([, data]) => isPdfBuffer(data))
        .sort(([, a], [, b]) => b.length - a.length); // maior primeiro (edital)
      if (pdfs.length === 0) {
        throw new Error("ZIP do edital não contém PDFs");
      }
      const texts = await Promise.all(pdfs.map(([, data]) => pdfToText(data)));
      return texts.join("\n\n");
    }

    return stripHtml(new TextDecoder().decode(buffer));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Para licitações do PNCP, a página em source_url é uma SPA sem o texto do
 * edital — o arquivo real fica no endpoint pncp-api de arquivos, derivável
 * do numeroControlePNCP (formato "cnpj-1-sequencial/ano").
 */
function buildPncpFileUrl(externalId: string): string | null {
  const match = externalId.match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  if (!match) return null;
  const [, cnpj, seq, ano] = match;
  return `https://pncp.gov.br/pncp-api/v1/orgaos/${cnpj}/compras/${ano}/${Number(seq)}/arquivos/1`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let processId: string | undefined;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    processId = body?.processId;
    if (!processId) {
      return json({ error: "processId é obrigatório" }, 400);
    }

    await supabase
      .from("user_processes")
      .update({ status: "ANALYZING" })
      .eq("id", processId);

    const { data: process, error: fetchError } = await supabase
      .from("user_processes")
      .select("id, opportunity:bidding_opportunities(*)")
      .eq("id", processId)
      .single();

    if (fetchError || !process?.opportunity) {
      throw new Error("Processo ou licitação não encontrados");
    }

    const opportunity = process.opportunity as Record<string, unknown>;

    // Tenta primeiro o arquivo real do edital (PNCP), depois o source_url
    const candidateUrls: string[] = [];
    if (opportunity.source === "PNCP" && typeof opportunity.external_id === "string") {
      const fileUrl = buildPncpFileUrl(opportunity.external_id);
      if (fileUrl) candidateUrls.push(fileUrl);
    }
    if (typeof opportunity.source_url === "string" && opportunity.source_url) {
      candidateUrls.push(opportunity.source_url);
    }

    let editalText: string | null = null;
    for (const url of candidateUrls) {
      try {
        editalText = await downloadEditalText(url);
        if (editalText && editalText.length >= 100) break;
      } catch (downloadError) {
        console.warn(`Falha ao baixar ${url}:`, downloadError);
      }
    }
    if (!editalText || editalText.length < 100) {
      // Sem edital acessível: usa os metadados que temos da licitação
      editalText = [
        opportunity.raw_text,
        opportunity.title,
        opportunity.description,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    if (!editalText) {
      throw new Error("Nenhum conteúdo de edital disponível para análise");
    }

    const analysis = await analyzeWithFallback(
      editalText.slice(0, MAX_TEXT_CHARS),
    );

    const { error: updateError } = await supabase
      .from("user_processes")
      .update({
        ai_summary: analysis,
        ai_processed_at: new Date().toISOString(),
        status: "DOCS_PENDING",
      })
      .eq("id", processId);
    if (updateError) throw updateError;

    return json({ ok: true, processId, analysis });
  } catch (error) {
    console.error("analyze-edital error:", error);

    if (processId) {
      await supabase
        .from("user_processes")
        .update({ status: "ERROR" })
        .eq("id", processId);
    }

    const message =
      error instanceof Error ? error.message : "Erro inesperado na análise";
    return json({ error: message }, 500);
  }
});
