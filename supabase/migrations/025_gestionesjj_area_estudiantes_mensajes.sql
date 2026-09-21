-- Area de estudiantes (Fase 4): chat 1-a-1 entre cada estudiante y el
-- docente (el owner de la plataforma; esta app es de un solo docente, asi
-- que el chat es un hilo por estudiante, no por curso).
--
-- Decisiones de diseno:
-- - Un solo hilo por estudiante (gestionesjj_estudiantes.id), sin importar
--   en cuantos cursos este inscrito: es 1-a-1 con "el docente", no por curso.
-- - Igual que en las fases anteriores, el estudiante nunca escribe en la
--   tabla directo: su envio y su marcado de "leido" pasan por rutas del
--   servidor con service role, que validan todo (misma razon: evitar
--   policies nuevas sobre tablas que ya son solo-owner). El docente si
--   escribe directo desde el navegador, como en el resto del panel de
--   administracion, porque su acceso ya esta cubierto por
--   gestionesjj_is_owner().
-- - Sin created_by: a diferencia de las demas tablas del modulo, esta la
--   escriben dos partes distintas (docente con sesion propia, estudiante
--   via service role sin contexto de auth.uid()), asi que un default de
--   auth.uid() fallaria en las inserciones del estudiante. Incidencia
--   identica a gestionesjj_curso_entregas en la Fase 2.

create table if not exists public.gestionesjj_estudiante_mensajes (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.gestionesjj_estudiantes(id) on delete cascade,
  remitente text not null check (remitente in ('docente', 'estudiante')),
  contenido text not null check (char_length(btrim(contenido)) > 0 and char_length(contenido) <= 4000),
  leido_docente boolean not null default false,
  leido_estudiante boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_estudiante_mensajes_estudiante_idx
  on public.gestionesjj_estudiante_mensajes (estudiante_id, created_at);

-- ============================================================
-- RLS: solo el owner lee/escribe esta tabla desde el navegador. Los envios
-- y el marcado de "leido" del estudiante ocurren siempre via una ruta del
-- servidor con service role, que salta RLS por diseno y valida todo antes
-- de escribir (misma politica que las entregas de la Fase 2).
-- ============================================================
alter table public.gestionesjj_estudiante_mensajes enable row level security;
revoke all on public.gestionesjj_estudiante_mensajes from anon;
grant select, insert, update, delete on public.gestionesjj_estudiante_mensajes to authenticated;

drop policy if exists "estudiante_mensajes_select_owner" on public.gestionesjj_estudiante_mensajes;
drop policy if exists "estudiante_mensajes_insert_owner" on public.gestionesjj_estudiante_mensajes;
drop policy if exists "estudiante_mensajes_update_owner" on public.gestionesjj_estudiante_mensajes;
drop policy if exists "estudiante_mensajes_delete_owner" on public.gestionesjj_estudiante_mensajes;
create policy "estudiante_mensajes_select_owner" on public.gestionesjj_estudiante_mensajes for select to authenticated using (public.gestionesjj_is_owner());
create policy "estudiante_mensajes_insert_owner" on public.gestionesjj_estudiante_mensajes for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "estudiante_mensajes_update_owner" on public.gestionesjj_estudiante_mensajes for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "estudiante_mensajes_delete_owner" on public.gestionesjj_estudiante_mensajes for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- RPCs de lectura para el estudiante autenticado (SECURITY DEFINER: leen
-- solo su propio hilo, sin depender de policies nuevas sobre la tabla).
-- ============================================================

create or replace function public.gestionesjj_estudiante_mis_mensajes()
returns table (
  id uuid,
  remitente text,
  contenido text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.remitente, m.contenido, m.created_at
  from public.gestionesjj_estudiante_mensajes m
  join public.gestionesjj_estudiantes e on e.id = m.estudiante_id
  where e.auth_user_id = auth.uid()
    and e.activo
  order by m.created_at;
$$;

revoke all on function public.gestionesjj_estudiante_mis_mensajes() from public;
revoke all on function public.gestionesjj_estudiante_mis_mensajes() from anon;
grant execute on function public.gestionesjj_estudiante_mis_mensajes() to authenticated;

create or replace function public.gestionesjj_estudiante_mensajes_no_leidos()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.gestionesjj_estudiante_mensajes m
  join public.gestionesjj_estudiantes e on e.id = m.estudiante_id
  where e.auth_user_id = auth.uid()
    and e.activo
    and m.remitente = 'docente'
    and m.leido_estudiante = false;
$$;

revoke all on function public.gestionesjj_estudiante_mensajes_no_leidos() from public;
revoke all on function public.gestionesjj_estudiante_mensajes_no_leidos() from anon;
grant execute on function public.gestionesjj_estudiante_mensajes_no_leidos() to authenticated;
