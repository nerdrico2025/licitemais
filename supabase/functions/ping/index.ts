import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * Keepalive: faz um SELECT trivial para gerar atividade real no banco
 * e evitar que o projeto free do Supabase seja pausado por inatividade.
 */
Deno.serve(async () => {
  const { error } = await supabase
    .from("bidding_opportunities")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, pinged_at: new Date().toISOString() }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
