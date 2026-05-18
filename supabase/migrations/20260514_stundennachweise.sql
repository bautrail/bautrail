create extension if not exists "pgcrypto";

create table if not exists public.stundennachweise (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer text,
  project_id uuid references public.projects(id) on delete set null,
  project text,
  objekt text,
  arbeitsdatum date,
  startzeit text,
  endzeit text,
  stunden numeric(10,2),
  taetigkeit text,
  material text,
  personal text,
  fahrtkosten numeric(10,2),
  unterschrift_name text,
  unterschrift_data text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists stundennachweise_customer_id_idx
  on public.stundennachweise(customer_id);

create index if not exists stundennachweise_project_id_idx
  on public.stundennachweise(project_id);

create index if not exists stundennachweise_arbeitsdatum_idx
  on public.stundennachweise(arbeitsdatum desc);
