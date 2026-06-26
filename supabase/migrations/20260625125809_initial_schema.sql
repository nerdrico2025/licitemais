-- Licite Mais — initial schema
-- profiles, bidding_opportunities (shared cache), user_processes
-- + handle_new_user trigger, RLS policies and Realtime.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  company_profile jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Shared cache of opportunities fetched from PNCP / COMPRASNET.
create table public.bidding_opportunities (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  source text not null check (source in ('PNCP', 'COMPRASNET')),
  title text not null,
  description text,
  agency text,
  uasg text,
  opening_date timestamptz,
  proposal_deadline timestamptz,
  bidding_mode text,
  estimated_value numeric,
  uf char(2),
  source_url text,
  raw_text text,
  fetched_at timestamptz default now()
);

create table public.user_processes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  opportunity_id uuid not null references public.bidding_opportunities (id),
  status text not null default 'SAVED' check (
    status in (
      'SAVED', 'ANALYZING', 'DOCS_PENDING', 'READY_TO_BID',
      'SUBMITTED', 'WON', 'LOST', 'ERROR'
    )
  ),
  ai_summary jsonb,
  ai_processed_at timestamptz,
  checklist_state jsonb default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, opportunity_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index user_processes_user_id_status_idx
  on public.user_processes (user_id, status);

create index user_processes_user_id_created_at_idx
  on public.user_processes (user_id, created_at);

-- ---------------------------------------------------------------------------
-- New user trigger: create a profile row for every new auth.users entry.
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.bidding_opportunities enable row level security;
alter table public.user_processes enable row level security;

-- profiles: owner can read and update their own row.
create policy "Profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Profiles are updatable by owner"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- bidding_opportunities: shared cache — any authenticated user may read/insert.
create policy "Opportunities are viewable by authenticated users"
  on public.bidding_opportunities for select
  to authenticated
  using (true);

create policy "Opportunities are insertable by authenticated users"
  on public.bidding_opportunities for insert
  to authenticated
  with check (true);

-- user_processes: full access restricted to the owning user.
create policy "Users manage their own processes"
  on public.user_processes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: stream user_processes changes via the supabase_realtime publication.
-- REPLICA IDENTITY FULL so UPDATE/DELETE events carry the previous row values.
-- ---------------------------------------------------------------------------

alter table public.user_processes replica identity full;
alter publication supabase_realtime add table public.user_processes;
