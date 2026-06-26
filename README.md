# Licite Mais

Aplicativo mobile (Expo / React Native) com backend Supabase para acompanhamento
de licitações e processos.

## Stack

- **Expo SDK 56** + React Native 0.85 + TypeScript
- **Expo Router** — navegação por arquivos com grupos `(auth)` e `(app)`
- **NativeWind v4** (Tailwind CSS) — estilização
- **Zustand** — estado global
- **TanStack Query** — data fetching / cache
- **Supabase** (`@supabase/supabase-js`) — auth + banco de dados
- **React Hook Form + Zod** — formulários e validação
- **expo-secure-store**, **AsyncStorage**, **expo-web-browser**

## Estrutura

```
app/                 # Rotas (Expo Router)
  (auth)/            #   fluxo não autenticado
  (app)/             #   fluxo autenticado
components/          # Componentes compartilhados
  ui/                #   primitivos de UI
hooks/               # React hooks
services/            # Clientes externos (supabase.ts, etc.)
stores/              # Stores Zustand
types/               # Tipos compartilhados
supabase/            # Projeto Supabase (config, migrations, functions)
```

O entry (`index.ts`) carrega o polyfill de URL **antes** do Expo Router, exigido
pelo `@supabase/supabase-js` no React Native.

## Setup

1. **Instale as dependências**

   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente**

   ```bash
   cp .env.example .env
   ```

   Preencha com os valores do seu projeto Supabase
   (Project Settings → API). Use a chave **anon** (nunca a `service_role`):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   ```

3. **Rode o app**

   ```bash
   npm run start      # Expo Dev Server (escolha iOS / Android / Web)
   npm run ios
   npm run android
   npm run web
   ```

## Supabase (local)

A pasta `supabase/` é gerenciada pela [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
supabase start     # sobe o stack local (Docker)
supabase status    # mostra URLs e chaves locais
supabase stop
```

### Edge Functions

- **`analyze-edital`** — analisa o edital de uma licitação com IA (OpenRouter).
- **`ping`** — keep-alive: faz um `SELECT` trivial no banco e retorna `200`.

Deploy:

```bash
supabase functions deploy analyze-edital
supabase functions deploy ping
```

> A `ping` roda com `verify_jwt = false` (ver `supabase/config.toml`) para ser
> acessível sem cabeçalho de `Authorization`.

## Keep-alive (evitar pausa por inatividade)

Projetos no plano free do Supabase são **pausados após ~7 dias sem atividade**.
O workflow [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml)
roda a cada 3 dias (e pode ser disparado manualmente em **Actions →
Keepalive → Run workflow**) e faz um `curl` na Edge Function `ping`, gerando
atividade real no banco.

Para funcionar, configure **um secret no repositório do GitHub**:

1. No GitHub, vá em **Settings → Secrets and variables → Actions → New
   repository secret**.
2. Crie o secret:

   | Name           | Value                                  |
   | -------------- | -------------------------------------- |
   | `SUPABASE_URL` | `https://seu-projeto.supabase.co`      |

   (a URL do projeto, **sem** barra no final — a mesma de
   `EXPO_PUBLIC_SUPABASE_URL`).

O job chama `"$SUPABASE_URL/functions/v1/ping"` com `curl --fail`, então a
execução falha caso a função esteja fora do ar — útil como monitor simples.
