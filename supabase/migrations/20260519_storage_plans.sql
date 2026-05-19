alter table public.companies
  add column if not exists plan_code text not null default 'starter',
  add column if not exists included_storage_mb integer not null default 2048,
  add column if not exists extra_storage_mb integer not null default 0,
  add column if not exists storage_limit_mb integer not null default 2048,
  add column if not exists storage_limit_enabled boolean not null default true;

alter table public.project_documents
  add column if not exists file_size bigint not null default 0;

alter table public.project_images
  add column if not exists file_size bigint not null default 0;

alter table public.project_audio
  add column if not exists file_size bigint not null default 0;

alter table public.company_documents
  add column if not exists file_size bigint not null default 0;

create index if not exists project_documents_company_size_idx
  on public.project_documents(company_id, file_size);

create index if not exists project_images_company_size_idx
  on public.project_images(company_id, file_size);

create index if not exists project_audio_company_size_idx
  on public.project_audio(company_id, file_size);

create index if not exists company_documents_company_size_idx
  on public.company_documents(company_id, file_size);
