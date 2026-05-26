create extension if not exists "pgcrypto";

create table if not exists public.circuit_symbols (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  detail text not null default 'Eigenes Symbol',
  icon text not null,
  symbol_group text not null default 'Eigene Symbole',
  elements jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.circuit_symbols
  add column if not exists elements jsonb not null default '[]'::jsonb,
  add column if not exists symbol_group text not null default 'Eigene Symbole';

create unique index if not exists circuit_symbols_company_label_unique
  on public.circuit_symbols(company_id, lower(label));

create index if not exists circuit_symbols_company_idx
  on public.circuit_symbols(company_id, label);

create table if not exists public.circuit_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  project_id uuid references public.projects(id) on delete set null,
  auftrag_id uuid references public.auftraege(id) on delete set null,
  status text not null default 'draft',
  title text not null,
  plan_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.circuit_plans
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists customer_name text,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists auftrag_id uuid references public.auftraege(id) on delete set null,
  add column if not exists status text not null default 'draft';

create index if not exists circuit_plans_company_updated_idx
  on public.circuit_plans(company_id, updated_at desc);

create index if not exists circuit_plans_customer_idx
  on public.circuit_plans(company_id, customer_id, updated_at desc)
  where customer_id is not null;

create index if not exists circuit_plans_auftrag_idx
  on public.circuit_plans(company_id, auftrag_id, updated_at desc)
  where auftrag_id is not null;

create index if not exists circuit_plans_created_by_idx
  on public.circuit_plans(company_id, created_by, updated_at desc)
  where created_by is not null;

alter table public.circuit_symbols enable row level security;
alter table public.circuit_plans enable row level security;

drop policy if exists "circuit_symbols_select_company" on public.circuit_symbols;
create policy "circuit_symbols_select_company" on public.circuit_symbols
for select to authenticated
using (public.current_user_company_role(circuit_symbols.company_id) is not null);

drop policy if exists "circuit_symbols_write_company" on public.circuit_symbols;
create policy "circuit_symbols_write_company" on public.circuit_symbols
for all to authenticated
using (public.current_user_company_role(circuit_symbols.company_id) in ('chef','buero','angestellter'))
with check (public.current_user_company_role(circuit_symbols.company_id) in ('chef','buero','angestellter'));

drop policy if exists "circuit_plans_select_company" on public.circuit_plans;
create policy "circuit_plans_select_company" on public.circuit_plans
for select to authenticated
using (public.current_user_company_role(circuit_plans.company_id) is not null);

drop policy if exists "circuit_plans_write_company" on public.circuit_plans;
create policy "circuit_plans_write_company" on public.circuit_plans
for all to authenticated
using (public.current_user_company_role(circuit_plans.company_id) in ('chef','buero','angestellter'))
with check (public.current_user_company_role(circuit_plans.company_id) in ('chef','buero','angestellter'));
