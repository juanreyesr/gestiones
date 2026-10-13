-- Cursos: carné automático por correlativo, preguntas del perfil editables
-- y bloqueo de tareas para quien no ha completado su perfil.
--
-- Decisiones de diseño:
-- - Carné: cada curso elige 'manual' (el docente lo escribe, como hasta
--   ahora) o 'automatico'. En automático, un trigger BEFORE INSERT en
--   gestionesjj_curso_estudiantes asigna AAAA + correlativo de 6 dígitos
--   (2026000001). El correlativo es UNO solo para todos los cursos y NO se
--   reinicia al cambiar de año: si 2026 terminó en 2026000007, el siguiente
--   en 2027 es 2027000008. El año es el de la asignación (hora de Guatemala).
--   Si la misma persona (identidad global) ya tiene un carné con ese formato
--   en otro curso, se reutiliza: el carné identifica a la persona.
-- - Preguntas del perfil: globales (el perfil es de la persona, no del
--   curso). Las respuestas viven en gestionesjj_estudiantes.perfil_respuestas
--   (jsonb: id de pregunta -> texto). Las tres preguntas fijas anteriores se
--   siembran como preguntas editables y sus respuestas se copian; las
--   columnas reflexion_* se conservan sin uso por si hiciera falta revisar.
-- - Perfil completo = foto, fecha de nacimiento, país y todas las preguntas
--   activas respondidas.
-- - Bloqueo: cada curso puede indicar desde qué semana se bloquean las
--   tareas (perfil_bloqueo_semana; null = sin bloqueo). Se aplica en la RPC
--   que lista tareas y, del lado del servidor, al subir una entrega.

-- ============================================================
-- 1) Carné automático
-- ============================================================
alter table public.gestionesjj_cursos_impartidos
  add column if not exists carne_modo text not null default 'manual',
  add column if not exists perfil_bloqueo_semana integer;

alter table public.gestionesjj_cursos_impartidos
  drop constraint if exists gestionesjj_cursos_impartidos_carne_modo_check;
alter table public.gestionesjj_cursos_impartidos
  add constraint gestionesjj_cursos_impartidos_carne_modo_check check (carne_modo in ('manual', 'automatico'));

alter table public.gestionesjj_cursos_impartidos
  drop constraint if exists gestionesjj_cursos_impartidos_perfil_bloqueo_check;
alter table public.gestionesjj_cursos_impartidos
  add constraint gestionesjj_cursos_impartidos_perfil_bloqueo_check check (perfil_bloqueo_semana is null or perfil_bloqueo_semana between 1 and 60);

