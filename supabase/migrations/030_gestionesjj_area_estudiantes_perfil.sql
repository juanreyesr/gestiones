-- Area de estudiantes (Fase 7): ficha de perfil que llena el propio
-- estudiante (foto, fecha de nacimiento, pais de origen y tres preguntas
-- de reflexion), visible para el docente.

alter table public.gestionesjj_estudiantes
  add column if not exists foto_path text,
  add column if not exists fecha_nacimiento date,
  add column if not exists pais text,
  add column if not exists reflexion_quien_soy text,
  add column if not exists reflexion_proposito text,
  add column if not exists reflexion_recuerdo text;

-- ============================================================
-- STORAGE: bucket privado para las fotos de perfil, separado del de
-- material del docente y del de entregas. El estudiante nunca sube el
-- archivo directo: pasa por una ruta del servidor con service role, que
-- valida tipo/tamano (mismo patron que las entregas de la Fase 2).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('gestionesjj-perfiles', 'gestionesjj-perfiles', false)
on conflict (id) do nothing;

drop policy if exists "gestionesjj_perfiles_storage_select_owner" on storage.objects;
create policy "gestionesjj_perfiles_storage_select_owner"
on storage.objects
for select
to authenticated
using (bucket_id = 'gestionesjj-perfiles' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_perfiles_storage_insert_owner" on storage.objects;
create policy "gestionesjj_perfiles_storage_insert_owner"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'gestionesjj-perfiles' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_perfiles_storage_update_owner" on storage.objects;
create policy "gestionesjj_perfiles_storage_update_owner"
on storage.objects
for update
to authenticated
using (bucket_id = 'gestionesjj-perfiles' and public.gestionesjj_is_owner())
with check (bucket_id = 'gestionesjj-perfiles' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_perfiles_storage_delete_owner" on storage.objects;
create policy "gestionesjj_perfiles_storage_delete_owner"
on storage.objects
for delete
to authenticated
using (bucket_id = 'gestionesjj-perfiles' and public.gestionesjj_is_owner());

-- ============================================================
-- RPC de lectura para el estudiante autenticado: su propia ficha, para
-- precargar el formulario "Mi perfil".
-- ============================================================
create or replace function public.gestionesjj_estudiante_mi_ficha()
returns table (
  foto_path text,
  fecha_nacimiento date,
  pais text,
  reflexion_quien_soy text,
  reflexion_proposito text,
  reflexion_recuerdo text
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.foto_path, e.fecha_nacimiento, e.pais, e.reflexion_quien_soy, e.reflexion_proposito, e.reflexion_recuerdo
  from public.gestionesjj_estudiantes e
  where e.auth_user_id = auth.uid() and e.activo;
$$;

revoke all on function public.gestionesjj_estudiante_mi_ficha() from public;
revoke all on function public.gestionesjj_estudiante_mi_ficha() from anon;
grant execute on function public.gestionesjj_estudiante_mi_ficha() to authenticated;
