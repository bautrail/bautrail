alter table if exists public.audit_log disable row level security;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log(table_name, row_id, action, after_data)
    values (tg_table_name, coalesce(new.id::text, ''), 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log(table_name, row_id, action, before_data, after_data)
    values (tg_table_name, coalesce(new.id::text, ''), 'update', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log(table_name, row_id, action, before_data)
    values (tg_table_name, coalesce(old.id::text, ''), 'delete', to_jsonb(old));
    return old;
  end if;
end;
$$;
