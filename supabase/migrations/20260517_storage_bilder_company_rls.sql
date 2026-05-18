-- Storage-Sicherheit fuer Bucket "bilder"
-- Erlaubt Zugriff nur, wenn der Nutzer Mitglied der Firma des zugehoerigen Projekts ist.
-- Unterstuetzte Pfade:
-- 1) Bilder: "<project_uuid>_<...>.jpg"
-- 2) Dokumente: "documents/<project_uuid>/<...>"
-- 3) Audio: "audio/<project_uuid>/<...>"

create or replace function public.extract_project_uuid_from_storage_path(p_path text)
returns uuid
language plpgsql
immutable
as $$
declare
  v_first text;
  v_second text;
  v_candidate text;
begin
  v_first := split_part(coalesce(p_path, ''), '/', 1);
  v_second := split_part(coalesce(p_path, ''), '/', 2);

  if v_first in ('documents', 'audio') then
    if v_second ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return v_second::uuid;
    end if;
    return null;
  end if;

  v_candidate := split_part(v_first, '_', 1);
  if v_candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_candidate::uuid;
  end if;

  return null;
end;
$$;

alter table storage.objects enable row level security;

drop policy if exists "bilder_select_company" on storage.objects;
create policy "bilder_select_company"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bilder'
  and exists (
    select 1
    from public.projects p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.extract_project_uuid_from_storage_path(storage.objects.name)
      and cm.user_id = auth.uid()
      and cm.active = true
  )
);

drop policy if exists "bilder_insert_company" on storage.objects;
create policy "bilder_insert_company"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bilder'
  and exists (
    select 1
    from public.projects p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.extract_project_uuid_from_storage_path(storage.objects.name)
      and cm.user_id = auth.uid()
      and cm.active = true
  )
);

drop policy if exists "bilder_update_company" on storage.objects;
create policy "bilder_update_company"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bilder'
  and exists (
    select 1
    from public.projects p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.extract_project_uuid_from_storage_path(storage.objects.name)
      and cm.user_id = auth.uid()
      and cm.active = true
  )
)
with check (
  bucket_id = 'bilder'
  and exists (
    select 1
    from public.projects p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.extract_project_uuid_from_storage_path(storage.objects.name)
      and cm.user_id = auth.uid()
      and cm.active = true
  )
);

drop policy if exists "bilder_delete_company" on storage.objects;
create policy "bilder_delete_company"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bilder'
  and exists (
    select 1
    from public.projects p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.extract_project_uuid_from_storage_path(storage.objects.name)
      and cm.user_id = auth.uid()
      and cm.active = true
  )
);
