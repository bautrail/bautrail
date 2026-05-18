create or replace function public.delete_current_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_active_chef_count integer;
begin
  if v_user_id is null then
    raise exception 'Nicht angemeldet.';
  end if;

  select company_id, role::text
    into v_company_id, v_role
    from public.company_members
    where user_id = v_user_id
      and active = true
    order by created_at asc
    limit 1;

  if v_company_id is not null and v_role = 'chef' then
    select count(*)
      into v_active_chef_count
      from public.company_members
      where company_id = v_company_id
        and role = 'chef'
        and active = true;

    if v_active_chef_count <= 1 then
      raise exception 'Der letzte Chef einer Firma kann nicht geloescht werden.';
    end if;
  end if;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_current_user_account() from public;
grant execute on function public.delete_current_user_account() to authenticated;

create or replace function public.delete_company_member_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
  v_company_id uuid;
  v_target_role text;
  v_active_chef_count integer;
begin
  if v_actor_id is null then
    raise exception 'Nicht angemeldet.';
  end if;

  select target.company_id, target.role::text
    into v_company_id, v_target_role
    from public.company_members target
    join public.company_members actor
      on actor.company_id = target.company_id
     and actor.user_id = v_actor_id
     and actor.active = true
     and actor.role = 'chef'
    where target.user_id = p_user_id
    limit 1;

  if v_company_id is null then
    raise exception 'Kein loeschbarer Account in deiner Firma gefunden.';
  end if;

  if v_target_role = 'chef' then
    select count(*)
      into v_active_chef_count
      from public.company_members
      where company_id = v_company_id
        and role = 'chef'
        and active = true;

    if v_active_chef_count <= 1 then
      raise exception 'Der letzte Chef einer Firma kann nicht geloescht werden.';
    end if;
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.delete_company_member_account(uuid) from public;
grant execute on function public.delete_company_member_account(uuid) to authenticated;