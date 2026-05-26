create or replace function public.reject_company_report(p_report_id uuid, p_note text default null)
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

  select s.company_id
    into v_company_id
    from public.stundennachweise s
    join public.company_members cm
      on cm.company_id = s.company_id
     and cm.user_id = v_actor_id
     and cm.active = true
     and cm.role in ('chef', 'buero')
    where s.id = p_report_id
    limit 1;

  if v_company_id is null then
    raise exception 'Nur Chef oder Buero darf Stundennachweise ablehnen.';
  end if;

  update public.stundennachweise
    set review_status = 'abgelehnt',
        reviewed_by = v_actor_id,
        reviewed_at = now(),
        deleted_at = coalesce(deleted_at, now()),
        deleted_by = coalesce(deleted_by, v_actor_id),
        delete_reason = coalesce(nullif(p_note, ''), delete_reason, 'Vom Chef abgelehnt'),
        billing_note = coalesce(nullif(p_note, ''), billing_note)
    where id = p_report_id
      and company_id = v_company_id;
end;
$$;

revoke all on function public.reject_company_report(uuid, text) from public;
grant execute on function public.reject_company_report(uuid, text) to authenticated;

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

  if p_status = 'abgelehnt' then
    perform public.reject_company_report(p_report_id, p_note);
    return;
  end if;

  select s.company_id
    into v_company_id
    from public.stundennachweise s
    join public.company_members cm
      on cm.company_id = s.company_id
     and cm.user_id = v_actor_id
     and cm.active = true
     and cm.role in ('chef', 'buero')
    where s.id = p_report_id
    limit 1;

  if v_company_id is null then
    raise exception 'Nur Chef oder Buero darf Stundennachweise pruefen oder abrechnen.';
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
