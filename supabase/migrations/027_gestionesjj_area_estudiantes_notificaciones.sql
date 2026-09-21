-- Area de estudiantes (Fase 6): notificaciones in-app.
--
-- Decisiones de diseno:
-- - Se generan automaticamente con triggers en las tablas que ya existen
--   (calificaciones publicadas, mensajes del docente, semanas habilitadas,
--   actividades publicadas), en vez de que cada ruta/lib del admin tenga
--   que acordarse de insertar una notificacion a mano en cada lugar donde
--   podria originarse una.
-- - No se guarda un texto ya redactado (ni en espanol ni en ningun otro
--   idioma): se guarda `tipo` + `meta` (jsonb) con los datos crudos
--   (titulo de la actividad, numero de semana, extracto del mensaje...) y
--   el cliente arma el texto en el idioma que el estudiante tenga elegido,
--   igual que el resto de la interfaz (Fase 5).
-- - Mismo patron de siempre: el estudiante nunca escribe esta tabla
--   directo. Los triggers son SECURITY DEFINER (escriben sin depender de
--   RLS); marcar como leida pasa por una ruta del servidor con service
--   role.

create table if not exists public.gestionesjj_estudiante_notificaciones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.gestionesjj_estudiantes(id) on delete cascade,
  tipo text not null check (tipo in ('contenido', 'tarea', 'calificacion', 'mensaje')),
  curso_id uuid references public.gestionesjj_cursos_impartidos(id) on delete cascade,
  meta jsonb not null default '{}'::jsonb,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_estudiante_notificaciones_estudiante_idx
  on public.gestionesjj_estudiante_notificaciones (estudiante_id, created_at desc);

-- ============================================================
-- RLS: solo el owner lee/escribe esta tabla desde el navegador (para
-- depurar si hace falta). Los triggers de abajo, al ser SECURITY DEFINER,
-- escriben sin pasar por estas policies.
-- ============================================================
alter table public.gestionesjj_estudiante_notificaciones enable row level security;
revoke all on public.gestionesjj_estudiante_notificaciones from anon;
grant select, insert, update, delete on public.gestionesjj_estudiante_notificaciones to authenticated;

drop policy if exists "estudiante_notificaciones_select_owner" on public.gestionesjj_estudiante_notificaciones;
drop policy if exists "estudiante_notificaciones_insert_owner" on public.gestionesjj_estudiante_notificaciones;
drop policy if exists "estudiante_notificaciones_update_owner" on public.gestionesjj_estudiante_notificaciones;
drop policy if exists "estudiante_notificaciones_delete_owner" on public.gestionesjj_estudiante_notificaciones;
create policy "estudiante_notificaciones_select_owner" on public.gestionesjj_estudiante_notificaciones for select to authenticated using (public.gestionesjj_is_owner());
create policy "estudiante_notificaciones_insert_owner" on public.gestionesjj_estudiante_notificaciones for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "estudiante_notificaciones_update_owner" on public.gestionesjj_estudiante_notificaciones for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "estudiante_notificaciones_delete_owner" on public.gestionesjj_estudiante_notificaciones for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- Trigger 1: calificacion publicada. gestionesjj_curso_calificaciones.estudiante_id
-- apunta a gestionesjj_curso_estudiantes.id (la inscripcion), no a la
-- identidad global: hay que resolverla via curso_estudiantes.estudiante_id
-- (mismo dato que corrigio el bug de la Fase 3, migracion 024).
-- ============================================================
create or replace function public.gestionesjj_notificar_calificacion_publicada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_titulo text;
  v_curso_id uuid;
  v_estudiante_global uuid;
begin
  if new.publicado_en is not null and old.publicado_en is null then
    select a.titulo, se.curso_id into v_titulo, v_curso_id
    from public.gestionesjj_curso_actividades a
    join public.gestionesjj_curso_semanas se on se.id = a.semana_id
    where a.id = new.actividad_id;

    select ce.estudiante_id into v_estudiante_global
    from public.gestionesjj_curso_estudiantes ce
    where ce.id = new.estudiante_id;

    if v_estudiante_global is not null then
      insert into public.gestionesjj_estudiante_notificaciones (estudiante_id, tipo, curso_id, meta)
      values (v_estudiante_global, 'calificacion', v_curso_id, jsonb_build_object('titulo', v_titulo));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists gestionesjj_calificaciones_notificar on public.gestionesjj_curso_calificaciones;
create trigger gestionesjj_calificaciones_notificar
after update on public.gestionesjj_curso_calificaciones
for each row execute function public.gestionesjj_notificar_calificacion_publicada();

-- ============================================================
-- Trigger 2: nuevo mensaje del docente en el chat.
-- ============================================================
create or replace function public.gestionesjj_notificar_mensaje_docente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.remitente = 'docente' then
    insert into public.gestionesjj_estudiante_notificaciones (estudiante_id, tipo, meta)
    values (new.estudiante_id, 'mensaje', jsonb_build_object('extracto', left(new.contenido, 140)));
  end if;
  return new;
