alter table public.company_invites enable row level security;

drop policy if exists "company_invites_select_company" on public.company_invites;
create policy "company_invites_select_company"
on public.company_invites
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = company_invites.company_id
  )
);

drop policy if exists "company_invites_insert_chef" on public.company_invites;
create policy "company_invites_insert_chef"
on public.company_invites
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = company_invites.company_id
      and cm.role = 'chef'
  )
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "company_invites_update_chef" on public.company_invites;
create policy "company_invites_update_chef"
on public.company_invites
for update
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = company_invites.company_id
      and cm.role = 'chef'
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = company_invites.company_id
      and cm.role = 'chef'
  )
);
