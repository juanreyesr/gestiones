-- Nombre del docente que imparte el curso, visible para los estudiantes
-- inscritos (antes solo lo veia el owner en el panel de administracion).

alter table public.gestionesjj_cursos_impartidos
  add column if not exists docente_nombre text;

-- Se extiende la RPC que ya usa el estudiante para listar sus cursos.
drop function if exists public.gestionesjj_estudiante_mis_cursos();

create function public.gestionesjj_estudiante_mis_cursos()
returns table (
  curso_id uuid,
  curso_nombre text,
  curso_codigo text,
  periodo text,
  estado text,
  universidad_nombre text,
  docente_nombre text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.nombre,
    c.codigo,
    c.periodo,
    c.estado,
    u.nombre,
    c.docente_nombre
  from public.gestionesjj_curso_estudiantes ce
  join public.gestionesjj_estudiantes e on e.id = ce.estudiante_id
  join public.gestionesjj_cursos_impartidos c on c.id = ce.curso_id
  join public.gestionesjj_universidades u on u.id = c.universidad_id
  where e.auth_user_id = auth.uid()
    and e.activo
    and ce.estado = 'activo'
    and c.acceso_estudiantes = true
  order by c.nombre;
$$;

revoke all on function public.gestionesjj_estudiante_mis_cursos() from public;
revoke all on function public.gestionesjj_estudiante_mis_cursos() from anon;
grant execute on function public.gestionesjj_estudiante_mis_cursos() to authenticated;
