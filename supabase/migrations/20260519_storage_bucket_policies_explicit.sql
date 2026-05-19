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

-- bilder

drop policy if exists "bilder_select_company" on storage.objects;
drop policy if exists "bilder_insert_company" on storage.objects;
drop policy if exists "bilder_update_company" on storage.objects;
drop policy if exists "bilder_delete_company" on storage.objects;

create policy "bilder_select_company"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bilder'
  and public.user_can_access_project_storage(name)
);

create policy "bilder_insert_company"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bilder'
  and public.user_can_access_project_storage(name)
);

create policy "bilder_update_company"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bilder'
  and public.user_can_access_project_storage(name)
)
with check (
  bucket_id = 'bilder'
  and public.user_can_access_project_storage(name)
);

create policy "bilder_delete_company"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bilder'
  and public.user_can_access_project_storage(name)
);

-- auftrag-bilder

drop policy if exists "auftrag_bilder_select_company" on storage.objects;
drop policy if exists "auftrag_bilder_insert_company" on storage.objects;
drop policy if exists "auftrag_bilder_update_company" on storage.objects;
drop policy if exists "auftrag_bilder_delete_company" on storage.objects;

create policy "auftrag_bilder_select_company"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'auftrag-bilder'
  and public.user_can_access_project_storage(name)
);

create policy "auftrag_bilder_insert_company"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'auftrag-bilder'
  and public.user_can_access_project_storage(name)
);

create policy "auftrag_bilder_update_company"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'auftrag-bilder'
  and public.user_can_access_project_storage(name)
)
with check (
  bucket_id = 'auftrag-bilder'
  and public.user_can_access_project_storage(name)
);

create policy "auftrag_bilder_delete_company"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'auftrag-bilder'
  and public.user_can_access_project_storage(name)
);

-- auftrag-audio

drop policy if exists "auftrag_audio_select_company" on storage.objects;
drop policy if exists "auftrag_audio_insert_company" on storage.objects;
drop policy if exists "auftrag_audio_update_company" on storage.objects;
drop policy if exists "auftrag_audio_delete_company" on storage.objects;

create policy "auftrag_audio_select_company"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'auftrag-audio'
  and public.user_can_access_project_storage(name)
);

create policy "auftrag_audio_insert_company"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'auftrag-audio'
  and public.user_can_access_project_storage(name)
);

create policy "auftrag_audio_update_company"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'auftrag-audio'
  and public.user_can_access_project_storage(name)
)
with check (
  bucket_id = 'auftrag-audio'
  and public.user_can_access_project_storage(name)
);

create policy "auftrag_audio_delete_company"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'auftrag-audio'
  and public.user_can_access_project_storage(name)
);
