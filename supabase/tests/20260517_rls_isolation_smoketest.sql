-- RLS Smoke Test fuer Firmen-Isolation
-- Ausfuehrung: Supabase SQL Editor
-- Hinweis: Dieses Skript legt nur temporaere Testdaten in eigenen Tabellenzeilen an.

create extension if not exists "pgcrypto";

do $$
declare
  -- Zwei Test-User IDs aus auth.users einsetzen (manuell)
  v_user_a uuid := '00000000-0000-0000-0000-000000000000';
  v_user_b uuid := '00000000-0000-0000-0000-000000000000';

  v_company_a uuid := gen_random_uuid();
  v_company_b uuid := gen_random_uuid();

  v_customer_a uuid := gen_random_uuid();
  v_customer_b uuid := gen_random_uuid();

  v_project_a uuid := gen_random_uuid();
  v_project_b uuid := gen_random_uuid();

  v_fail_count int := 0;
  v_count int := 0;
begin
  if v_user_a = '00000000-0000-0000-0000-000000000000'::uuid
     or v_user_b = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Bitte v_user_a und v_user_b im Skript setzen (auth.users IDs).';
  end if;

  -- Test-Firmen
  insert into public.companies (id, name, created_at)
  values
    (v_company_a, 'RLS-Test Firma A', now()),
    (v_company_b, 'RLS-Test Firma B', now())
  on conflict (id) do nothing;

  -- Mitglieder
  insert into public.company_members (company_id, user_id, role, name, active)
  values
    (v_company_a, v_user_a, 'chef', 'Tester A', true),
    (v_company_b, v_user_b, 'chef', 'Tester B', true)
  on conflict (company_id, user_id) do update set active = true;

  -- Daten A/B
  insert into public.customers (id, company_id, firma, created_at)
  values
    (v_customer_a, v_company_a, 'Kunde A', now()),
    (v_customer_b, v_company_b, 'Kunde B', now())
  on conflict (id) do nothing;

  insert into public.projects (id, company_id, customer_id, customer, name, created_at)
  values
    (v_project_a, v_company_a, v_customer_a, 'Kunde A', 'Projekt A', now()),
    (v_project_b, v_company_b, v_customer_b, 'Kunde B', 'Projekt B', now())
  on conflict (id) do nothing;

  -- ========== TEST USER A ==========
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_count
  from public.customers
  where company_id = v_company_a;
  if v_count < 1 then
    v_fail_count := v_fail_count + 1;
    raise notice 'FAIL A: Eigene Kunden nicht sichtbar';
  else
    raise notice 'PASS A: Eigene Kunden sichtbar';
  end if;

  select count(*) into v_count
  from public.customers
  where company_id = v_company_b;
  if v_count > 0 then
    v_fail_count := v_fail_count + 1;
    raise notice 'FAIL A: Fremde Kunden sichtbar';
  else
    raise notice 'PASS A: Fremde Kunden unsichtbar';
  end if;

  select count(*) into v_count
  from public.projects
  where company_id = v_company_b;
  if v_count > 0 then
    v_fail_count := v_fail_count + 1;
    raise notice 'FAIL A: Fremde Projekte sichtbar';
  else
    raise notice 'PASS A: Fremde Projekte unsichtbar';
  end if;

  -- ========== TEST USER B ==========
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_count
  from public.customers
  where company_id = v_company_b;
  if v_count < 1 then
    v_fail_count := v_fail_count + 1;
    raise notice 'FAIL B: Eigene Kunden nicht sichtbar';
  else
    raise notice 'PASS B: Eigene Kunden sichtbar';
  end if;

  select count(*) into v_count
  from public.customers
  where company_id = v_company_a;
  if v_count > 0 then
    v_fail_count := v_fail_count + 1;
    raise notice 'FAIL B: Fremde Kunden sichtbar';
  else
    raise notice 'PASS B: Fremde Kunden unsichtbar';
  end if;

  -- Cleanup Testdaten (optional)
  delete from public.projects where id in (v_project_a, v_project_b);
  delete from public.customers where id in (v_customer_a, v_customer_b);
  delete from public.company_members where company_id in (v_company_a, v_company_b) and user_id in (v_user_a, v_user_b);
  delete from public.companies where id in (v_company_a, v_company_b);

  if v_fail_count = 0 then
    raise notice 'GESAMT: PASS (RLS-Isolation ok)';
  else
    raise notice 'GESAMT: FAIL (% Fehler)', v_fail_count;
  end if;
end $$;

