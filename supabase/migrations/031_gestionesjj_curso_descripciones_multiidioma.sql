-- Descripciones/instrucciones de contenidos y tareas en los 3 idiomas del
-- area de estudiantes (es/en/pt). El docente las escribe el mismo cuando
-- crea o edita el contenido/tarea (campos opcionales, en espanol por
-- defecto); si no llena la traduccion a un idioma, el estudiante que elija
-- ese idioma ve la version en espanol como respaldo (logica de "cae a
-- espanol" resuelta en el cliente, no aqui).
--
-- Solo agrega columnas nuevas a tablas existentes del modulo Cursos y
-- reemplaza dos RPCs (drop+create porque cambia su tipo de retorno) que ya
-- son exclusivas de este modulo: no toca nada de las demas apps de la BD
-- compartida.

alter table public.gestionesjj_curso_contenidos
  add column if not exists descripcion_en text,
  add column if not exists descripcion_pt text;

alter table public.gestionesjj_curso_actividades
  add column if not exists descripcion_en text,
  add column if not exists descripcion_pt text;

drop function if exists public.gestionesjj_estudiante_contenidos_semana(uuid);
create function public.gestionesjj_estudiante_contenidos_semana(p_semana_id uuid)
returns table (
  id uuid,
  categoria text,
  titulo text,
  descripcion text,
  descripcion_en text,
  descripcion_pt text,
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
    co.descripcion_en,
    co.descripcion_pt,
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

drop function if exists public.gestionesjj_estudiante_actividades_semana(uuid);
create function public.gestionesjj_estudiante_actividades_semana(p_semana_id uuid)
returns table (
  id uuid,
  tipo text,
  titulo text,
  descripcion text,
  descripcion_en text,
  descripcion_pt text,
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
    a.descripcion_en,
    a.descripcion_pt,
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
