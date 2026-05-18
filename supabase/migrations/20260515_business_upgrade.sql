create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_status_enum') then
    create type project_status_enum as enum ('offen', 'in_arbeit', 'wartet_auf_material', 'abgenommen', 'abgerechnet');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'auftrag_status_enum') then
    create type auftrag_status_enum as enum ('offen', 'in_arbeit', 'wartet_auf_material', 'erledigt', 'abgerechnet');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role_enum') then
    create type user_role_enum as enum ('chef', 'mitarbeiter', 'buero', 'lesend');
  end if;
end $$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role user_role_enum not null default 'mitarbeiter',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  hourly_rate numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  role_text text,
  created_at timestamptz not null default now(),
  unique(project_id, employee_id)
);

alter table public.projects
  add column if not exists project_number text unique,
  add column if not exists status project_status_enum not null default 'offen',
  add column if not exists assigned_to uuid references public.employees(id) on delete set null,
  add column if not exists done_at timestamptz,
  add column if not exists invoice_state text not null default 'offen',
  add column if not exists invoice_total numeric(12,2) not null default 0;

alter table public.auftraege
  add column if not exists auftrag_number text unique,
  add column if not exists status auftrag_status_enum not null default 'offen',
  add column if not exists assigned_to uuid references public.employees(id) on delete set null,
  add column if not exists invoiced boolean not null default false,
  add column if not exists invoice_reference text;

alter table public.stundennachweise
  add column if not exists abrechenbar boolean not null default true,
  add column if not exists abgerechnet boolean not null default false,
  add column if not exists stundensatz numeric(10,2) not null default 0,
  add column if not exists netto_summe numeric(12,2) not null default 0,
  add column if not exists invoice_reference text;

alter table public.trash_items
  add column if not exists restore_until timestamptz not null default (now() + interval '30 days'),
  add column if not exists purged boolean not null default false;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id text not null,
  action text not null,
  changed_by text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.gen_project_number()
returns trigger
language plpgsql
as $$
declare
  next_id bigint;
begin
  if new.project_number is null or new.project_number = '' then
    select coalesce(max((regexp_replace(project_number, '\D', '', 'g'))::bigint), 0) + 1
      into next_id
      from public.projects
      where project_number ~ '^PRJ-\d+$';

    new.project_number := 'PRJ-' || lpad(next_id::text, 6, '0');
  end if;
  return new;
end;
$$;

create or replace function public.gen_auftrag_number()
returns trigger
language plpgsql
as $$
declare
  next_id bigint;
begin
  if new.auftrag_number is null or new.auftrag_number = '' then
    select coalesce(max((regexp_replace(auftrag_number, '\D', '', 'g'))::bigint), 0) + 1
      into next_id
      from public.auftraege
      where auftrag_number ~ '^AFT-\d+$';

    new.auftrag_number := 'AFT-' || lpad(next_id::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_projects_number on public.projects;
create trigger trg_projects_number
before insert on public.projects
for each row
execute function public.gen_project_number();

drop trigger if exists trg_auftraege_number on public.auftraege;
create trigger trg_auftraege_number
before insert on public.auftraege
for each row
execute function public.gen_auftrag_number();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log(table_name, row_id, action, after_data)
    values (tg_table_name, coalesce(new.id::text, ''), 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log(table_name, row_id, action, before_data, after_data)
    values (tg_table_name, coalesce(new.id::text, ''), 'update', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log(table_name, row_id, action, before_data)
    values (tg_table_name, coalesce(old.id::text, ''), 'delete', to_jsonb(old));
    return old;
  end if;
end;
$$;

drop trigger if exists trg_projects_audit on public.projects;
create trigger trg_projects_audit
after insert or update or delete on public.projects
for each row
execute function public.audit_row_change();

drop trigger if exists trg_auftraege_audit on public.auftraege;
create trigger trg_auftraege_audit
after insert or update or delete on public.auftraege
for each row
execute function public.audit_row_change();

drop trigger if exists trg_stundennachweise_audit on public.stundennachweise;
create trigger trg_stundennachweise_audit
after insert or update or delete on public.stundennachweise
for each row
execute function public.audit_row_change();

create or replace view public.global_search_items as
select
  'customer'::text as item_type,
  c.id::text as item_id,
  coalesce(c.firma, trim(coalesce(c.vorname, '') || ' ' || coalesce(c.nachname, ''))) as title,
  coalesce(c.email, '') as subtitle,
  c.created_at
from public.customers c
union all
select
  'project'::text as item_type,
  p.id::text as item_id,
  coalesce(p.project_number, '') || ' ' || coalesce(p.name, '') as title,
  coalesce(p.customer, '') as subtitle,
  p.created_at
from public.projects p
union all
select
  'auftrag'::text as item_type,
  a.id::text as item_id,
  coalesce(a.auftrag_number, '') || ' ' || coalesce(a.project, '') as title,
  coalesce(a.customer, '') as subtitle,
  a.created_at
from public.auftraege a
union all
select
  'nachweis'::text as item_type,
  s.id::text as item_id,
  'SN ' || coalesce(s.objekt, '') as title,
  coalesce(s.customer, '') as subtitle,
  s.created_at
from public.stundennachweise s;

create index if not exists projects_status_idx on public.projects(status);
create index if not exists auftraege_status_idx on public.auftraege(status);
create index if not exists audit_log_table_row_idx on public.audit_log(table_name, row_id, created_at desc);
create index if not exists trash_items_restore_until_idx on public.trash_items(restore_until, purged);
