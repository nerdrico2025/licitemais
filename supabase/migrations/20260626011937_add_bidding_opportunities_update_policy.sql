-- bidding_opportunities é um cache compartilhado de licitações públicas. A tabela
-- já permite SELECT e INSERT para usuários autenticados, mas faltava a policy de
-- UPDATE — o que fazia o upsert (insert ... on conflict do update) de
-- useCreateProcess falhar via RLS ao re-monitorar uma oportunidade já cacheada.
--
-- A tabela não tem coluna de dono nem PII, então liberar UPDATE para
-- authenticated não expõe dados de nenhum usuário (ver auditoria de RLS).

create policy "Opportunities are updatable by authenticated users"
  on public.bidding_opportunities for update
  to authenticated
  using (true)
  with check (true);
