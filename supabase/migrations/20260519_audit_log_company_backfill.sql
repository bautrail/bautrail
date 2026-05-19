with project_company as (
  select al.id, p.company_id
  from public.audit_log al
  join public.projects p
    on al.table_name = 'projects'
   and p.id::text = al.row_id
  where p.company_id is not null
),
auftrag_company as (
  select al.id, a.company_id
  from public.audit_log al
  join public.auftraege a
    on al.table_name = 'auftraege'
   and a.id::text = al.row_id
  where a.company_id is not null
),
stundennachweis_company as (
  select al.id, s.company_id
  from public.audit_log al
  join public.stundennachweise s
    on al.table_name = 'stundennachweise'
   and s.id::text = al.row_id
  where s.company_id is not null
),
customer_company as (
  select al.id, c.company_id
  from public.audit_log al
  join public.customers c
    on al.table_name = 'customers'
   and c.id::text = al.row_id
  where c.company_id is not null
),
resolved as (
  select * from project_company
  union all
  select * from auftrag_company
  union all
  select * from stundennachweis_company
  union all
  select * from customer_company
)
update public.audit_log al
set
  before_data = case
    when al.before_data is null then null
    when coalesce(al.before_data ->> 'company_id', '') <> '' then al.before_data
    else jsonb_set(al.before_data, '{company_id}', to_jsonb(resolved.company_id::text), true)
  end,
  after_data = case
    when al.after_data is null then null
    when coalesce(al.after_data ->> 'company_id', '') <> '' then al.after_data
    else jsonb_set(al.after_data, '{company_id}', to_jsonb(resolved.company_id::text), true)
  end
from resolved
where resolved.id = al.id;
