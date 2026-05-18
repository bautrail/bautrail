alter table public.stundennachweise
  add column if not exists gefahrene_kilometer numeric(10,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stundennachweise_gefahrene_kilometer_nonnegative'
      and conrelid = 'public.stundennachweise'::regclass
  ) then
    alter table public.stundennachweise
      add constraint stundennachweise_gefahrene_kilometer_nonnegative
      check (gefahrene_kilometer >= 0);
  end if;
end $$;

create index if not exists stundennachweise_company_created_date_idx
  on public.stundennachweise(company_id, created_by, arbeitsdatum);
