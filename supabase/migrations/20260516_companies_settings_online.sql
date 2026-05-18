alter table public.companies
  add column if not exists company_owner text,
  add column if not exists vehicle_time text not null default '06:30',
  add column if not exists order_time text not null default '16:30',
  add column if not exists customer_material_time text not null default '18:00';
