create table if not exists public.evaluaciones_docentes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  docente_nombre text not null,
  docente_correo text,
  curso_nombre text not null,
  curso_grupo text,
  anio integer not null check (anio between 2020 and 2100),
  trimestre integer not null check (trimestre between 1 and 4),
  fecha_observacion date not null,
  puntaje_total integer not null check (puntaje_total >= 0),
  puntaje_maximo integer not null check (puntaje_maximo > 0),
  porcentaje integer not null check (porcentaje between 0 and 100),
  scores jsonb not null,
  observaciones text,
  entrevista_estudiante_1 text,
  entrevista_estudiante_2 text,
  fortaleza_1 text,
  fortaleza_2 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evaluaciones_docentes_periodo_idx
  on public.evaluaciones_docentes (anio, trimestre, docente_nombre);

create index if not exists evaluaciones_docentes_created_by_idx
  on public.evaluaciones_docentes (created_by);

alter table public.evaluaciones_docentes enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.evaluaciones_docentes to authenticated;

drop policy if exists "evaluaciones_select_own" on public.evaluaciones_docentes;
create policy "evaluaciones_select_own"
on public.evaluaciones_docentes
for select
to authenticated
using ((select auth.uid()) = created_by);

drop policy if exists "evaluaciones_insert_own" on public.evaluaciones_docentes;
create policy "evaluaciones_insert_own"
on public.evaluaciones_docentes
for insert
to authenticated
with check ((select auth.uid()) = created_by);

drop policy if exists "evaluaciones_update_own" on public.evaluaciones_docentes;
create policy "evaluaciones_update_own"
on public.evaluaciones_docentes
for update
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

drop policy if exists "evaluaciones_delete_own" on public.evaluaciones_docentes;
create policy "evaluaciones_delete_own"
on public.evaluaciones_docentes
for delete
to authenticated
using ((select auth.uid()) = created_by);

create or replace function public.gestionesjj_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists evaluaciones_docentes_set_updated_at on public.evaluaciones_docentes;

create trigger evaluaciones_docentes_set_updated_at
before update on public.evaluaciones_docentes
for each row
execute function public.gestionesjj_set_updated_at();
