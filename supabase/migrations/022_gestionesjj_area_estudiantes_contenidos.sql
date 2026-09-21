-- Area de estudiantes (Fase 1): semanas y contenidos habilitables.
--
-- Diseno: un solo interruptor real (por semana); los contenidos heredan la
-- visibilidad de su semana salvo que se fuerce una excepcion puntual
-- ('visible' u 'oculto'). Asi, marcar la semana publica todo lo que tenga
-- adentro sin tener que marcar cada contenido, y solo hay que tocar el
-- contenido cuando de verdad se quiere una excepcion.
--
-- Los estudiantes siguen sin leer las tablas de Cursos directo: las RPCs de
-- abajo validan la inscripcion activa y el acceso del curso en cada
-- consulta, y nunca devuelven archivo_path (el archivo se sirve aparte via
-- una URL firmada de corta duracion, emitida por una ruta del servidor que
-- vuelve a validar todo esto).

-- ============================================================
-- CAMPOS NUEVOS
-- ============================================================
alter table public.gestionesjj_curso_semanas
  add column if not exists habilitado_estudiantes boolean not null default false,
  add column if not exists habilitado_en timestamptz;

alter table public.gestionesjj_curso_contenidos
  add column if not exists visible_estudiantes text not null default 'hereda'
    check (visible_estudiantes in ('hereda', 'visible', 'oculto'));

-- ============================================================
-- RPCs para el estudiante autenticado
-- ============================================================

create or replace function public.gestionesjj_estudiante_semanas_curso(p_curso_id uuid)
returns table (
  id uuid,
  numero integer,
  titulo text,
  fecha date,
  tipo_sesion text
)
language sql
stable
security definer
set search_path = ''
as $$
  select se.id, se.numero, se.titulo, se.fecha, se.tipo_sesion
  from public.gestionesjj_curso_semanas se
  join public.gestionesjj_cursos_impartidos c on c.id = se.curso_id
  join public.gestionesjj_curso_estudiantes ce on ce.curso_id = c.id
  join public.gestionesjj_estudiantes e on e.id = ce.estudiante_id
  where se.curso_id = p_curso_id
    and se.habilitado_estudiantes = true
    and c.acceso_estudiantes = true
    and ce.estado = 'activo'
    and e.auth_user_id = auth.uid()
    and e.activo
  order by se.numero;
$$;

revoke all on function public.gestionesjj_estudiante_semanas_curso(uuid) from public;
revoke all on function public.gestionesjj_estudiante_semanas_curso(uuid) from anon;
grant execute on function public.gestionesjj_estudiante_semanas_curso(uuid) to authenticated;

create or replace function public.gestionesjj_estudiante_contenidos_semana(p_semana_id uuid)
returns table (
  id uuid,
  categoria text,
  titulo text,
  descripcion text,
  archivo_nombre text,
  archivo_mime text,
  tiene_archivo boolean,
  url_externa text,
  orden integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    co.id,
    co.categoria,
    co.titulo,
    co.descripcion,
    co.archivo_nombre,
    co.archivo_mime,
    (co.archivo_path is not null),
    co.url_externa,
    co.orden
  from public.gestionesjj_curso_contenidos co
  join public.gestionesjj_curso_semanas se on se.id = co.semana_id
  join public.gestionesjj_cursos_impartidos c on c.id = se.curso_id
  join public.gestionesjj_curso_estudiantes ce on ce.curso_id = c.id
  join public.gestionesjj_estudiantes e on e.id = ce.estudiante_id
  where co.semana_id = p_semana_id
    and se.habilitado_estudiantes = true
    and c.acceso_estudiantes = true
    and ce.estado = 'activo'
    and e.auth_user_id = auth.uid()
    and e.activo
    and co.visible_estudiantes <> 'oculto'
  order by co.orden, co.created_at;
$$;

revoke all on function public.gestionesjj_estudiante_contenidos_semana(uuid) from public;
revoke all on function public.gestionesjj_estudiante_contenidos_semana(uuid) from anon;
grant execute on function public.gestionesjj_estudiante_contenidos_semana(uuid) to authenticated;
