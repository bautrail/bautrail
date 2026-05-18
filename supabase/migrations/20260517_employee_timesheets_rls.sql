alter table public.employee_timesheets enable row level security;

drop policy if exists "employee_timesheets_select_company" on public.employee_timesheets;
create policy "employee_timesheets_select_company"
on public.employee_timesheets
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = employee_timesheets.company_id
  )
);

drop policy if exists "employee_timesheets_insert_own" on public.employee_timesheets;
create policy "employee_timesheets_insert_own"
on public.employee_timesheets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = employee_timesheets.company_id
      and cm.role in ('angestellter', 'buero', 'chef')
  )
  and user_id = auth.uid()
);

drop policy if exists "employee_timesheets_update_team" on public.employee_timesheets;
create policy "employee_timesheets_update_team"
on public.employee_timesheets
for update
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = employee_timesheets.company_id
      and (
        cm.role in ('chef', 'buero')
        or employee_timesheets.user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.active = true
      and cm.company_id = employee_timesheets.company_id
      and (
        cm.role in ('chef', 'buero')
        or employee_timesheets.user_id = auth.uid()
      )
  )
);
