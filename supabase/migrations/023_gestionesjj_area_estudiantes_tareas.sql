-- Area de estudiantes (Fase 2): tareas con entrega de archivos y
-- calificaciones publicables.
--
-- Decisiones de diseno:
-- - Las entregas tardias se aceptan pero quedan marcadas ('tardia'): el
--   docente decide si penaliza al calificar.
-- - La nota y la retroalimentacion solo son visibles para el estudiante
--   cuando el docente aprieta "Publicar" (gestionesjj_curso_calificaciones
--   ya tenia nota/comentario; se agrega publicado_en, que gatea la
--   visibilidad en la RPC de lectura, no en la tabla).
-- - fecha_limite es timestamptz (no date): evita el error de zona horaria
--   que se detecto en el analisis (comparar contra now() siempre es
--   correcto sin importar en que zona este el navegador).
-- - Como en la Fase 1, el estudiante nunca escribe en las tablas
--   existentes del modulo Cursos ni tiene permisos directos sobre storage:
--   la subida de archivos pasa por una ruta del servidor (service role)
--   que valida todo y escribe en tablas nuevas dedicadas.

-- ============================================================
-- CAMPOS NUEVOS
-- ============================================================
alter table public.gestionesjj_curso_actividades
  add column if not exists visible_estudiantes text not null default 'hereda'
    check (visible_estudiantes in ('hereda', 'visible', 'oculto')),
  add column if not exists entrega_habilitada boolean not null default false,
  add column if not exists fecha_limite timestamptz;

alter table public.gestionesjj_curso_calificaciones
  add column if not exists publicado_en timestamptz;

-- ============================================================
-- ENTREGAS DE LOS ESTUDIANTES
-- ============================================================
create table if not exists public.gestionesjj_curso_entregas (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references public.gestionesjj_curso_actividades(id) on delete cascade,
  estudiante_id uuid not null references public.gestionesjj_estudiantes(id) on delete cascade,
  entregado_en timestamptz not null default now(),
  tardia boolean not null default false,
  comentario_estudiante text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actividad_id, estudiante_id)
);

