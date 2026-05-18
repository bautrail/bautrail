create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'company_role_enum') then
    create type company_role_enum as enum ('chef', 'buero', 'angestellter');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'timesheet_status_enum') then
    create type timesheet_status_enum as enum ('offen', 'eingereicht', 'genehmigt', 'abgelehnt');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'planning_status_enum') then
    create type planning_status_enum as enum ('offen', 'gestartet', 'erledigt');
  end if;
end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text,
  logo_url text,
  adresse text,
  plz text,
  ort text,
  telefon text,
  email text,
  website text,
  steuernummer text,
  ust_id text,
  rechtliches text,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role company_role_enum not null,
  name text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invite_code text not null unique,
  role company_role_enum not null,
  created_by uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text,
  file_url text,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_timesheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  auftrag_id uuid references public.auftraege(id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  pause_minutes int not null default 0,
  note text,
  status timesheet_status_enum not null default 'offen',
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.planning_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  auftrag_id uuid references public.auftraege(id) on delete set null,
  title text,
  description text,
  date date,
  start_time time,
  end_time time,
  status planning_status_enum not null default 'offen',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.customers add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.projects add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.auftraege add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.auftrag_material add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.project_images add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.project_documents add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists company_members_user_idx on public.company_members(user_id);
create index if not exists company_members_company_idx on public.company_members(company_id, role, active);
create index if not exists company_invites_code_idx on public.company_invites(invite_code, active);
create index if not exists customers_company_idx on public.customers(company_id);
create index if not exists projects_company_idx on public.projects(company_id);
create index if not exists auftraege_company_idx on public.auftraege(company_id);
create index if not exists auftrag_material_company_idx on public.auftrag_material(company_id);
create index if not exists project_images_company_idx on public.project_images(company_id);
create index if not exists project_documents_company_idx on public.project_documents(company_id);
create index if not exists employee_timesheets_company_status_idx on public.employee_timesheets(company_id, status, created_at desc);
create index if not exists planning_entries_company_date_idx on public.planning_entries(company_id, date, created_at desc);
