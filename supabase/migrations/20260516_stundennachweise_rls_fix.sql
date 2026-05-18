alter table public.stundennachweise enable row level security;

drop policy if exists "stundennachweise_select_company" on public.stundennachweise;
create policy "stundennachweise_select_company"
on public.stundennachweise
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = stundennachweise.company_id
  )
);

drop policy if exists "stundennachweise_insert_company" on public.stundennachweise;
create policy "stundennachweise_insert_company"
on public.stundennachweise
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = stundennachweise.company_id
  )
  and (
    created_by is null
    or created_by = auth.uid()
  )
);

drop policy if exists "stundennachweise_update_company" on public.stundennachweise;
create policy "stundennachweise_update_company"
on public.stundennachweise
for update
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = stundennachweise.company_id
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = stundennachweise.company_id
  )
);