create table if not exists public.gestionesjj_carne_correlativo (
  id integer primary key default 1 check (id = 1),
  ultimo integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.gestionesjj_carne_correlativo (id, ultimo) values (1, 0) on conflict (id) do nothing;

alter table public.gestionesjj_carne_correlativo enable row level security;
revoke all on public.gestionesjj_carne_correlativo from anon;
grant select on public.gestionesjj_carne_correlativo to authenticated;
drop policy if exists "carne_correlativo_select_owner" on public.gestionesjj_carne_correlativo;
create policy "carne_correlativo_select_owner" on public.gestionesjj_carne_correlativo for select to authenticated using (public.gestionesjj_is_owner());

-- Toma el siguiente número del correlativo (atómico: el UPDATE bloquea la fila).
create or replace function public.gestionesjj_siguiente_carne()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_numero integer;
begin
  update public.gestionesjj_carne_correlativo
    set ultimo = ultimo + 1, updated_at = now()
    where id = 1
    returning ultimo into v_numero;
  return to_char(now() at time zone 'America/Guatemala', 'YYYY') || lpad(v_numero::text, 6, '0');
end;
$$;

revoke all on function public.gestionesjj_siguiente_carne() from public;
revoke all on function public.gestionesjj_siguiente_carne() from anon;
revoke all on function public.gestionesjj_siguiente_carne() from authenticated;

create or replace function public.gestionesjj_asignar_carne_automatico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modo text;
  v_existente text;
begin
  if coalesce(btrim(new.carne), '') <> '' then
    return new;
  end if;

  select c.carne_modo into v_modo from public.gestionesjj_cursos_impartidos c where c.id = new.curso_id;
  if v_modo is distinct from 'automatico' then
    return new;
  end if;

  if new.estudiante_id is not null then
    select ce.carne into v_existente
    from public.gestionesjj_curso_estudiantes ce
    where ce.estudiante_id = new.estudiante_id
      and ce.carne ~ '^[0-9]{10}$'
    order by ce.created_at
    limit 1;
  end if;

  new.carne := coalesce(v_existente, public.gestionesjj_siguiente_carne());
  return new;
end;
$$;

revoke all on function public.gestionesjj_asignar_carne_automatico() from public, anon, authenticated;

drop trigger if exists gestionesjj_curso_estudiantes_carne_auto on public.gestionesjj_curso_estudiantes;
create trigger gestionesjj_curso_estudiantes_carne_auto
  before insert on public.gestionesjj_curso_estudiantes
  for each row execute function public.gestionesjj_asignar_carne_automatico();

-- ============================================================
-- 2) Preguntas del perfil (globales) y respuestas
-- ============================================================
create table if not exists public.gestionesjj_perfil_preguntas (
  id uuid primary key default gen_random_uuid(),
  orden integer not null default 0,
  texto text not null check (char_length(texto) between 1 and 300),
  texto_en text check (texto_en is null or char_length(texto_en) <= 300),
  texto_pt text check (texto_pt is null or char_length(texto_pt) <= 300),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gestionesjj_perfil_preguntas enable row level security;
revoke all on public.gestionesjj_perfil_preguntas from anon;
grant select, insert, update, delete on public.gestionesjj_perfil_preguntas to authenticated;

drop policy if exists "perfil_preguntas_select_owner" on public.gestionesjj_perfil_preguntas;
drop policy if exists "perfil_preguntas_insert_owner" on public.gestionesjj_perfil_preguntas;
drop policy if exists "perfil_preguntas_update_owner" on public.gestionesjj_perfil_preguntas;
drop policy if exists "perfil_preguntas_delete_owner" on public.gestionesjj_perfil_preguntas;
create policy "perfil_preguntas_select_owner" on public.gestionesjj_perfil_preguntas for select to authenticated using (public.gestionesjj_is_owner());
create policy "perfil_preguntas_insert_owner" on public.gestionesjj_perfil_preguntas for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "perfil_preguntas_update_owner" on public.gestionesjj_perfil_preguntas for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "perfil_preguntas_delete_owner" on public.gestionesjj_perfil_preguntas for delete to authenticated using (public.gestionesjj_is_owner());

alter table public.gestionesjj_estudiantes
  add column if not exists perfil_respuestas jsonb not null default '{}'::jsonb;

-- Siembra las tres preguntas que estaban fijas y copia sus respuestas (solo la primera vez).
do $$
declare
  v_quien uuid;
  v_proposito uuid;
  v_recuerdo uuid;
begin
  if exists (select 1 from public.gestionesjj_perfil_preguntas) then
    return;
  end if;

  insert into public.gestionesjj_perfil_preguntas (orden, texto, texto_en, texto_pt)
    values (1, '¿Quién soy?', 'Who am I?', 'Quem sou eu?') returning id into v_quien;
  insert into public.gestionesjj_perfil_preguntas (orden, texto, texto_en, texto_pt)
    values (2, '¿Cuál es mi propósito?', 'What is my purpose?', 'Qual é o meu propósito?') returning id into v_proposito;
  insert into public.gestionesjj_perfil_preguntas (orden, texto, texto_en, texto_pt)
    values (3, '¿Cómo quiero ser recordado?', 'How do I want to be remembered?', 'Como quero ser lembrado?') returning id into v_recuerdo;

  update public.gestionesjj_estudiantes
    set perfil_respuestas = jsonb_strip_nulls(jsonb_build_object(
      v_quien::text, nullif(btrim(reflexion_quien_soy), ''),
      v_proposito::text, nullif(btrim(reflexion_proposito), ''),
      v_recuerdo::text, nullif(btrim(reflexion_recuerdo), '')
    ));
end;
$$;

-- Perfil completo: foto, fecha de nacimiento, país y todas las preguntas activas respondidas.
create or replace function public.gestionesjj_perfil_completo(p_estudiante_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select e.foto_path is not null
      and e.fecha_nacimiento is not null
      and coalesce(btrim(e.pais), '') <> ''
      and not exists (
        select 1
        from public.gestionesjj_perfil_preguntas p
        where p.activa
          and coalesce(btrim(e.perfil_respuestas ->> p.id::text), '') = ''
      )
    from public.gestionesjj_estudiantes e
    where e.id = p_estudiante_id
  ), false);
