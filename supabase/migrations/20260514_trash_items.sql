create extension if not exists "pgcrypto";

create table if not exists public.trash_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,
  source_id text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  deleted_at timestamptz not null default now()
);

create index if not exists trash_items_deleted_at_idx
  on public.trash_items(deleted_at desc);

create index if not exists trash_items_item_type_idx
  on public.trash_items(item_type);
