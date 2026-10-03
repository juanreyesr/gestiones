-- Control de revision de evaluaciones de docentes (Coordinacion → "Control de
-- revisión"). Reproduce el formato institucional "Control revisión evaluaciones
-- de docentes": por trimestre y tipo de evaluacion (parcial o final) se lista
-- cada curso del periodo con su docente y se sigue la entrega, la revision, la
-- retroalimentacion, la version corregida y la aprobacion final.
--
-- - gestionesjj_control_revision_periodos: la fecha limite de entrega, que se
--   pide al abrir el periodo por primera vez y se aplica a todas sus filas.
-- - gestionesjj_control_revision_filas: el estado de cada curso. Los datos
--   descriptivos (carrera, curso, docente, correo) se leen en vivo de los
--   cursos; aqui solo se guarda lo que se llena a mano.
--
-- Solo agrega objetos nuevos con prefijo gestionesjj_.

create table if not exists public.gestionesjj_control_revision_periodos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio integer not null check (anio between 2000 and 2100),
  trimestre smallint not null check (trimestre between 1 and 3),
  tipo text not null check (tipo in ('parcial', 'final')),
  fecha_limite date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, anio, trimestre, tipo)
);

create table if not exists public.gestionesjj_control_revision_filas (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio integer not null check (anio between 2000 and 2100),
  trimestre smallint not null check (trimestre between 1 and 3),
  tipo text not null check (tipo in ('parcial', 'final')),
  curso_id uuid not null references public.gestionesjj_cursos(id) on delete cascade,
  campus text,
  fecha_recepcion date,
  estado_entrega text not null default 'Pendiente' check (estado_entrega in ('Pendiente', 'Entregado')),
  revisor text,
  fecha_revision date,
  estatus_revision text check (estatus_revision in ('En proceso', 'Revisado')),
  retro_enviada text check (retro_enviada in ('En proceso', 'Enviada')),
  fecha_retro date,
  version_corregida text check (version_corregida in ('Pendiente', 'Recibida')),
  fecha_version_corregida date,
  version_final_aprobada text check (version_final_aprobada in ('No', 'Sí')),
  fecha_aprobacion date,
  formato_oficial text check (formato_oficial in ('Sí', 'No')),
  contenidos_semana6 text check (contenidos_semana6 in ('En revisión', 'Sí', 'No')),
  punteo_100 text check (punteo_100 in ('Sí', 'No')),
  instrucciones_claras text check (instrucciones_claras in ('En revisión', 'Sí', 'No')),
  aplicacion_caso text check (aplicacion_caso in ('En revisión', 'Sí', 'No')),
  rubrica text check (rubrica in ('En revisión', 'OK', 'No aplica')),
  observaciones text check (observaciones is null or length(observaciones) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, anio, trimestre, tipo, curso_id)
);

create index if not exists gestionesjj_control_revision_filas_curso_idx
  on public.gestionesjj_control_revision_filas (curso_id);

alter table public.gestionesjj_control_revision_periodos enable row level security;
alter table public.gestionesjj_control_revision_filas enable row level security;
revoke all on public.gestionesjj_control_revision_periodos from anon;
revoke all on public.gestionesjj_control_revision_filas from anon;
grant select, insert, update, delete on public.gestionesjj_control_revision_periodos to authenticated;
grant select, insert, update, delete on public.gestionesjj_control_revision_filas to authenticated;

drop policy if exists "control_revision_periodos_select_owner" on public.gestionesjj_control_revision_periodos;
create policy "control_revision_periodos_select_owner" on public.gestionesjj_control_revision_periodos
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "control_revision_periodos_insert_owner" on public.gestionesjj_control_revision_periodos;
create policy "control_revision_periodos_insert_owner" on public.gestionesjj_control_revision_periodos
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "control_revision_periodos_update_owner" on public.gestionesjj_control_revision_periodos;
create policy "control_revision_periodos_update_owner" on public.gestionesjj_control_revision_periodos
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "control_revision_periodos_delete_owner" on public.gestionesjj_control_revision_periodos;
create policy "control_revision_periodos_delete_owner" on public.gestionesjj_control_revision_periodos
  for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "control_revision_filas_select_owner" on public.gestionesjj_control_revision_filas;
create policy "control_revision_filas_select_owner" on public.gestionesjj_control_revision_filas
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "control_revision_filas_insert_owner" on public.gestionesjj_control_revision_filas;
create policy "control_revision_filas_insert_owner" on public.gestionesjj_control_revision_filas
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "control_revision_filas_update_owner" on public.gestionesjj_control_revision_filas;
create policy "control_revision_filas_update_owner" on public.gestionesjj_control_revision_filas
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "control_revision_filas_delete_owner" on public.gestionesjj_control_revision_filas;
create policy "control_revision_filas_delete_owner" on public.gestionesjj_control_revision_filas
  for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_control_revision_periodos_set_updated_at on public.gestionesjj_control_revision_periodos;
create trigger gestionesjj_control_revision_periodos_set_updated_at
  before update on public.gestionesjj_control_revision_periodos
  for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_control_revision_filas_set_updated_at on public.gestionesjj_control_revision_filas;
create trigger gestionesjj_control_revision_filas_set_updated_at
  before update on public.gestionesjj_control_revision_filas
  for each row execute function public.gestionesjj_set_updated_at();
