alter table public.company_members
  add column if not exists job_type text;
