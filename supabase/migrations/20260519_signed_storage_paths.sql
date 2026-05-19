alter table public.project_documents
  add column if not exists storage_bucket text,
  add column if not exists storage_path text;

alter table public.project_images
  add column if not exists storage_bucket text,
  add column if not exists storage_path text;

alter table public.project_audio
  add column if not exists storage_bucket text,
  add column if not exists storage_path text;

update public.project_documents
set
  storage_bucket = coalesce(storage_bucket, nullif(substring(file_url from '/object/(?:public|sign)/([^/]+)/'), ''), 'bilder'),
  storage_path = coalesce(
    storage_path,
    nullif(substring(file_url from '/object/(?:public|sign)/[^/]+/(.+?)(?:\?|$)'), ''),
    nullif(file_url, '')
  )
where coalesce(storage_bucket, '') = '' or coalesce(storage_path, '') = '';

update public.project_images
set
  storage_bucket = coalesce(storage_bucket, nullif(substring(image_url from '/object/(?:public|sign)/([^/]+)/'), ''), 'bilder'),
  storage_path = coalesce(
    storage_path,
    nullif(substring(image_url from '/object/(?:public|sign)/[^/]+/(.+?)(?:\?|$)'), ''),
    nullif(image_url, '')
  )
where coalesce(storage_bucket, '') = '' or coalesce(storage_path, '') = '';

update public.project_audio
set
  storage_bucket = coalesce(storage_bucket, nullif(substring(audio_url from '/object/(?:public|sign)/([^/]+)/'), ''), 'bilder'),
  storage_path = coalesce(
    storage_path,
    nullif(substring(audio_url from '/object/(?:public|sign)/[^/]+/(.+?)(?:\?|$)'), ''),
    nullif(audio_url, '')
  )
where coalesce(storage_bucket, '') = '' or coalesce(storage_path, '') = '';

create index if not exists project_documents_storage_idx on public.project_documents(storage_bucket, storage_path);
create index if not exists project_images_storage_idx on public.project_images(storage_bucket, storage_path);
create index if not exists project_audio_storage_idx on public.project_audio(storage_bucket, storage_path);
