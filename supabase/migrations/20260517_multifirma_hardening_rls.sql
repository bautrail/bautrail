alter table public.project_folders add column if not exists company_id uuid references public.companies(id) on delete set null;
alter table public.project_audio add column if not exists company_id uuid references public.companies(id) on delete set null;

update public.project_folders pf
set company_id = p.company_id
from public.projects p
where p.id = pf.project_id
  and pf.company_id is null;

update public.project_audio pa
set company_id = p.company_id
from public.projects p
where p.id = pa.project_id
  and pa.company_id is null;

create index if not exists project_folders_company_idx on public.project_folders(company_id);
create index if not exists project_audio_company_idx on public.project_audio(company_id);

create or replace function public.current_user_company_role(p_company_id uuid)
returns text
language sql
stable
as $$
  select cm.role::text
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.active = true
    and cm.company_id = p_company_id
  order by cm.created_at asc
  limit 1
$$;

alter table public.auftraege enable row level security;
alter table public.auftrag_material enable row level security;
alter table public.project_images enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_folders enable row level security;
alter table public.project_audio enable row level security;
alter table public.planning_entries enable row level security;

drop policy if exists "auftraege_select_company" on public.auftraege;
create policy "auftraege_select_company" on public.auftraege
for select to authenticated
using (public.current_user_company_role(auftraege.company_id) is not null);

drop policy if exists "auftraege_manage_company" on public.auftraege;
create policy "auftraege_manage_company" on public.auftraege
for all to authenticated
using (public.current_user_company_role(auftraege.company_id) in ('chef','buero'))
with check (public.current_user_company_role(auftraege.company_id) in ('chef','buero'));

drop policy if exists "auftrag_material_select_company" on public.auftrag_material;
create policy "auftrag_material_select_company" on public.auftrag_material
for select to authenticated
using (public.current_user_company_role(auftrag_material.company_id) is not null);

drop policy if exists "auftrag_material_manage_company" on public.auftrag_material;
create policy "auftrag_material_manage_company" on public.auftrag_material
for all to authenticated
using (public.current_user_company_role(auftrag_material.company_id) in ('chef','buero'))
with check (public.current_user_company_role(auftrag_material.company_id) in ('chef','buero'));

drop policy if exists "project_images_select_company" on public.project_images;
create policy "project_images_select_company" on public.project_images
for select to authenticated
using (public.current_user_company_role(project_images.company_id) is not null);

drop policy if exists "project_images_write_company" on public.project_images;
create policy "project_images_write_company" on public.project_images
for all to authenticated
using (public.current_user_company_role(project_images.company_id) in ('chef','buero','angestellter'))
with check (public.current_user_company_role(project_images.company_id) in ('chef','buero','angestellter'));

drop policy if exists "project_documents_select_company" on public.project_documents;
create policy "project_documents_select_company" on public.project_documents
for select to authenticated
using (public.current_user_company_role(project_documents.company_id) is not null);

drop policy if exists "project_documents_write_company" on public.project_documents;
create policy "project_documents_write_company" on public.project_documents
for all to authenticated
using (public.current_user_company_role(project_documents.company_id) in ('chef','buero','angestellter'))
with check (public.current_user_company_role(project_documents.company_id) in ('chef','buero','angestellter'));

drop policy if exists "project_folders_select_company" on public.project_folders;
create policy "project_folders_select_company" on public.project_folders
for select to authenticated
using (public.current_user_company_role(project_folders.company_id) is not null);

drop policy if exists "project_folders_write_company" on public.project_folders;
create policy "project_folders_write_company" on public.project_folders
for all to authenticated
using (public.current_user_company_role(project_folders.company_id) in ('chef','buero','angestellter'))
with check (public.current_user_company_role(project_folders.company_id) in ('chef','buero','angestellter'));

drop policy if exists "project_audio_select_company" on public.project_audio;
create policy "project_audio_select_company" on public.project_audio
for select to authenticated
using (public.current_user_company_role(project_audio.company_id) is not null);

drop policy if exists "project_audio_write_company" on public.project_audio;
create policy "project_audio_write_company" on public.project_audio
for all to authenticated
using (public.current_user_company_role(project_audio.company_id) in ('chef','buero','angestellter'))
with check (public.current_user_company_role(project_audio.company_id) in ('chef','buero','angestellter'));

drop policy if exists "planning_entries_select_role" on public.planning_entries;
create policy "planning_entries_select_role" on public.planning_entries
for select to authenticated
using (
  public.current_user_company_role(planning_entries.company_id) in ('chef','buero')
  or (
    public.current_user_company_role(planning_entries.company_id) = 'angestellter'
    and planning_entries.assigned_to = auth.uid()
  )
);

drop policy if exists "planning_entries_manage_role" on public.planning_entries;
create policy "planning_entries_manage_role" on public.planning_entries
for all to authenticated
using (public.current_user_company_role(planning_entries.company_id) in ('chef','buero'))
with check (public.current_user_company_role(planning_entries.company_id) in ('chef','buero'));

drop policy if exists "employee_timesheets_select_company" on public.employee_timesheets;
create policy "employee_timesheets_select_company" on public.employee_timesheets
for select to authenticated
using (
  public.current_user_company_role(employee_timesheets.company_id) in ('chef','buero')
  or (
    public.current_user_company_role(employee_timesheets.company_id) = 'angestellter'
    and employee_timesheets.user_id = auth.uid()
  )
);

drop policy if exists "stundennachweise_select_company" on public.stundennachweise;
create policy "stundennachweise_select_company" on public.stundennachweise
for select to authenticated
using (
  public.current_user_company_role(stundennachweise.company_id) in ('chef','buero')
  or (
    public.current_user_company_role(stundennachweise.company_id) = 'angestellter'
    and stundennachweise.created_by = auth.uid()
  )
);
