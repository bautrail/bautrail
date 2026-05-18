create or replace function public.delete_current_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_member_user_ids uuid[] := array[]::uuid[];
  v_delete_user_ids uuid[] := array[]::uuid[];
  v_customer_ids uuid[] := array[]::uuid[];
  v_project_ids uuid[] := array[]::uuid[];
  v_auftrag_ids uuid[] := array[]::uuid[];
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

  if v_company_id is null or v_role <> 'chef' then
    delete from auth.users where id = v_user_id;
    return;
  end if;

  select coalesce(array_agg(distinct user_id), array[]::uuid[])
    into v_member_user_ids
    from public.company_members
    where company_id = v_company_id
      and user_id is not null;

  select coalesce(array_agg(distinct cm.user_id), array[]::uuid[])
    into v_delete_user_ids
    from public.company_members cm
    where cm.company_id = v_company_id
      and cm.user_id is not null
      and (
        cm.user_id = v_user_id
        or not exists (
          select 1
          from public.company_members other_cm
          where other_cm.user_id = cm.user_id
            and other_cm.company_id <> v_company_id
            and other_cm.active = true
        )
      );

  select coalesce(array_agg(id), array[]::uuid[])
    into v_customer_ids
    from public.customers
    where company_id = v_company_id;

  select coalesce(array_agg(id), array[]::uuid[])
    into v_project_ids
    from public.projects
    where company_id = v_company_id;

  select coalesce(array_agg(id), array[]::uuid[])
    into v_auftrag_ids
    from public.auftraege
    where company_id = v_company_id;

  delete from storage.objects
    where bucket_id = 'bilder'
      and public.extract_project_uuid_from_storage_path(name) = any(v_project_ids);

  delete from public.trash_items
    where payload::text like '%' || v_company_id::text || '%'
       or source_id in (select unnest(v_customer_ids)::text)
       or source_id in (select unnest(v_project_ids)::text)
       or source_id in (select unnest(v_auftrag_ids)::text);

  delete from public.project_audio
    where company_id = v_company_id
       or project_id = any(v_project_ids);

  delete from public.project_documents
    where company_id = v_company_id
       or project_id = any(v_project_ids);

  delete from public.project_images
    where company_id = v_company_id
       or project_id = any(v_project_ids);

  delete from public.project_folders
    where company_id = v_company_id
       or project_id = any(v_project_ids);

  delete from public.auftrag_material
    where company_id = v_company_id
       or auftrag_id = any(v_auftrag_ids);

  delete from public.stundennachweise
    where company_id = v_company_id
       or customer_id = any(v_customer_ids)
       or project_id = any(v_project_ids);

  delete from public.employee_timesheets
    where company_id = v_company_id
       or user_id = any(v_member_user_ids)
       or project_id = any(v_project_ids)
       or auftrag_id = any(v_auftrag_ids);

  delete from public.planning_entries
    where company_id = v_company_id
       or assigned_to = any(v_member_user_ids)
       or created_by = any(v_member_user_ids)
       or project_id = any(v_project_ids)
       or auftrag_id = any(v_auftrag_ids);

  delete from public.auftraege
    where company_id = v_company_id
       or id = any(v_auftrag_ids);

  delete from public.projects
    where company_id = v_company_id
       or id = any(v_project_ids);

  delete from public.customers
    where company_id = v_company_id
       or id = any(v_customer_ids);

  delete from public.company_documents
    where company_id = v_company_id;

  delete from public.company_invites
    where company_id = v_company_id;

  delete from public.company_members
    where company_id = v_company_id;

  delete from public.audit_log
    where before_data::text like '%' || v_company_id::text || '%'
       or after_data::text like '%' || v_company_id::text || '%'
       or row_id in (select unnest(v_customer_ids)::text)
       or row_id in (select unnest(v_project_ids)::text)
       or row_id in (select unnest(v_auftrag_ids)::text)
       or row_id = v_company_id::text;

  delete from public.companies
    where id = v_company_id;

  delete from auth.users
    where id = any(v_delete_user_ids);
end;
$$;

revoke all on function public.delete_current_user_account() from public;
grant execute on function public.delete_current_user_account() to authenticated;
