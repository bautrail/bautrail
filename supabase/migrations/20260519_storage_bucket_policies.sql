create or replace function public.user_can_access_project_storage(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.company_members cm on cm.company_id = p.company_id
    where p.id = public.extract_project_uuid_from_storage_path(p_object_name)
      and cm.user_id = auth.uid()
      and cm.active = true
  )
$$;

alter table storage.objects enable row level security;

-- Alte Einzelregeln entfernen

drop policy if exists "bilder_select_company" on storage.objects;
drop policy if exists "bilder_insert_company" on storage.objects;
drop policy if exists "bilder_update_company" on storage.objects;
drop policy if exists "bilder_delete_company" on storage.objects;

drop policy if exists "project_storage_select_company" on storage.objects;
drop policy if exists "project_storage_insert_company" on storage.objects;
drop policy if exists "project_storage_update_company" on storage.objects;
drop policy if exists "project_storage_delete_company" on storage.objects;

-- Einheitliche Regeln fuer alle Projekt-Dateibuckets
create policy "project_storage_select_company"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('bilder', 'auftrag-bilder', 'auftrag-audio')
  and public.user_can_access_project_storage(storage.objects.name)
);

create policy "project_storage_insert_company"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('bilder', 'auftrag-bilder', 'auftrag-audio')
  and public.user_can_access_project_storage(storage.objects.name)
);

create policy "project_storage_update_company"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('bilder', 'auftrag-bilder', 'auftrag-audio')
  and public.user_can_access_project_storage(storage.objects.name)
)
with check (
  bucket_id in ('bilder', 'auftrag-bilder', 'auftrag-audio')
  and public.user_can_access_project_storage(storage.objects.name)
);

create policy "project_storage_delete_company"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('bilder', 'auftrag-bilder', 'auftrag-audio')
  and public.user_can_access_project_storage(storage.objects.name)
);
