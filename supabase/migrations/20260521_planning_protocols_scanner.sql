create extension if not exists "pgcrypto";

alter table public.planning_entries
  add column if not exists entry_type text not null default 'assignment',
  add column if not exists absence_type text,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists customer text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'planning_entries_entry_type_check'
      and conrelid = 'public.planning_entries'::regclass
  ) then
    alter table public.planning_entries
      add constraint planning_entries_entry_type_check
      check (entry_type in ('assignment', 'absence'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'planning_entries_absence_type_check'
      and conrelid = 'public.planning_entries'::regclass
  ) then
    alter table public.planning_entries
      add constraint planning_entries_absence_type_check
      check (absence_type is null or absence_type in ('krank', 'urlaub', 'abwesend'));
  end if;
end $$;

create index if not exists planning_entries_company_type_date_idx
  on public.planning_entries(company_id, entry_type, date);

create index if not exists planning_entries_customer_idx
  on public.planning_entries(company_id, customer_id, date)
  where customer_id is not null;

alter table public.stundennachweise
  add column if not exists auftrag_id uuid references public.auftraege(id) on delete set null,
  add column if not exists protocol_template_id uuid,
  add column if not exists protocol_title text,
  add column if not exists protocol_data jsonb not null default '{}'::jsonb,
  add column if not exists protocol_send_to_customer boolean not null default false;

create table if not exists public.protocol_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  category text,
  fields jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stundennachweise
  drop constraint if exists stundennachweise_protocol_template_fk;

alter table public.stundennachweise
  add constraint stundennachweise_protocol_template_fk
  foreign key (protocol_template_id)
  references public.protocol_templates(id)
  on delete set null;

create index if not exists protocol_templates_company_active_idx
  on public.protocol_templates(company_id, active, title);

create index if not exists stundennachweise_auftrag_idx
  on public.stundennachweise(company_id, auftrag_id)
  where auftrag_id is not null;

create index if not exists stundennachweise_protocol_idx
  on public.stundennachweise(company_id, protocol_template_id)
  where protocol_template_id is not null;

alter table public.protocol_templates enable row level security;

drop policy if exists "protocol_templates_select_company" on public.protocol_templates;
create policy "protocol_templates_select_company" on public.protocol_templates
for select to authenticated
using (
  public.current_user_company_role(protocol_templates.company_id) in ('chef','buero')
  or (
    protocol_templates.active = true
    and public.current_user_company_role(protocol_templates.company_id) is not null
  )
);

drop policy if exists "protocol_templates_insert_manager" on public.protocol_templates;
create policy "protocol_templates_insert_manager" on public.protocol_templates
for insert to authenticated
with check (
  public.current_user_company_role(protocol_templates.company_id) in ('chef','buero')
  and (protocol_templates.created_by is null or protocol_templates.created_by = auth.uid())
);

drop policy if exists "protocol_templates_update_manager" on public.protocol_templates;
create policy "protocol_templates_update_manager" on public.protocol_templates
for update to authenticated
using (public.current_user_company_role(protocol_templates.company_id) in ('chef','buero'))
with check (public.current_user_company_role(protocol_templates.company_id) in ('chef','buero'));

drop policy if exists "protocol_templates_delete_manager" on public.protocol_templates;
create policy "protocol_templates_delete_manager" on public.protocol_templates
for delete to authenticated
using (public.current_user_company_role(protocol_templates.company_id) in ('chef','buero'));