end;
$$;

drop trigger if exists gestionesjj_mensajes_notificar on public.gestionesjj_estudiante_mensajes;
create trigger gestionesjj_mensajes_notificar
after insert on public.gestionesjj_estudiante_mensajes
for each row execute function public.gestionesjj_notificar_mensaje_docente();

-- ============================================================
-- Trigger 3: semana habilitada para estudiantes (nuevo contenido
-- disponible). Las semanas nacen deshabilitadas (default false), asi que
-- basta escuchar el UPDATE que las activa.
-- ============================================================
create or replace function public.gestionesjj_notificar_semana_habilitada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.habilitado_estudiantes = true and old.habilitado_estudiantes is distinct from true then
    insert into public.gestionesjj_estudiante_notificaciones (estudiante_id, tipo, curso_id, meta)
    select ce.estudiante_id, 'contenido', new.curso_id, jsonb_build_object('numero', new.numero, 'titulo', new.titulo)
    from public.gestionesjj_curso_estudiantes ce
    where ce.curso_id = new.curso_id
      and ce.estado = 'activo'
      and ce.estudiante_id is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists gestionesjj_semanas_notificar on public.gestionesjj_curso_semanas;
create trigger gestionesjj_semanas_notificar
after update on public.gestionesjj_curso_semanas
for each row execute function public.gestionesjj_notificar_semana_habilitada();

-- ============================================================
-- Trigger 4: tarea publicada (visible para estudiantes) en una semana ya
-- habilitada. Cubre tanto crearla ya visible como cambiarle la visibilidad
-- despues; si la semana todavia no esta habilitada no notifica nada (la
-- notificacion de la semana, cuando se habilite, ya avisa del contenido
-- nuevo en general).
-- ============================================================
create or replace function public.gestionesjj_notificar_actividad_publicada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_curso_id uuid;
  v_habilitada boolean;
  v_debe_notificar boolean;
begin
  select se.curso_id, se.habilitado_estudiantes into v_curso_id, v_habilitada
  from public.gestionesjj_curso_semanas se
  where se.id = new.semana_id;

  if v_habilitada is not true then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_debe_notificar := new.visible_estudiantes <> 'oculto';
  else
    v_debe_notificar := new.visible_estudiantes <> 'oculto' and old.visible_estudiantes = 'oculto';
  end if;

  if v_debe_notificar then
    insert into public.gestionesjj_estudiante_notificaciones (estudiante_id, tipo, curso_id, meta)
    select ce.estudiante_id, 'tarea', v_curso_id, jsonb_build_object('titulo', new.titulo)
    from public.gestionesjj_curso_estudiantes ce
    where ce.curso_id = v_curso_id
      and ce.estado = 'activo'
      and ce.estudiante_id is not null;
  end if;

  return new;
end;
$$;

drop trigger if exists gestionesjj_actividades_notificar on public.gestionesjj_curso_actividades;
create trigger gestionesjj_actividades_notificar
after insert or update on public.gestionesjj_curso_actividades
for each row execute function public.gestionesjj_notificar_actividad_publicada();

-- ============================================================
-- RPCs de lectura para el estudiante autenticado.
-- ============================================================
create or replace function public.gestionesjj_estudiante_mis_notificaciones()
returns table (
  id uuid,
  tipo text,
  curso_id uuid,
  curso_nombre text,
  meta jsonb,
  leida boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.tipo, n.curso_id, c.nombre, n.meta, n.leida, n.created_at
  from public.gestionesjj_estudiante_notificaciones n
  join public.gestionesjj_estudiantes e on e.id = n.estudiante_id
  left join public.gestionesjj_cursos_impartidos c on c.id = n.curso_id
  where e.auth_user_id = auth.uid()
    and e.activo
  order by n.created_at desc
  limit 40;
$$;

revoke all on function public.gestionesjj_estudiante_mis_notificaciones() from public;
revoke all on function public.gestionesjj_estudiante_mis_notificaciones() from anon;
grant execute on function public.gestionesjj_estudiante_mis_notificaciones() to authenticated;

create or replace function public.gestionesjj_estudiante_notificaciones_no_leidas()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.gestionesjj_estudiante_notificaciones n
  join public.gestionesjj_estudiantes e on e.id = n.estudiante_id
  where e.auth_user_id = auth.uid()
    and e.activo
    and n.leida = false;
$$;

revoke all on function public.gestionesjj_estudiante_notificaciones_no_leidas() from public;
revoke all on function public.gestionesjj_estudiante_notificaciones_no_leidas() from anon;
grant execute on function public.gestionesjj_estudiante_notificaciones_no_leidas() to authenticated;
