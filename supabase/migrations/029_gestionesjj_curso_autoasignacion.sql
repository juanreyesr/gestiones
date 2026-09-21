-- Autoasignacion de estudiantes por QR/enlace, con aprobacion del docente.
--
-- Decisiones de diseno:
-- - Cada curso tiene un token fijo (autoasignacion_token), generado una
--   sola vez y que nunca cambia: el enlace/QR que se comparte sigue
--   funcionando aunque el docente apague y prenda el interruptor
--   "Habilitar asignaciones" (autoasignacion_activa) varias veces.
-- - Quien llena el formulario publico NO queda inscrito de inmediato:
--   crea una fila en gestionesjj_curso_solicitudes ('pendiente'). El
--   docente debe revisarla, asignar el numero de carne y aprobarla (o
--   rechazarla) desde el panel.
-- - La contrasena que la persona eligio se guarda cifrada (mismo
--   AES-256-GCM que ya usa el resto del area de estudiantes) para poder
--   crear su cuenta real de Supabase Auth en el momento de la aprobacion,
--   sin pedirle que la vuelva a escribir.
-- - El envio del formulario publico pasa por una ruta del servidor con
--   service role (no una RPC publica): cifrar la contrasena requiere la
--   llave de ESTUDIANTES_ENC_KEY, que solo existe del lado del servidor
--   Node, no en Postgres. La lectura de la info del curso (nombre,
--   docente, si esta activa) si es una RPC publica de solo lectura,
--   igual que el patron ya usado en Clinica/Encuestas para paginas
--   publicas por token.

alter table public.gestionesjj_cursos_impartidos
  add column if not exists autoasignacion_activa boolean not null default false,
  add column if not exists autoasignacion_token uuid not null default gen_random_uuid();

create unique index if not exists gestionesjj_cursos_impartidos_autoasignacion_token_idx
  on public.gestionesjj_cursos_impartidos (autoasignacion_token);

create table if not exists public.gestionesjj_curso_solicitudes (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.gestionesjj_cursos_impartidos(id) on delete cascade,
  nombre text not null,
  correo text not null,
  contrasena_cifrada text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  carne text,
  curso_estudiante_id uuid references public.gestionesjj_curso_estudiantes(id) on delete set null,
  created_at timestamptz not null default now(),
  resuelto_en timestamptz
);

create index if not exists gestionesjj_curso_solicitudes_curso_idx
  on public.gestionesjj_curso_solicitudes (curso_id, estado);

-- Evita que la misma persona mande varias solicitudes pendientes para el
-- mismo curso (por ejemplo, si reenvia el formulario sin darse cuenta).
create unique index if not exists gestionesjj_curso_solicitudes_pendiente_unica_idx
  on public.gestionesjj_curso_solicitudes (curso_id, lower(correo))
  where estado = 'pendiente';

-- ============================================================
-- RLS: solo el owner lee/aprueba/rechaza desde el navegador. El envio del
-- formulario publico y la aprobacion (que crea la cuenta real) pasan
-- siempre por rutas del servidor con service role.
-- ============================================================
alter table public.gestionesjj_curso_solicitudes enable row level security;
revoke all on public.gestionesjj_curso_solicitudes from anon;
grant select, insert, update, delete on public.gestionesjj_curso_solicitudes to authenticated;

drop policy if exists "curso_solicitudes_select_owner" on public.gestionesjj_curso_solicitudes;
drop policy if exists "curso_solicitudes_insert_owner" on public.gestionesjj_curso_solicitudes;
drop policy if exists "curso_solicitudes_update_owner" on public.gestionesjj_curso_solicitudes;
drop policy if exists "curso_solicitudes_delete_owner" on public.gestionesjj_curso_solicitudes;
create policy "curso_solicitudes_select_owner" on public.gestionesjj_curso_solicitudes for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_solicitudes_insert_owner" on public.gestionesjj_curso_solicitudes for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "curso_solicitudes_update_owner" on public.gestionesjj_curso_solicitudes for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "curso_solicitudes_delete_owner" on public.gestionesjj_curso_solicitudes for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- RPC publica de solo lectura: info minima del curso para la pagina
-- publica de autoasignacion (nombre, universidad, docente, si esta
-- activa). No expone nada sensible.
-- ============================================================
create or replace function public.gestionesjj_curso_asignacion_info(p_token uuid)
returns table (
  curso_nombre text,
  universidad_nombre text,
  docente_nombre text,
  activa boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.nombre, u.nombre, c.docente_nombre, c.autoasignacion_activa
  from public.gestionesjj_cursos_impartidos c
  join public.gestionesjj_universidades u on u.id = c.universidad_id
  where c.autoasignacion_token = p_token;
$$;

revoke all on function public.gestionesjj_curso_asignacion_info(uuid) from public;
grant execute on function public.gestionesjj_curso_asignacion_info(uuid) to anon, authenticated;
