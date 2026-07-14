-- Modulo Cursos: universidades donde el usuario imparte clases, los cursos
-- que dicta en cada una (reutilizables via clonacion de materiales), la
-- planificacion general de cada curso, sus semanas, el listado de
-- estudiantes con su historial de altas/bajas, los contenidos y materiales
-- de cada semana, las tareas/actividades con sus calificaciones y el
-- control de asistencia semanal.
--
-- Seguridad: todas las tablas usan RLS con gestionesjj_is_owner() (igual
-- que 002/006) y ademas se crea el bucket privado de storage
-- "gestionesjj-cursos" con politicas equivalentes sobre storage.objects.

-- ============================================================
-- UNIVERSIDADES
-- ============================================================
create table if not exists public.gestionesjj_universidades (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  siglas text,
  color text,
  logo_path text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CURSOS IMPARTIDOS
-- ============================================================
create table if not exists public.gestionesjj_cursos_impartidos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  universidad_id uuid not null references public.gestionesjj_universidades(id) on delete cascade,
  nombre text not null,
  codigo text,
  descripcion text,
  periodo text,
  horario text,
  estado text not null default 'activo' check (estado in ('activo','finalizado','archivado')),
  origen_curso_id uuid references public.gestionesjj_cursos_impartidos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PLANIFICACIONES Y CALENDARIOS GENERALES DEL CURSO
-- ============================================================
create table if not exists public.gestionesjj_curso_planificaciones (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  curso_id uuid not null references public.gestionesjj_cursos_impartidos(id) on delete cascade,
  tipo text not null default 'planificacion' check (tipo in ('planificacion','calendario','otro')),
  titulo text not null,
  descripcion text,
  archivo_path text,
  archivo_nombre text,
  archivo_mime text,
  url_externa text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEMANAS DEL CURSO
-- ============================================================
create table if not exists public.gestionesjj_curso_semanas (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  curso_id uuid not null references public.gestionesjj_cursos_impartidos(id) on delete cascade,
  numero integer not null,
  titulo text,
  fecha date,
  tipo_sesion text not null default 'normal' check (tipo_sesion in ('normal','examen_parcial','examen_final')),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (curso_id, numero)
);

-- ============================================================
-- ESTUDIANTES DEL CURSO
-- ============================================================
create table if not exists public.gestionesjj_curso_estudiantes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  curso_id uuid not null references public.gestionesjj_cursos_impartidos(id) on delete cascade,
  nombre text not null,
  correo text,
  carne text,
  estado text not null default 'activo' check (estado in ('activo','retirado')),
  asignado_en timestamptz not null default now(),
  retirado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- HISTORIAL DE MOVIMIENTOS DE ESTUDIANTES (asignacion/retiro/reincorporacion)
-- ============================================================
create table if not exists public.gestionesjj_curso_estudiante_eventos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  curso_id uuid not null references public.gestionesjj_cursos_impartidos(id) on delete cascade,
  estudiante_id uuid not null references public.gestionesjj_curso_estudiantes(id) on delete cascade,
  tipo text not null check (tipo in ('asignacion','retiro','reincorporacion')),
  nota text,
  ocurrido_en timestamptz not null default now()
);

-- ============================================================
-- CONTENIDOS Y MATERIALES EXTRA DE CADA SEMANA
-- ============================================================
create table if not exists public.gestionesjj_curso_contenidos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  semana_id uuid not null references public.gestionesjj_curso_semanas(id) on delete cascade,
  categoria text not null default 'contenido' check (categoria in ('contenido','material_extra')),
  titulo text not null,
  descripcion text,
  archivo_path text,
  archivo_nombre text,
  archivo_mime text,
  url_externa text,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TAREAS Y ACTIVIDADES DE CADA SEMANA
-- ============================================================
create table if not exists public.gestionesjj_curso_actividades (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  semana_id uuid not null references public.gestionesjj_curso_semanas(id) on delete cascade,
  tipo text not null default 'tarea' check (tipo in ('tarea','actividad','examen_parcial','examen_final')),
  titulo text not null,
  descripcion text,
  punteo numeric(6,2),
  entrega_proxima_semana boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CALIFICACIONES DE ACTIVIDADES POR ESTUDIANTE
-- ============================================================
create table if not exists public.gestionesjj_curso_calificaciones (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  actividad_id uuid not null references public.gestionesjj_curso_actividades(id) on delete cascade,
  estudiante_id uuid not null references public.gestionesjj_curso_estudiantes(id) on delete cascade,
  entregado boolean not null default false,
  nota numeric(6,2),
  comentario text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actividad_id, estudiante_id)
);

-- ============================================================
-- ASISTENCIA POR SEMANA Y ESTUDIANTE
-- ============================================================
create table if not exists public.gestionesjj_curso_asistencias (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  semana_id uuid not null references public.gestionesjj_curso_semanas(id) on delete cascade,
  estudiante_id uuid not null references public.gestionesjj_curso_estudiantes(id) on delete cascade,
  estado text not null default 'sin_marcar' check (estado in ('sin_marcar','presente','ausente','excusa','tarde')),
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (semana_id, estudiante_id)
);

-- ============================================================
-- INDICES (uno por cada llave foranea)
-- ============================================================
create index if not exists gestionesjj_cursos_impartidos_universidad_idx on public.gestionesjj_cursos_impartidos (universidad_id);
create index if not exists gestionesjj_cursos_impartidos_origen_idx on public.gestionesjj_cursos_impartidos (origen_curso_id);
create index if not exists gestionesjj_curso_planificaciones_curso_idx on public.gestionesjj_curso_planificaciones (curso_id);
create index if not exists gestionesjj_curso_semanas_curso_idx on public.gestionesjj_curso_semanas (curso_id);
create index if not exists gestionesjj_curso_estudiantes_curso_idx on public.gestionesjj_curso_estudiantes (curso_id);
create index if not exists gestionesjj_curso_estudiante_eventos_curso_idx on public.gestionesjj_curso_estudiante_eventos (curso_id);
create index if not exists gestionesjj_curso_estudiante_eventos_estudiante_idx on public.gestionesjj_curso_estudiante_eventos (estudiante_id);
create index if not exists gestionesjj_curso_contenidos_semana_idx on public.gestionesjj_curso_contenidos (semana_id);
create index if not exists gestionesjj_curso_actividades_semana_idx on public.gestionesjj_curso_actividades (semana_id);
create index if not exists gestionesjj_curso_calificaciones_actividad_idx on public.gestionesjj_curso_calificaciones (actividad_id);
create index if not exists gestionesjj_curso_calificaciones_estudiante_idx on public.gestionesjj_curso_calificaciones (estudiante_id);
create index if not exists gestionesjj_curso_asistencias_semana_idx on public.gestionesjj_curso_asistencias (semana_id);
create index if not exists gestionesjj_curso_asistencias_estudiante_idx on public.gestionesjj_curso_asistencias (estudiante_id);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_universidades enable row level security;
alter table public.gestionesjj_cursos_impartidos enable row level security;
alter table public.gestionesjj_curso_planificaciones enable row level security;
alter table public.gestionesjj_curso_semanas enable row level security;
alter table public.gestionesjj_curso_estudiantes enable row level security;
alter table public.gestionesjj_curso_estudiante_eventos enable row level security;
alter table public.gestionesjj_curso_contenidos enable row level security;
alter table public.gestionesjj_curso_actividades enable row level security;
alter table public.gestionesjj_curso_calificaciones enable row level security;
alter table public.gestionesjj_curso_asistencias enable row level security;

revoke all on public.gestionesjj_universidades from anon;
revoke all on public.gestionesjj_cursos_impartidos from anon;
revoke all on public.gestionesjj_curso_planificaciones from anon;
revoke all on public.gestionesjj_curso_semanas from anon;
revoke all on public.gestionesjj_curso_estudiantes from anon;
revoke all on public.gestionesjj_curso_estudiante_eventos from anon;
revoke all on public.gestionesjj_curso_contenidos from anon;
revoke all on public.gestionesjj_curso_actividades from anon;
revoke all on public.gestionesjj_curso_calificaciones from anon;
revoke all on public.gestionesjj_curso_asistencias from anon;

grant select, insert, update, delete on public.gestionesjj_universidades to authenticated;
grant select, insert, update, delete on public.gestionesjj_cursos_impartidos to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_planificaciones to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_semanas to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_estudiantes to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_estudiante_eventos to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_contenidos to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_actividades to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_calificaciones to authenticated;
grant select, insert, update, delete on public.gestionesjj_curso_asistencias to authenticated;

drop policy if exists "universidades_select_owner" on public.gestionesjj_universidades;
drop policy if exists "universidades_insert_owner" on public.gestionesjj_universidades;
drop policy if exists "universidades_update_owner" on public.gestionesjj_universidades;
drop policy if exists "universidades_delete_owner" on public.gestionesjj_universidades;
create policy "universidades_select_owner" on public.gestionesjj_universidades for select to authenticated using (public.gestionesjj_is_owner());
create policy "universidades_insert_owner" on public.gestionesjj_universidades for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "universidades_update_owner" on public.gestionesjj_universidades for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "universidades_delete_owner" on public.gestionesjj_universidades for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "cursos_impartidos_select_owner" on public.gestionesjj_cursos_impartidos;
drop policy if exists "cursos_impartidos_insert_owner" on public.gestionesjj_cursos_impartidos;
drop policy if exists "cursos_impartidos_update_owner" on public.gestionesjj_cursos_impartidos;
drop policy if exists "cursos_impartidos_delete_owner" on public.gestionesjj_cursos_impartidos;
create policy "cursos_impartidos_select_owner" on public.gestionesjj_cursos_impartidos for select to authenticated using (public.gestionesjj_is_owner());
create policy "cursos_impartidos_insert_owner" on public.gestionesjj_cursos_impartidos for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "cursos_impartidos_update_owner" on public.gestionesjj_cursos_impartidos for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "cursos_impartidos_delete_owner" on public.gestionesjj_cursos_impartidos for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_planificaciones_select_owner" on public.gestionesjj_curso_planificaciones;
drop policy if exists "curso_planificaciones_insert_owner" on public.gestionesjj_curso_planificaciones;
drop policy if exists "curso_planificaciones_update_owner" on public.gestionesjj_curso_planificaciones;
drop policy if exists "curso_planificaciones_delete_owner" on public.gestionesjj_curso_planificaciones;
create policy "curso_planificaciones_select_owner" on public.gestionesjj_curso_planificaciones for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_planificaciones_insert_owner" on public.gestionesjj_curso_planificaciones for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_planificaciones_update_owner" on public.gestionesjj_curso_planificaciones for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_planificaciones_delete_owner" on public.gestionesjj_curso_planificaciones for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_semanas_select_owner" on public.gestionesjj_curso_semanas;
drop policy if exists "curso_semanas_insert_owner" on public.gestionesjj_curso_semanas;
drop policy if exists "curso_semanas_update_owner" on public.gestionesjj_curso_semanas;
drop policy if exists "curso_semanas_delete_owner" on public.gestionesjj_curso_semanas;
create policy "curso_semanas_select_owner" on public.gestionesjj_curso_semanas for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_semanas_insert_owner" on public.gestionesjj_curso_semanas for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_semanas_update_owner" on public.gestionesjj_curso_semanas for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_semanas_delete_owner" on public.gestionesjj_curso_semanas for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_estudiantes_select_owner" on public.gestionesjj_curso_estudiantes;
drop policy if exists "curso_estudiantes_insert_owner" on public.gestionesjj_curso_estudiantes;
drop policy if exists "curso_estudiantes_update_owner" on public.gestionesjj_curso_estudiantes;
drop policy if exists "curso_estudiantes_delete_owner" on public.gestionesjj_curso_estudiantes;
create policy "curso_estudiantes_select_owner" on public.gestionesjj_curso_estudiantes for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_estudiantes_insert_owner" on public.gestionesjj_curso_estudiantes for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_estudiantes_update_owner" on public.gestionesjj_curso_estudiantes for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_estudiantes_delete_owner" on public.gestionesjj_curso_estudiantes for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_estudiante_eventos_select_owner" on public.gestionesjj_curso_estudiante_eventos;
drop policy if exists "curso_estudiante_eventos_insert_owner" on public.gestionesjj_curso_estudiante_eventos;
drop policy if exists "curso_estudiante_eventos_update_owner" on public.gestionesjj_curso_estudiante_eventos;
drop policy if exists "curso_estudiante_eventos_delete_owner" on public.gestionesjj_curso_estudiante_eventos;
create policy "curso_estudiante_eventos_select_owner" on public.gestionesjj_curso_estudiante_eventos for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_estudiante_eventos_insert_owner" on public.gestionesjj_curso_estudiante_eventos for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_estudiante_eventos_update_owner" on public.gestionesjj_curso_estudiante_eventos for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_estudiante_eventos_delete_owner" on public.gestionesjj_curso_estudiante_eventos for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_contenidos_select_owner" on public.gestionesjj_curso_contenidos;
drop policy if exists "curso_contenidos_insert_owner" on public.gestionesjj_curso_contenidos;
drop policy if exists "curso_contenidos_update_owner" on public.gestionesjj_curso_contenidos;
drop policy if exists "curso_contenidos_delete_owner" on public.gestionesjj_curso_contenidos;
create policy "curso_contenidos_select_owner" on public.gestionesjj_curso_contenidos for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_contenidos_insert_owner" on public.gestionesjj_curso_contenidos for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_contenidos_update_owner" on public.gestionesjj_curso_contenidos for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_contenidos_delete_owner" on public.gestionesjj_curso_contenidos for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_actividades_select_owner" on public.gestionesjj_curso_actividades;
drop policy if exists "curso_actividades_insert_owner" on public.gestionesjj_curso_actividades;
drop policy if exists "curso_actividades_update_owner" on public.gestionesjj_curso_actividades;
drop policy if exists "curso_actividades_delete_owner" on public.gestionesjj_curso_actividades;
create policy "curso_actividades_select_owner" on public.gestionesjj_curso_actividades for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_actividades_insert_owner" on public.gestionesjj_curso_actividades for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_actividades_update_owner" on public.gestionesjj_curso_actividades for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_actividades_delete_owner" on public.gestionesjj_curso_actividades for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_calificaciones_select_owner" on public.gestionesjj_curso_calificaciones;
drop policy if exists "curso_calificaciones_insert_owner" on public.gestionesjj_curso_calificaciones;
drop policy if exists "curso_calificaciones_update_owner" on public.gestionesjj_curso_calificaciones;
drop policy if exists "curso_calificaciones_delete_owner" on public.gestionesjj_curso_calificaciones;
create policy "curso_calificaciones_select_owner" on public.gestionesjj_curso_calificaciones for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_calificaciones_insert_owner" on public.gestionesjj_curso_calificaciones for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_calificaciones_update_owner" on public.gestionesjj_curso_calificaciones for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_calificaciones_delete_owner" on public.gestionesjj_curso_calificaciones for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "curso_asistencias_select_owner" on public.gestionesjj_curso_asistencias;
drop policy if exists "curso_asistencias_insert_owner" on public.gestionesjj_curso_asistencias;
drop policy if exists "curso_asistencias_update_owner" on public.gestionesjj_curso_asistencias;
drop policy if exists "curso_asistencias_delete_owner" on public.gestionesjj_curso_asistencias;
create policy "curso_asistencias_select_owner" on public.gestionesjj_curso_asistencias for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_asistencias_insert_owner" on public.gestionesjj_curso_asistencias for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_asistencias_update_owner" on public.gestionesjj_curso_asistencias for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "curso_asistencias_delete_owner" on public.gestionesjj_curso_asistencias for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
drop trigger if exists gestionesjj_universidades_set_updated_at on public.gestionesjj_universidades;
create trigger gestionesjj_universidades_set_updated_at before update on public.gestionesjj_universidades for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_cursos_impartidos_set_updated_at on public.gestionesjj_cursos_impartidos;
create trigger gestionesjj_cursos_impartidos_set_updated_at before update on public.gestionesjj_cursos_impartidos for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_curso_semanas_set_updated_at on public.gestionesjj_curso_semanas;
create trigger gestionesjj_curso_semanas_set_updated_at before update on public.gestionesjj_curso_semanas for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_curso_estudiantes_set_updated_at on public.gestionesjj_curso_estudiantes;
create trigger gestionesjj_curso_estudiantes_set_updated_at before update on public.gestionesjj_curso_estudiantes for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_curso_actividades_set_updated_at on public.gestionesjj_curso_actividades;
create trigger gestionesjj_curso_actividades_set_updated_at before update on public.gestionesjj_curso_actividades for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_curso_calificaciones_set_updated_at on public.gestionesjj_curso_calificaciones;
create trigger gestionesjj_curso_calificaciones_set_updated_at before update on public.gestionesjj_curso_calificaciones for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_curso_asistencias_set_updated_at on public.gestionesjj_curso_asistencias;
create trigger gestionesjj_curso_asistencias_set_updated_at before update on public.gestionesjj_curso_asistencias for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- STORAGE: bucket privado para logos de universidades y archivos de curso
-- ============================================================
insert into storage.buckets (id, name, public)
values ('gestionesjj-cursos', 'gestionesjj-cursos', false)
on conflict (id) do nothing;

drop policy if exists "gestionesjj_cursos_storage_select_owner" on storage.objects;
create policy "gestionesjj_cursos_storage_select_owner"
on storage.objects
for select
to authenticated
using (bucket_id = 'gestionesjj-cursos' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_cursos_storage_insert_owner" on storage.objects;
create policy "gestionesjj_cursos_storage_insert_owner"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'gestionesjj-cursos' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_cursos_storage_update_owner" on storage.objects;
create policy "gestionesjj_cursos_storage_update_owner"
on storage.objects
for update
to authenticated
using (bucket_id = 'gestionesjj-cursos' and public.gestionesjj_is_owner())
with check (bucket_id = 'gestionesjj-cursos' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_cursos_storage_delete_owner" on storage.objects;
create policy "gestionesjj_cursos_storage_delete_owner"
on storage.objects
for delete
to authenticated
using (bucket_id = 'gestionesjj-cursos' and public.gestionesjj_is_owner());
