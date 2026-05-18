alter table public.companies
  add column if not exists daily_report_time time not null default '17:30',
  add column if not exists timesheet_time time not null default '17:45',
  add column if not exists daily_report_reminder_enabled boolean not null default true,
  add column if not exists timesheet_reminder_enabled boolean not null default true;

create or replace function public.set_company_member_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_company_id uuid;
  v_old_role text;
  v_chef_count integer;
begin
  if v_actor_id is null then
    raise exception 'Nicht angemeldet.';
  end if;

  if p_role not in ('chef', 'buero', 'angestellter') then
    raise exception 'Unbekannte Rolle.';
  end if;

  select target.company_id, target.role::text
    into v_company_id, v_old_role
    from public.company_members target
    join public.company_members actor
      on actor.company_id = target.company_id
     and actor.user_id = v_actor_id
     and actor.active = true
     and actor.role = 'chef'
    where target.id = p_member_id
    limit 1;

  if v_company_id is null then
    raise exception 'Nur ein Chef darf Rollen in seiner Firma ändern.';
  end if;

  if v_old_role = 'chef' and p_role <> 'chef' then
    select count(*)
      into v_chef_count
      from public.company_members
      where company_id = v_company_id
        and role = 'chef'
        and active = true;

    if v_chef_count <= 1 then
      raise exception 'Der letzte aktive Chef kann nicht geändert werden.';
    end if;
  end if;

  update public.company_members
    set role = p_role::public.company_role_enum
    where id = p_member_id
      and company_id = v_company_id;
end;
$$;

revoke all on function public.set_company_member_role(uuid, text) from public;
grant execute on function public.set_company_member_role(uuid, text) to authenticated;

create or replace function public.set_company_member_active(p_member_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_company_id uuid;
  v_old_role text;
  v_old_active boolean;
  v_chef_count integer;
begin
  if v_actor_id is null then
    raise exception 'Nicht angemeldet.';
  end if;

  select target.company_id, target.role::text, target.active
    into v_company_id, v_old_role, v_old_active
    from public.company_members target
    join public.company_members actor
      on actor.company_id = target.company_id
     and actor.user_id = v_actor_id
     and actor.active = true
     and actor.role = 'chef'
    where target.id = p_member_id
    limit 1;

  if v_company_id is null then
    raise exception 'Nur ein Chef darf Mitarbeiter aktivieren oder deaktivieren.';
  end if;

  if v_old_role = 'chef' and v_old_active = true and p_active = false then
    select count(*)
      into v_chef_count
      from public.company_members
      where company_id = v_company_id
        and role = 'chef'
        and active = true;

    if v_chef_count <= 1 then
      raise exception 'Der letzte aktive Chef kann nicht deaktiviert werden.';
    end if;
  end if;

  update public.company_members
    set active = p_active
    where id = p_member_id
      and company_id = v_company_id;
end;
$$;

revoke all on function public.set_company_member_active(uuid, boolean) from public;
grant execute on function public.set_company_member_active(uuid, boolean) to authenticated;
