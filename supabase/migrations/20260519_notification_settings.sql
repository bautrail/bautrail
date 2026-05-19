alter table public.companies
  add column if not exists due_order_time text default '07:00',
  add column if not exists due_order_reminder_enabled boolean default true,
  add column if not exists new_report_notification_enabled boolean default true;

update public.companies
set due_order_time = coalesce(due_order_time, '07:00'),
    due_order_reminder_enabled = coalesce(due_order_reminder_enabled, true),
    new_report_notification_enabled = coalesce(new_report_notification_enabled, true)
where true;
