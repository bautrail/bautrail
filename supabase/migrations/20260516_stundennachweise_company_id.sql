alter table public.stundennachweise
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists stundennachweise_company_id_idx
  on public.stundennachweise(company_id);
