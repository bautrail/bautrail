create extension if not exists "pgcrypto";

create table if not exists public.project_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.project_folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  folder_id uuid references public.project_folders(id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_audio (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  folder_id uuid references public.project_folders(id) on delete set null,
  audio_url text not null,
  created_at timestamptz not null default now()
);

alter table public.project_images
  add column if not exists folder_id uuid references public.project_folders(id) on delete set null;

create index if not exists project_folders_project_id_idx
  on public.project_folders(project_id);

create index if not exists project_folders_parent_id_idx
  on public.project_folders(parent_id);

create index if not exists project_documents_project_id_idx
  on public.project_documents(project_id);

create index if not exists project_documents_folder_id_idx
  on public.project_documents(folder_id);

create index if not exists project_audio_project_id_idx
  on public.project_audio(project_id);

create index if not exists project_audio_folder_id_idx
  on public.project_audio(folder_id);

create index if not exists project_images_folder_id_idx
  on public.project_images(folder_id);
