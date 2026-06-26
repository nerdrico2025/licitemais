// ping — Edge Function de keep-alive.
//
// Faz um SELECT trivial no banco para gerar atividade real e impedir que o
// projeto free do Supabase seja pausado por inatividade. É chamada por um
// GitHub Action agendado (.github/workflows/keepalive.yml).
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente pela
// plataforma. Esta função roda com verify_jwt = false (ver config.toml) para
// ser acessível sem cabeçalho de Authorization.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // SELECT trivial: apenas conta as oportunidades (head: true não traz linhas).
    const { count, error } = await supabase
      .from("bidding_opportunities")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, ts: new Date().toISOString(), count: count ?? 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("ping error:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