create table if not exists public.gestionesjj_curso_entrega_archivos (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.gestionesjj_curso_entregas(id) on delete cascade,
  archivo_path text not null,
  archivo_nombre text,
  archivo_mime text,
  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_curso_entregas_actividad_idx on public.gestionesjj_curso_entregas (actividad_id);
create index if not exists gestionesjj_curso_entregas_estudiante_idx on public.gestionesjj_curso_entregas (estudiante_id);
create index if not exists gestionesjj_curso_entrega_archivos_entrega_idx on public.gestionesjj_curso_entrega_archivos (entrega_id);

-- RLS: solo el owner lee/escribe estas tablas desde el navegador (para
-- revisar y limpiar entregas). Las escrituras del estudiante ocurren
-- siempre via una ruta del servidor con service role, que salta RLS por
-- diseno y valida todo antes de escribir.
alter table public.gestionesjj_curso_entregas enable row level security;
alter table public.gestionesjj_curso_entrega_archivos enable row level security;
revoke all on public.gestionesjj_curso_entregas from anon;
revoke all on public.gestionesjj_curso_entrega_archivos from anon;
grant select, insert, update, delete on public.gestionesjj_curso_entregas to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_entrega_archivos to authenticated;

drop policy if exists "curso_entregas_select_owner" on public.gestionesjj_curso_entregas;
drop policy if exists "curso_entregas_insert_owner" on public.gestionesjj_curso_entregas;
drop policy if exists "curso_entregas_update_owner" on public.gestionesjj_curso_entregas;
drop policy if exists "curso_entregas_delete_owner" on public.gestionesjj_curso_entregas;
create policy "curso_entregas_select_owner" on public.gestionesjj_curso_entregas for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_entregas_insert_owner" on public.gestionesjj_curso_entregas for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "curso_entregas_update_owner" on public.gestionesjj_curso_entregas for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "curso_entregas_delete_owner" on public.gestionesjj_curso_entregas for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_entrega_archivos_select_owner" on public.gestionesjj_curso_entrega_archivos;
drop policy if exists "curso_entrega_archivos_insert_owner" on public.gestionesjj_curso_entrega_archivos;
drop policy if exists "curso_entrega_archivos_update_owner" on public.gestionesjj_curso_entrega_archivos;
drop policy if exists "curso_entrega_archivos_delete_owner" on public.gestionesjj_curso_entrega_archivos;
create policy "curso_entrega_archivos_select_owner" on public.gestionesjj_curso_entrega_archivos for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_entrega_archivos_insert_owner" on public.gestionesjj_curso_entrega_archivos for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "curso_entrega_archivos_update_owner" on public.gestionesjj_curso_entrega_archivos for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "curso_entrega_archivos_delete_owner" on public.gestionesjj_curso_entrega_archivos for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_curso_entregas_set_updated_at on public.gestionesjj_curso_entregas;
create trigger gestionesjj_curso_entregas_set_updated_at before update on public.gestionesjj_curso_entregas for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- STORAGE: bucket privado para las entregas de los estudiantes, separado
-- del bucket de material del docente (gestionesjj-cursos).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('gestionesjj-entregas', 'gestionesjj-entregas', false)
on conflict (id) do nothing;

drop policy if exists "gestionesjj_entregas_storage_select_owner" on storage.objects;
create policy "gestionesjj_entregas_storage_select_owner"
on storage.objects
for select
to authenticated
using (bucket_id = 'gestionesjj-entregas' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_entregas_storage_insert_owner" on storage.objects;
create policy "gestionesjj_entregas_storage_insert_owner"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'gestionesjj-entregas' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_entregas_storage_update_owner" on storage.objects;
create policy "gestionesjj_entregas_storage_update_owner"
on storage.objects
for update
to authenticated
using (bucket_id = 'gestionesjj-entregas' and public.gestionesjj_is_owner())
with check (bucket_id = 'gestionesjj-entregas' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_entregas_storage_delete_owner" on storage.objects;
create policy "gestionesjj_entregas_storage_delete_owner"
on storage.objects
for delete
to authenticated
using (bucket_id = 'gestionesjj-entregas' and public.gestionesjj_is_owner());

-- ============================================================
-- RPCs para el estudiante autenticado
-- ============================================================

create or replace function public.gestionesjj_estudiante_actividades_semana(p_semana_id uuid)
returns table (
  id uuid,
  tipo text,
  titulo text,
  descripcion text,
  punteo numeric,
  entrega_habilitada boolean,
  fecha_limite timestamptz,
  mi_entrega_id uuid,
  mi_entregado_en timestamptz,
  mi_tardia boolean,
  mi_comentario_estudiante text,
  mi_nota numeric,
  mi_comentario_calificacion text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.tipo,
    a.titulo,
    a.descripcion,
    a.punteo,
    a.entrega_habilitada,
    a.fecha_limite,
    en.id,
    en.entregado_en,
    en.tardia,
    en.comentario_estudiante,
    case when cal.publicado_en is not null then cal.nota else null end,
    case when cal.publicado_en is not null then cal.comentario else null end
  from public.gestionesjj_curso_actividades a
  join public.gestionesjj_curso_semanas se on se.id = a.semana_id
  join public.gestionesjj_cursos_impartidos c on c.id = se.curso_id
  join public.gestionesjj_curso_estudiantes ce on ce.curso_id = c.id
  join public.gestionesjj_estudiantes e on e.id = ce.estudiante_id
  left join public.gestionesjj_curso_entregas en on en.actividad_id = a.id and en.estudiante_id = e.id
  left join public.gestionesjj_curso_calificaciones cal on cal.actividad_id = a.id and cal.estudiante_id = e.id
  where a.semana_id = p_semana_id
    and se.habilitado_estudiantes = true
    and c.acceso_estudiantes = true
    and ce.estado = 'activo'
    and e.auth_user_id = auth.uid()
    and e.activo
    and a.visible_estudiantes <> 'oculto'
  order by a.created_at;
$$;

revoke all on function public.gestionesjj_estudiante_actividades_semana(uuid) from public;
revoke all on function public.gestionesjj_estudiante_actividades_semana(uuid) from anon;
grant execute on function public.gestionesjj_estudiante_actividades_semana(uuid) to authenticated;

create or replace function public.gestionesjj_estudiante_archivos_entrega(p_actividad_id uuid)
returns table (id uuid, archivo_nombre text)
language sql
stable
security definer
set search_path = ''
as $$
  select ea.id, ea.archivo_nombre
  from public.gestionesjj_curso_entrega_archivos ea
  join public.gestionesjj_curso_entregas en on en.id = ea.entrega_id
  join public.gestionesjj_estudiantes e on e.id = en.estudiante_id
  where en.actividad_id = p_actividad_id
    and e.auth_user_id = auth.uid()
    and e.activo
  order by ea.created_at;
$$;

revoke all on function public.gestionesjj_estudiante_archivos_entrega(uuid) from public;
revoke all on function public.gestionesjj_estudiante_archivos_entrega(uuid) from anon;
grant execute on function public.gestionesjj_estudiante_archivos_entrega(uuid) to authenticated;
