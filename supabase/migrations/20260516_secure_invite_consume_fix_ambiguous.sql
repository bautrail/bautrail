create or replace function public.consume_company_invite(p_invite_code text, p_requested_role text default null)
returns table(ok boolean, message text, out_company_id uuid, out_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_invite public.company_invites%rowtype;
  v_role text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return query select false, 'Keine Session gefunden.', null::uuid, null::text;
    return;
  end if;

  select u.email
    into v_user_email
    from auth.users u
    where u.id = v_user_id;

  select i.*
    into v_invite
    from public.company_invites i
    where upper(i.invite_code) = upper(trim(coalesce(p_invite_code, '')))
      and i.active = true
      and (i.expires_at is null or i.expires_at > now())
    limit 1;

  if v_invite.id is null then
    return query select false, 'Einladungscode ungueltig oder abgelaufen.', null::uuid, null::text;
    return;
  end if;

  v_role := v_invite.role::text;
  if coalesce(trim(p_requested_role), '') <> '' and lower(trim(p_requested_role)) <> lower(v_role) then
    return query select false, 'Code passt nicht zur ausgewaehlten Rolle.', null::uuid, null::text;
    return;
  end if;

  insert into public.company_members (company_id, user_id, role, email, active)
  values (v_invite.company_id, v_user_id, v_invite.role, coalesce(v_user_email, ''), true)
  on conflict (company_id, user_id)
  do update
    set role = excluded.role,
        active = true,
        email = case when excluded.email <> '' then excluded.email else company_members.email end;

  update public.company_invites ci
    set active = false,
        used_at = now()
    where ci.id = v_invite.id;

  return query select true, 'Firma verknuepft.', v_invite.company_id, v_role;
end;
$$;
