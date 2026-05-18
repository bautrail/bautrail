alter table public.stundennachweise
  add column if not exists review_status text not null default 'offen',
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists billed_at timestamptz,
  add column if not exists billing_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stundennachweise_review_status_check'
      and conrelid = 'public.stundennachweise'::regclass
  ) then
    alter table public.stundennachweise
      add constraint stundennachweise_review_status_check
      check (review_status in ('offen', 'geprueft', 'abgelehnt', 'abgerechnet'));
  end if;
end $$;

update public.stundennachweise
set review_status = case when abgerechnet = true then 'abgerechnet' else review_status end
where abgerechnet = true;

create index if not exists stundennachweise_company_review_idx
  on public.stundennachweise(company_id, review_status, arbeitsdatum desc);

create or replace function public.review_company_report(p_report_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_company_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Nicht angemeldet.';
  end if;

  if p_status not in ('offen', 'geprueft', 'abgelehnt', 'abgerechnet') then
    raise exception 'Unbekannter Status.';
  end if;

  select s.company_id
    into v_company_id
    from public.stundennachweise s
    join public.company_members cm
      on cm.company_id = s.company_id
     and cm.user_id = v_actor_id
     and cm.active = true
     and cm.role = 'chef'
    where s.id = p_report_id
    limit 1;

  if v_company_id is null then
    raise exception 'Nur ein Chef darf Stundennachweise prüfen oder abrechnen.';
  end if;

  update public.stundennachweise
    set review_status = p_status,
        reviewed_by = v_actor_id,
        reviewed_at = now(),
        abgerechnet = case when p_status = 'abgerechnet' then true else abgerechnet end,
        billed_at = case when p_status = 'abgerechnet' then now() else billed_at end,
        billing_note = coalesce(p_note, billing_note)
    where id = p_report_id
      and company_id = v_company_id;
end;
$$;

revoke all on function public.review_company_report(uuid, text, text) from public;
grant execute on function public.review_company_report(uuid, text, text) to authenticated;
