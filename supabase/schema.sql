create table if not exists public.crm_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sellers jsonb not null default '[]'::jsonb,
  sales jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[{"nome":"Meta Geral","tipo":"Equipe","valor_meta":0,"valor_realizado":0}]'::jsonb,
  profile jsonb not null default '{"name":"Seu Nome","role":"Seu cargo","sellerId":""}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.crm_snapshots enable row level security;

drop policy if exists "crm_snapshots_select_own" on public.crm_snapshots;
create policy "crm_snapshots_select_own"
on public.crm_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "crm_snapshots_insert_own" on public.crm_snapshots;
create policy "crm_snapshots_insert_own"
on public.crm_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "crm_snapshots_update_own" on public.crm_snapshots;
create policy "crm_snapshots_update_own"
on public.crm_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
