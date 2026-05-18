alter table public.stundennachweise
  add column if not exists firma_daten jsonb not null default '{}'::jsonb;
