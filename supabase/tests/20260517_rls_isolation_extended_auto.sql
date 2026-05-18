-- Erweiterter RLS Smoke Test (AUTO)
-- Testet Firmen-Isolation fuer:
-- - auftraege
-- - stundennachweise
-- - employee_timesheets
-- - planning_entries
-- Nutzt automatisch die letzten 2 User aus auth.users.

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

  v_job_a uuid := gen_random_uuid();
  v_job_b uuid := gen_random_uuid();
  v_report_a uuid := gen_random_uuid();
  v_report_b uuid := gen_random_uuid();
  v_ts_a uuid := gen_random_uuid();
  v_ts_b uuid := gen_random_uuid();
  v_plan_a uuid := gen_random_uuid();
  v_plan_b uuid := gen_random_uuid();

  v_fail_count int := 0;
  v_count int := 0;
begin
  select id into v_user_a from auth.users order by created_at desc limit 1;
  select id into v_user_b from auth.users where id <> v_user_a order by created_at desc limit 1;

  if v_user_a is null or v_user_b is null then
    raise exception 'Nicht genug User in auth.users. Mindestens 2 benoetigt.';
  end if;

  insert into public.companies (id, name, created_at)
  values (v_company_a, 'RLSX Firma A', now()), (v_company_b, 'RLSX Firma B', now())
  on conflict (id) do nothing;

  insert into public.company_members (company_id, user_id, role, name, active)
  values
    (v_company_a, v_user_a, 'chef', 'Tester A', true),
    (v_company_b, v_user_b, 'chef', 'Tester B', true)
  on conflict (company_id, user_id) do update set active = true;

  insert into public.customers (id, company_id, firma, created_at)
  values
    (v_customer_a, v_company_a, 'Kunde XA', now()),
    (v_customer_b, v_company_b, 'Kunde XB', now())
  on conflict (id) do nothing;

  insert into public.projects (id, company_id, customer_id, customer, name, created_at)
  values
    (v_project_a, v_company_a, v_customer_a, 'Kunde XA', 'Projekt XA', now()),
    (v_project_b, v_company_b, v_customer_b, 'Kunde XB', 'Projekt XB', now())
  on conflict (id) do nothing;

  insert into public.auftraege (id, company_id, customer_id, project_id, customer, project, created_at)
  values
    (v_job_a, v_company_a, v_customer_a, v_project_a, 'Kunde XA', 'Projekt XA', now()),
    (v_job_b, v_company_b, v_customer_b, v_project_b, 'Kunde XB', 'Projekt XB', now())
  on conflict (id) do nothing;

  insert into public.stundennachweise (
    id, company_id, created_by, customer_id, project_id, customer, project, objekt, arbeitsdatum, taetigkeit, created_at
  )
  values
    (v_report_a, v_company_a, v_user_a, v_customer_a, v_project_a, 'Kunde XA', 'Projekt XA', 'Objekt A', current_date, 'Test A', now()),
    (v_report_b, v_company_b, v_user_b, v_customer_b, v_project_b, 'Kunde XB', 'Projekt XB', 'Objekt B', current_date, 'Test B', now())
  on conflict (id) do nothing;

  insert into public.employee_timesheets (
    id, company_id, user_id, project_id, start_time, end_time, pause_minutes, note, status, created_at
  )
  values
    (v_ts_a, v_company_a, v_user_a, v_project_a, now() - interval '2 hour', now() - interval '1 hour', 0, 'TS A', 'eingereicht', now()),
    (v_ts_b, v_company_b, v_user_b, v_project_b, now() - interval '2 hour', now() - interval '1 hour', 0, 'TS B', 'eingereicht', now())
  on conflict (id) do nothing;

  insert into public.planning_entries (
    id, company_id, assigned_to, project_id, title, date, created_by, created_at
  )
  values
    (v_plan_a, v_company_a, v_user_a, v_project_a, 'Plan A', current_date, v_user_a, now()),
    (v_plan_b, v_company_b, v_user_b, v_project_b, 'Plan B', current_date, v_user_b, now())
  on conflict (id) do nothing;

  -- Test als User A
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_count from public.auftraege where company_id = v_company_b;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL A: fremde auftraege sichtbar'; else raise notice 'PASS A: auftraege getrennt'; end if;

  select count(*) into v_count from public.stundennachweise where company_id = v_company_b;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL A: fremde stundennachweise sichtbar'; else raise notice 'PASS A: stundennachweise getrennt'; end if;

  select count(*) into v_count from public.employee_timesheets where company_id = v_company_b;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL A: fremde employee_timesheets sichtbar'; else raise notice 'PASS A: employee_timesheets getrennt'; end if;

  select count(*) into v_count from public.planning_entries where company_id = v_company_b;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL A: fremde planning_entries sichtbar'; else raise notice 'PASS A: planning_entries getrennt'; end if;

  -- Test als User B
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_count from public.auftraege where company_id = v_company_a;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL B: fremde auftraege sichtbar'; else raise notice 'PASS B: auftraege getrennt'; end if;

  select count(*) into v_count from public.stundennachweise where company_id = v_company_a;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL B: fremde stundennachweise sichtbar'; else raise notice 'PASS B: stundennachweise getrennt'; end if;

  select count(*) into v_count from public.employee_timesheets where company_id = v_company_a;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL B: fremde employee_timesheets sichtbar'; else raise notice 'PASS B: employee_timesheets getrennt'; end if;

  select count(*) into v_count from public.planning_entries where company_id = v_company_a;
  if v_count > 0 then v_fail_count := v_fail_count + 1; raise notice 'FAIL B: fremde planning_entries sichtbar'; else raise notice 'PASS B: planning_entries getrennt'; end if;

  -- Cleanup
  delete from public.planning_entries where id in (v_plan_a, v_plan_b);
  delete from public.employee_timesheets where id in (v_ts_a, v_ts_b);
  delete from public.stundennachweise where id in (v_report_a, v_report_b);
  delete from public.auftraege where id in (v_job_a, v_job_b);
  delete from public.projects where id in (v_project_a, v_project_b);
  delete from public.customers where id in (v_customer_a, v_customer_b);
  delete from public.company_members where company_id in (v_company_a, v_company_b) and user_id in (v_user_a, v_user_b);
  delete from public.companies where id in (v_company_a, v_company_b);

  if v_fail_count = 0 then
    raise notice 'GESAMT: PASS (erweiterte RLS-Isolation ok)';
  else
    raise notice 'GESAMT: FAIL (% Fehler)', v_fail_count;
  end if;
end $$;

