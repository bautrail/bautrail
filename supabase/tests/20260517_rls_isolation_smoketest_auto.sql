-- RLS Smoke Test (AUTO)
-- Nimmt automatisch die letzten 2 User aus auth.users.
-- Nur in Test/Entwicklungsumgebung verwenden.

create extension if not exists "pgcrypto";

do $$
declare
  v_user_a uuid;
  v_user_b uuid;

  v_company_a uuid := gen_random_uuid();
  v_company_b uuid := gen_random_uuid();

  v_customer_a uuid := gen_random_uuid();
  v_customer_b uuid := gen_random_uuid();

  v_project_a uuid := gen_random_uuid();
  v_project_b uuid := gen_random_uuid();

  v_fail_count int := 0;
  v_count int := 0;
begin
  select t.id into v_user_a
  from (
    select id
    from auth.users
    order by created_at desc
    limit 1
  ) t;

  select t.id into v_user_b
  from (
    select id
    from auth.users
    where id <> v_user_a
    order by created_at desc
    limit 1
  ) t;

  if v_user_a is null or v_user_b is null then
    raise exception 'Nicht genug User in auth.users. Mindestens 2 benoetigt.';
  end if;

  insert into public.companies (id, name, created_at)
  values
    (v_company_a, 'RLS-Test Firma A', now()),
    (v_company_b, 'RLS-Test Firma B', now())
  on conflict (id) do nothing;

  insert into public.company_members (company_id, user_id, role, name, active)
  values
    (v_company_a, v_user_a, 'chef', 'Tester A', true),
    (v_company_b, v_user_b, 'chef', 'Tester B', true)
  on conflict (company_id, user_id) do update set active = true;

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

  -- Test als User A
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_count from public.customers where company_id = v_company_a;
  if v_count < 1 then v_fail_count := v_fail_count + 1; raise notice 'FAIL A eigene Kunden'; else raise notice 'PASS A eigene Kunden'; end if;

  select count(*) into v_count from public.customers where company_id = v_company_b;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL A fremde Kunden'; else raise notice 'PASS A fremde Kunden'; end if;

  -- Test als User B
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_count from public.customers where company_id = v_company_b;
  if v_count < 1 then v_fail_count := v_fail_count + 1; raise notice 'FAIL B eigene Kunden'; else raise notice 'PASS B eigene Kunden'; end if;

  select count(*) into v_count from public.customers where company_id = v_company_a;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL B fremde Kunden'; else raise notice 'PASS B fremde Kunden'; end if;

  -- Cleanup
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

