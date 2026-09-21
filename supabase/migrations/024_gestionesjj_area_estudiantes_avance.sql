-- Area de estudiantes (Fase 3, parte 1): corrige un bug de la Fase 2 y
-- agrega el estado aprobado/reprobado del curso para el estudiante.
--
-- BUG en gestionesjj_estudiante_actividades_semana (migracion 023):
-- gestionesjj_curso_calificaciones.estudiante_id referencia
-- gestionesjj_curso_estudiantes(id) (la inscripcion), NO
-- gestionesjj_estudiantes(id) (la identidad global). La funcion comparaba
-- cal.estudiante_id contra e.id (el id global), que nunca coincide, asi
-- que ninguna nota ni retroalimentacion publicada le llegaba al
-- estudiante. Se corrige aqui comparando contra ce.id.
--
-- Regla de aprobado/reprobado (decidida explicitamente): promedio simple
-- de (nota / punteo * 100) de todas las actividades ya calificadas y
-- publicadas que tengan punteo asignado; aprueba con 60% o mas. Al ser un
-- promedio de porcentajes (no una suma de puntos), da igual si el curso
-- tiene 2 actividades o 20: cada una pesa lo mismo. El estudiante solo ve
-- el resultado (aprobado/reprobado), nunca el porcentaje.

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
  left join public.gestionesjj_curso_calificaciones cal on cal.actividad_id = a.id and cal.estudiante_id = ce.id
  where a.semana_id = p_semana_id
    and se.habilitado_estudiantes = true
    and c.acceso_estudiantes = true
    and ce.estado = 'activo'
    and e.auth_user_id = auth.uid()
    and e.activo
    and a.visible_estudiantes <> 'oculto'
  order by a.created_at;
$$;

-- ============================================================
-- Estado aprobado/reprobado del curso (solo lo que necesita mostrar,
-- nunca el porcentaje real).
-- ============================================================
create or replace function public.gestionesjj_estudiante_estado_curso(p_curso_id uuid)
returns table (aprobado boolean, actividades_calificadas integer)
language sql
stable
security definer
set search_path = ''
as $$
  with mi_inscripcion as (
    select ce.id as curso_estudiante_id
    from public.gestionesjj_curso_estudiantes ce
    join public.gestionesjj_estudiantes e on e.id = ce.estudiante_id
    where ce.curso_id = p_curso_id
      and ce.estado = 'activo'
      and e.auth_user_id = auth.uid()
      and e.activo
  ),
  mias as (
    select (cal.nota / a.punteo * 100) as porcentaje
    from public.gestionesjj_curso_calificaciones cal
    join public.gestionesjj_curso_actividades a on a.id = cal.actividad_id
    join mi_inscripcion mi on mi.curso_estudiante_id = cal.estudiante_id
    where cal.publicado_en is not null
      and cal.nota is not null
      and a.punteo is not null
      and a.punteo > 0
  )
  select
    case when count(*) > 0 then (avg(porcentaje) >= 60) else null end,
    count(*)::integer
  from mias;
$$;

revoke all on function public.gestionesjj_estudiante_estado_curso(uuid) from public;
revoke all on function public.gestionesjj_estudiante_estado_curso(uuid) from anon;
grant execute on function public.gestionesjj_estudiante_estado_curso(uuid) to authenticated;
