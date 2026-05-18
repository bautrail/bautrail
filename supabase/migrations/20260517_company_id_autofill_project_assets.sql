create or replace function public.fill_company_id_from_project()
returns trigger
language plpgsql
as $$
begin
  if new.project_id is not null and new.company_id is null then
    select p.company_id into new.company_id
    from public.projects p
    where p.id = new.project_id;
  end if;
  return new;
end;
$$;

update public.project_images pi
set company_id = p.company_id
from public.projects p
where pi.project_id = p.id
  and pi.company_id is null;

update public.project_documents pd
set company_id = p.company_id
from public.projects p
where pd.project_id = p.id
  and pd.company_id is null;

update public.project_folders pf
set company_id = p.company_id
from public.projects p
where pf.project_id = p.id
  and pf.company_id is null;

update public.project_audio pa
set company_id = p.company_id
from public.projects p
where pa.project_id = p.id
  and pa.company_id is null;

drop trigger if exists trg_project_images_fill_company_id on public.project_images;
create trigger trg_project_images_fill_company_id
before insert or update on public.project_images
for each row execute function public.fill_company_id_from_project();

drop trigger if exists trg_project_documents_fill_company_id on public.project_documents;
create trigger trg_project_documents_fill_company_id
before insert or update on public.project_documents
for each row execute function public.fill_company_id_from_project();

drop trigger if exists trg_project_folders_fill_company_id on public.project_folders;
create trigger trg_project_folders_fill_company_id
before insert or update on public.project_folders
for each row execute function public.fill_company_id_from_project();

drop trigger if exists trg_project_audio_fill_company_id on public.project_audio;
create trigger trg_project_audio_fill_company_id
before insert or update on public.project_audio
for each row execute function public.fill_company_id_from_project();
