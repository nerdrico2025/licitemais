# Licite Mais

App mobile (Expo + React Native) com backend Supabase.

## Stack

- **Expo SDK 56** + TypeScript
- **Expo Router** — navegação por arquivos, grupos `(auth)` e `(app)`
- **NativeWind 4** (Tailwind CSS 3) — estilização
- **Zustand** — estado global
- **TanStack React Query** — cache e data fetching
- **Supabase** — auth, banco e edge functions
- **React Hook Form + Zod** — formulários e validação

## Setup

1. Instale as dependências:

   ```bash
   npm install --legacy-peer-deps
   ```

2. Copie o arquivo de ambiente e preencha com as credenciais do seu projeto Supabase (Dashboard → Settings → API):

   ```bash
   cp .env.example .env
   ```

3. Inicie o app:

   ```bash
   npx expo start
   ```

## Supabase local (opcional)

Requer Docker e a [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase start          # sobe o stack local
supabase db reset       # aplica as migrations
supabase functions serve # roda as edge functions localmente
```

## Keepalive (GitHub Actions)

O workflow [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) faz, a cada 3 dias, um `curl` na Edge Function `ping` (`supabase/functions/ping`), que executa um `SELECT` trivial no banco. Isso gera atividade real no projeto e evita que o plano free do Supabase seja pausado por inatividade.

Para configurar:

1. No GitHub, vá em **Settings → Secrets and variables → Actions → New repository secret**.
2. Crie o secret `SUPABASE_URL` com a URL do seu projeto (Dashboard → Settings → API → Project URL), por exemplo `https://xxxxxxxx.supabase.co`.
3. (Opcional) Para testar manualmente, rode o workflow via aba **Actions → Keepalive → Run workflow** (`workflow_dispatch`).

A função `ping` não exige autenticação (`verify_jwt = false` em `supabase/config.toml`), então nenhuma outra credencial é necessária.

## Estrutura

```
app/            # rotas (Expo Router)
  (auth)/       # telas públicas (login etc.)
  (app)/        # telas autenticadas
components/     # componentes compartilhados
  ui/           # componentes de UI base
hooks/          # hooks customizados
services/       # clientes externos (supabase.ts)
stores/         # stores Zustand
types/          # tipos compartilhados
supabase/       # config, migrations e functions
```
