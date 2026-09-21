-- Area de estudiantes (Fase 5): idioma de la plataforma por estudiante
-- (espanol/ingles/portugues). Solo aplica al lado del estudiante: el panel
-- del docente sigue siendo unicamente en espanol.

alter table public.gestionesjj_estudiantes
  add column if not exists idioma text not null default 'es' check (idioma in ('es', 'en', 'pt'));

-- Se extiende la RPC de perfil para exponer el idioma guardado. El
-- estudiante nunca escribe esta columna directo: el cambio pasa por una
-- ruta del servidor con service role (POST /api/estudiante/idioma), igual
-- que el resto de escrituras del area de estudiantes.
-- Cambia el tipo de retorno (columna nueva), asi que hay que borrar la
-- funcion anterior primero: Postgres no permite alterar las columnas de
-- salida de una funcion existente con create or replace.
drop function if exists public.gestionesjj_estudiante_mi_perfil();

create function public.gestionesjj_estudiante_mi_perfil()
returns table (nombre text, correo text, debe_cambiar_contrasena boolean, idioma text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.nombre, e.correo, e.debe_cambiar_contrasena, e.idioma
  from public.gestionesjj_estudiantes e
  where e.auth_user_id = auth.uid() and e.activo;
$$;

revoke all on function public.gestionesjj_estudiante_mi_perfil() from public;
revoke all on function public.gestionesjj_estudiante_mi_perfil() from anon;
grant execute on function public.gestionesjj_estudiante_mi_perfil() to authenticated;
