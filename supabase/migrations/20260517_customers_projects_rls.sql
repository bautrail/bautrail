alter table public.customers enable row level security;
alter table public.projects enable row level security;

drop policy if exists "customers_select_company" on public.customers;
create policy "customers_select_company"
on public.customers
for select
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = customers.company_id
  )
);

drop policy if exists "customers_insert_company" on public.customers;
create policy "customers_insert_company"
on public.customers
for insert
to authenticated
with check (
  exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = customers.company_id
      and cm.role in ('chef', 'buero', 'angestellter')
  )
);

drop policy if exists "customers_update_company" on public.customers;
create policy "customers_update_company"
on public.customers
for update
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = customers.company_id
      and cm.role in ('chef', 'buero')
  )
)
with check (
  exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = customers.company_id
      and cm.role in ('chef', 'buero')
  )
);

drop policy if exists "projects_select_company" on public.projects;
create policy "projects_select_company"
on public.projects
for select
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = projects.company_id
  )
);

drop policy if exists "projects_insert_company" on public.projects;
create policy "projects_insert_company"
on public.projects
for insert
to authenticated
with check (
  exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = projects.company_id
      and cm.role in ('chef', 'buero', 'angestellter')
  )
);

drop policy if exists "projects_update_company" on public.projects;
create policy "projects_update_company"
on public.projects
for update
to authenticated
using (
  exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = projects.company_id
      and cm.role in ('chef', 'buero')
  )
)
with check (
  exists (
    select 1 from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = projects.company_id
      and cm.role in ('chef', 'buero')
  )
);
