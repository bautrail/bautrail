create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'recurring_order_interval_enum') then
    create type public.recurring_order_interval_enum as enum ('weekly', 'monthly', 'custom_months', 'yearly');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'recurring_order_mode_enum') then
    create type public.recurring_order_mode_enum as enum ('auto_create', 'reminder');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_reminder_status_enum') then
    create type public.order_reminder_status_enum as enum ('neu', 'geplant', 'erledigt');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'feedback_status_enum') then
    create type public.feedback_status_enum as enum ('neu', 'geplant', 'erledigt');
  end if;
end $$;

create table if not exists public.recurring_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  template_auftrag_id uuid references public.auftraege(id) on delete set null,
  customer text not null,
  project text not null,
  beschreibung text,
  priority text not null default 'normal',
  interval_type public.recurring_order_interval_enum not null default 'monthly',
  interval_months integer not null default 1 check (interval_months > 0),
  next_due_date date not null,
  last_created_due_date date,
  reminder_days_before integer not null default 30 check (reminder_days_before >= 0),
  mode public.recurring_order_mode_enum not null default 'reminder',
  assigned_user_id uuid references auth.users(id) on delete set null,
  notify_assignee boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recurring_order_id uuid references public.recurring_orders(id) on delete cascade,
  auftrag_id uuid references public.auftraege(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  title text not null,
  message text,
  reminder_date date not null default current_date,
  due_date date not null,
  status public.order_reminder_status_enum not null default 'neu',
  notify_assignee boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  auftrag_id uuid references public.auftraege(id) on delete set null,
  audio_url text not null,
  storage_bucket text not null default 'bilder',
  storage_path text,
  file_size bigint not null default 0,
  transcript text,
  note_text text,
  source text not null default 'audio',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  body text not null,
  status public.feedback_status_enum not null default 'neu',
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_by_email text,
  handled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists order_reminders_recurring_due_unique
  on public.order_reminders(recurring_order_id, due_date)
  where recurring_order_id is not null;

create index if not exists recurring_orders_company_due_idx
  on public.recurring_orders(company_id, active, next_due_date);

create index if not exists order_reminders_company_due_idx
  on public.order_reminders(company_id, status, due_date);

create index if not exists order_reminders_assigned_idx
  on public.order_reminders(assigned_user_id, status, due_date)
  where assigned_user_id is not null;

create index if not exists voice_notes_company_customer_idx
  on public.voice_notes(company_id, customer_id, created_at desc);

create index if not exists voice_notes_company_auftrag_idx
  on public.voice_notes(company_id, auftrag_id, created_at desc);

create index if not exists feedback_entries_company_status_idx
  on public.feedback_entries(company_id, status, created_at desc);

alter table public.recurring_orders enable row level security;
alter table public.order_reminders enable row level security;
alter table public.voice_notes enable row level security;
alter table public.feedback_entries enable row level security;

drop policy if exists "recurring_orders_select_manager" on public.recurring_orders;
create policy "recurring_orders_select_manager" on public.recurring_orders
for select to authenticated
using (public.current_user_company_role(recurring_orders.company_id) in ('chef','buero'));

drop policy if exists "recurring_orders_manage_manager" on public.recurring_orders;
create policy "recurring_orders_manage_manager" on public.recurring_orders
for all to authenticated
using (public.current_user_company_role(recurring_orders.company_id) in ('chef','buero'))
with check (public.current_user_company_role(recurring_orders.company_id) in ('chef','buero'));

drop policy if exists "order_reminders_select_relevant" on public.order_reminders;
create policy "order_reminders_select_relevant" on public.order_reminders
for select to authenticated
using (
  public.current_user_company_role(order_reminders.company_id) in ('chef','buero')
  or (
    public.current_user_company_role(order_reminders.company_id) = 'angestellter'
    and order_reminders.notify_assignee = true
    and order_reminders.assigned_user_id = auth.uid()
  )
);

drop policy if exists "order_reminders_manage_manager" on public.order_reminders;
create policy "order_reminders_manage_manager" on public.order_reminders
for all to authenticated
using (public.current_user_company_role(order_reminders.company_id) in ('chef','buero'))
with check (public.current_user_company_role(order_reminders.company_id) in ('chef','buero'));

drop policy if exists "voice_notes_select_company" on public.voice_notes;
create policy "voice_notes_select_company" on public.voice_notes
for select to authenticated
using (public.current_user_company_role(voice_notes.company_id) is not null);

drop policy if exists "voice_notes_write_company" on public.voice_notes;
create policy "voice_notes_write_company" on public.voice_notes
for all to authenticated
using (public.current_user_company_role(voice_notes.company_id) in ('chef','buero','angestellter'))
with check (public.current_user_company_role(voice_notes.company_id) in ('chef','buero','angestellter'));

drop policy if exists "feedback_entries_select_relevant" on public.feedback_entries;
create policy "feedback_entries_select_relevant" on public.feedback_entries
for select to authenticated
using (
  public.current_user_company_role(feedback_entries.company_id) in ('chef','buero')
  or feedback_entries.created_by = auth.uid()
);

drop policy if exists "feedback_entries_insert_company" on public.feedback_entries;
create policy "feedback_entries_insert_company" on public.feedback_entries
for insert to authenticated
with check (
  public.current_user_company_role(feedback_entries.company_id) is not null
  and (feedback_entries.created_by is null or feedback_entries.created_by = auth.uid())
);

drop policy if exists "feedback_entries_update_manager" on public.feedback_entries;
create policy "feedback_entries_update_manager" on public.feedback_entries
for update to authenticated
using (public.current_user_company_role(feedback_entries.company_id) in ('chef','buero'))
with check (public.current_user_company_role(feedback_entries.company_id) in ('chef','buero'));

drop policy if exists "feedback_entries_delete_manager" on public.feedback_entries;
create policy "feedback_entries_delete_manager" on public.feedback_entries
for delete to authenticated
using (public.current_user_company_role(feedback_entries.company_id) in ('chef','buero'));