$$;

revoke all on function public.gestionesjj_perfil_completo(uuid) from public;
revoke all on function public.gestionesjj_perfil_completo(uuid) from anon;
revoke all on function public.gestionesjj_perfil_completo(uuid) from authenticated;
grant execute on function public.gestionesjj_perfil_completo(uuid) to service_role;

-- Preguntas activas, para el formulario "Mi perfil" del estudiante.
create or replace function public.gestionesjj_estudiante_perfil_preguntas()
returns table (id uuid, texto text, texto_en text, texto_pt text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.texto, p.texto_en, p.texto_pt
  from public.gestionesjj_perfil_preguntas p
  where p.activa
    and exists (select 1 from public.gestionesjj_estudiantes e where e.auth_user_id = auth.uid() and e.activo)
  order by p.orden, p.created_at;
$$;

revoke all on function public.gestionesjj_estudiante_perfil_preguntas() from public;
revoke all on function public.gestionesjj_estudiante_perfil_preguntas() from anon;
grant execute on function public.gestionesjj_estudiante_perfil_preguntas() to authenticated;

-- Ficha propia con las respuestas a las preguntas editables. Es una RPC
-- nueva (la anterior, gestionesjj_estudiante_mi_ficha, se deja intacta para
-- no romper la versión desplegada mientras se publica este cambio).
create or replace function public.gestionesjj_estudiante_mi_ficha_perfil()
returns table (
  foto_path text,
  fecha_nacimiento date,
  pais text,
  perfil_respuestas jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.foto_path, e.fecha_nacimiento, e.pais, e.perfil_respuestas
  from public.gestionesjj_estudiantes e
  where e.auth_user_id = auth.uid() and e.activo;
$$;

revoke all on function public.gestionesjj_estudiante_mi_ficha_perfil() from public;
revoke all on function public.gestionesjj_estudiante_mi_ficha_perfil() from anon;
grant execute on function public.gestionesjj_estudiante_mi_ficha_perfil() to authenticated;

-- ============================================================
-- 3) Bloqueo de tareas por perfil incompleto
-- ============================================================
-- Devuelve la semana desde la que el estudiante autenticado tiene las
-- tareas bloqueadas en este curso, o null si no hay bloqueo.
create or replace function public.gestionesjj_estudiante_bloqueo_perfil(p_curso_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select c.perfil_bloqueo_semana
  from public.gestionesjj_cursos_impartidos c
  join public.gestionesjj_curso_estudiantes ce on ce.curso_id = c.id
  join public.gestionesjj_estudiantes e on e.id = ce.estudiante_id
  where c.id = p_curso_id
    and c.perfil_bloqueo_semana is not null
    and ce.estado = 'activo'
    and e.auth_user_id = auth.uid()
    and e.activo
    and not public.gestionesjj_perfil_completo(e.id)
  limit 1;
$$;

revoke all on function public.gestionesjj_estudiante_bloqueo_perfil(uuid) from public;
revoke all on function public.gestionesjj_estudiante_bloqueo_perfil(uuid) from anon;
grant execute on function public.gestionesjj_estudiante_bloqueo_perfil(uuid) to authenticated;

-- Misma RPC de la migración 031, ahora sin tareas de semanas bloqueadas.
create or replace function public.gestionesjj_estudiante_actividades_semana(p_semana_id uuid)
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
    and (
      c.perfil_bloqueo_semana is null
      or se.numero < c.perfil_bloqueo_semana
      or public.gestionesjj_perfil_completo(e.id)
    )
  order by a.created_at;
$$;

revoke all on function public.gestionesjj_estudiante_actividades_semana(uuid) from public;
revoke all on function public.gestionesjj_estudiante_actividades_semana(uuid) from anon;
grant execute on function public.gestionesjj_estudiante_actividades_semana(uuid) to authenticated;

-- ============================================================
-- 4) Datos (aplicado una sola vez en producción, no en esta migración):
-- el curso "Nuevo testamento" pasó a carné automático y sus carnés
-- 0002..008 se convirtieron a 2026000002..2026000008 (también en sus
-- solicitudes aprobadas); el correlativo quedó en 8, así que el siguiente
-- estudiante recibe 2026000009.
-- ============================================================
