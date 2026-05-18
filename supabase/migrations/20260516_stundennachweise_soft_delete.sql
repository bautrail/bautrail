alter table public.stundennachweise
  add column if not exists created_by uuid,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid,
  add column if not exists delete_reason text;

create index if not exists stundennachweise_created_by_idx
  on public.stundennachweise(created_by);

create index if not exists stundennachweise_deleted_at_idx
  on public.stundennachweise(deleted_at desc);
