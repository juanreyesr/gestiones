-- Documentos del expediente: fotografías, cartas, materiales, tareas y otros
-- archivos (imágenes, PDF y Word) guardados en el expediente del paciente.
--
-- - Archivos en el bucket PRIVADO "gestionesjj-pacientes" (máx. 20 MB; solo
--   imágenes, PDF y Word). Se ven con URL firmada de corta duración.
-- - Metadatos en gestionesjj_paciente_documentos (categoría, título, nota,
--   fecha y, opcionalmente, la sesión a la que pertenece).
-- - Acceso solo del propietario (RLS + políticas de storage), igual que el
--   resto de la Clínica.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gestionesjj-pacientes',
  'gestionesjj-pacientes',
  false,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gestionesjj_pacientes_storage_select_owner" on storage.objects;
create policy "gestionesjj_pacientes_storage_select_owner" on storage.objects
  for select to authenticated using (bucket_id = 'gestionesjj-pacientes' and public.gestionesjj_is_owner());
drop policy if exists "gestionesjj_pacientes_storage_insert_owner" on storage.objects;
create policy "gestionesjj_pacientes_storage_insert_owner" on storage.objects
  for insert to authenticated with check (bucket_id = 'gestionesjj-pacientes' and public.gestionesjj_is_owner());
drop policy if exists "gestionesjj_pacientes_storage_update_owner" on storage.objects;
create policy "gestionesjj_pacientes_storage_update_owner" on storage.objects
  for update to authenticated using (bucket_id = 'gestionesjj-pacientes' and public.gestionesjj_is_owner())
  with check (bucket_id = 'gestionesjj-pacientes' and public.gestionesjj_is_owner());
drop policy if exists "gestionesjj_pacientes_storage_delete_owner" on storage.objects;
create policy "gestionesjj_pacientes_storage_delete_owner" on storage.objects
  for delete to authenticated using (bucket_id = 'gestionesjj-pacientes' and public.gestionesjj_is_owner());

create table if not exists public.gestionesjj_paciente_documentos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  sesion_id uuid references public.gestionesjj_sesiones(id) on delete set null,
  categoria text not null default 'otro'
    check (categoria in ('foto', 'carta', 'material', 'tarea', 'informe_externo', 'documento_legal', 'otro')),
  titulo text not null check (length(btrim(titulo)) between 1 and 160),
  nota text check (nota is null or length(nota) <= 2000),
  fecha date not null default ((now() at time zone 'America/Guatemala')::date),
  archivo_path text not null unique check (archivo_path like 'pacientes/%'),
  archivo_nombre text not null check (length(archivo_nombre) between 1 and 255),
  mime text,
  tamano integer check (tamano is null or tamano between 0 and 20971520),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gestionesjj_paciente_documentos_paciente_idx
  on public.gestionesjj_paciente_documentos (paciente_id, fecha desc, created_at desc);
create index if not exists gestionesjj_paciente_documentos_sesion_idx
  on public.gestionesjj_paciente_documentos (sesion_id);

alter table public.gestionesjj_paciente_documentos enable row level security;
revoke all on public.gestionesjj_paciente_documentos from anon;
grant select, insert, update, delete on public.gestionesjj_paciente_documentos to authenticated;

drop policy if exists "paciente_documentos_select_owner" on public.gestionesjj_paciente_documentos;
create policy "paciente_documentos_select_owner" on public.gestionesjj_paciente_documentos
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "paciente_documentos_insert_owner" on public.gestionesjj_paciente_documentos;
create policy "paciente_documentos_insert_owner" on public.gestionesjj_paciente_documentos
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "paciente_documentos_update_owner" on public.gestionesjj_paciente_documentos;
create policy "paciente_documentos_update_owner" on public.gestionesjj_paciente_documentos
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "paciente_documentos_delete_owner" on public.gestionesjj_paciente_documentos;
create policy "paciente_documentos_delete_owner" on public.gestionesjj_paciente_documentos
  for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_paciente_documentos_set_updated_at on public.gestionesjj_paciente_documentos;
create trigger gestionesjj_paciente_documentos_set_updated_at
  before update on public.gestionesjj_paciente_documentos
  for each row execute function public.gestionesjj_set_updated_at();
