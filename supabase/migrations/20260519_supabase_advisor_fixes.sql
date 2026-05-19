create or replace function public.audit_log_company_id(p_before jsonb, p_after jsonb)
returns uuid
language sql
stable
as $$
  select nullif(coalesce(p_after ->> 'company_id', p_before ->> 'company_id'), '')::uuid
$$;

alter table if exists public.audit_log enable row level security;

revoke all on public.audit_log from anon;
revoke all on public.audit_log from authenticated;

drop policy if exists "audit_log_select_company" on public.audit_log;
create policy "audit_log_select_company" on public.audit_log
for select to authenticated
using (
  public.current_user_company_role(
    public.audit_log_company_id(audit_log.before_data, audit_log.after_data)
  ) is not null
);

drop policy if exists "audit_log_block_write" on public.audit_log;
create policy "audit_log_block_write" on public.audit_log
for all to authenticated
using (false)
with check (false);

drop view if exists public.global_search_items;
create view public.global_search_items
with (security_invoker = true) as
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

grant select on public.global_search_items to authenticated;
revoke all on public.global_search_items from anon;
