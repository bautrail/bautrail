create sequence if not exists public.stundennachweis_num_seq;

alter table public.stundennachweise
  add column if not exists nachweis_nummer text;

create or replace function public.gen_stundennachweis_nummer()
returns trigger
language plpgsql
as $$
begin
  if new.nachweis_nummer is null or btrim(new.nachweis_nummer) = '' then
    new.nachweis_nummer := 'SN-' || lpad(nextval('public.stundennachweis_num_seq')::text, 7, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stundennachweise_nummer on public.stundennachweise;
create trigger trg_stundennachweise_nummer
before insert on public.stundennachweise
for each row
execute function public.gen_stundennachweis_nummer();

do $$
declare
  next_num bigint;
begin
  select coalesce(max((regexp_replace(nachweis_nummer, '\D', '', 'g'))::bigint), 0) + 1
    into next_num
    from public.stundennachweise
    where nachweis_nummer ~ '^SN-\d+$';

  perform setval('public.stundennachweis_num_seq', next_num, false);
end;
$$;

create unique index if not exists stundennachweise_nachweis_nummer_uq
  on public.stundennachweise(nachweis_nummer);
