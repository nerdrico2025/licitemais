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

> O schema e as Edge Functions ainda não foram criados — apenas a estrutura
> inicial do projeto (`supabase init`).
