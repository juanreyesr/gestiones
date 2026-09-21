-- Area de estudiantes (Fase 0): acceso real de estudiantes al modulo Cursos.
--
-- Decisiones de diseno (ver analisis previo):
-- - Los estudiantes tienen cuenta real de Supabase Auth (no un enlace/PIN),
--   creada solo por el owner desde el panel (sin auto-registro).
-- - Identidad global: gestionesjj_estudiantes es la "persona" (correo unico,
--   cuenta asociada); gestionesjj_curso_estudiantes sigue siendo la
--   inscripcion por curso y ahora puede enlazarse a esa persona.
-- - La contrasena que asigna el owner se guarda cifrada (AES-256-GCM, clave
--   en ESTUDIANTES_ENC_KEY, nunca en la base) para poder reimprimir la ficha
--   de credenciales cuando haga falta; el hash real de acceso lo maneja
--   Supabase Auth como con cualquier otra cuenta.
-- - Los estudiantes NUNCA escriben en las tablas existentes del modulo
--   Cursos (evita el on delete cascade de created_by). Leen sus propios
--   cursos a traves de RPCs SECURITY DEFINER dedicadas, nunca con policies
--   nuevas sobre las tablas ya probadas de Cursos.
-- - gestionesjj_is_owner() no se toca: sigue siendo el candado maestro de
--   todo lo existente y de las tablas nuevas (el owner ve todo, siempre).

-- ============================================================
-- CAMPOS NUEVOS EN TABLAS EXISTENTES
-- ============================================================

-- Checkbox maestro por curso: "dar acceso a estudiantes".
alter table public.gestionesjj_cursos_impartidos
  add column if not exists acceso_estudiantes boolean not null default false;

-- ============================================================
-- IDENTIDAD GLOBAL DEL ESTUDIANTE
-- ============================================================
create table if not exists public.gestionesjj_estudiantes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null,
  correo text not null unique,
  contrasena_cifrada text,
  debe_cambiar_contrasena boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enlaza cada inscripcion a la persona global (opcional: las inscripciones
-- historicas quedan sin enlazar y no se rompe ningun reporte existente).
alter table public.gestionesjj_curso_estudiantes
  add column if not exists estudiante_id uuid references public.gestionesjj_estudiantes(id) on delete set null;

create index if not exists gestionesjj_curso_estudiantes_estudiante_idx
  on public.gestionesjj_curso_estudiantes (estudiante_id);

create index if not exists gestionesjj_estudiantes_auth_user_idx
  on public.gestionesjj_estudiantes (auth_user_id);

-- ============================================================
-- RLS: gestionesjj_estudiantes es solo-owner, igual que el resto del
-- modulo. Los estudiantes NUNCA leen esta tabla directo (ni siquiera su
-- propia fila): usan la RPC de abajo, que expone solo lo necesario y nunca
-- la contrasena cifrada.
-- ============================================================
alter table public.gestionesjj_estudiantes enable row level security;
revoke all on public.gestionesjj_estudiantes from anon;
grant select, insert, update, delete on public.gestionesjj_estudiantes to authenticated;

drop policy if exists "estudiantes_select_owner" on public.gestionesjj_estudiantes;
drop policy if exists "estudiantes_insert_owner" on public.gestionesjj_estudiantes;
drop policy if exists "estudiantes_update_owner" on public.gestionesjj_estudiantes;
drop policy if exists "estudiantes_delete_owner" on public.gestionesjj_estudiantes;
create policy "estudiantes_select_owner" on public.gestionesjj_estudiantes for select to authenticated using (public.gestionesjj_is_owner());
create policy "estudiantes_insert_owner" on public.gestionesjj_estudiantes for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "estudiantes_update_owner" on public.gestionesjj_estudiantes for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "estudiantes_delete_owner" on public.gestionesjj_estudiantes for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_estudiantes_set_updated_at on public.gestionesjj_estudiantes;
create trigger gestionesjj_estudiantes_set_updated_at before update on public.gestionesjj_estudiantes for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- RPCs para el estudiante autenticado (SECURITY DEFINER: leen solo lo
-- suyo, sin depender de reglas nuevas sobre las tablas de Cursos).
-- ============================================================

create or replace function public.gestionesjj_estudiante_mi_perfil()
returns table (nombre text, correo text, debe_cambiar_contrasena boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select e.nombre, e.correo, e.debe_cambiar_contrasena
  from public.gestionesjj_estudiantes e
  where e.auth_user_id = auth.uid() and e.activo;
$$;

revoke all on function public.gestionesjj_estudiante_mi_perfil() from public;
revoke all on function public.gestionesjj_estudiante_mi_perfil() from anon;
grant execute on function public.gestionesjj_estudiante_mi_perfil() to authenticated;

create or replace function public.gestionesjj_estudiante_mis_cursos()
returns table (
  curso_id uuid,
  curso_nombre text,
  curso_codigo text,
  periodo text,
  estado text,
  universidad_nombre text
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
    u.nombre
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
