create table if not exists public.gestionesjj_docentes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  correo text,
  femenino boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gestionesjj_cursos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  docente_id uuid not null references public.gestionesjj_docentes(id) on delete cascade,
  nombre text not null,
  horario text,
  grupo text,
  edificio text,
  anio integer not null check (anio between 2020 and 2100),
  trimestre integer not null check (trimestre between 1 and 3),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gestionesjj_cursos_docente_idx on public.gestionesjj_cursos (docente_id);
create index if not exists gestionesjj_docentes_created_by_idx on public.gestionesjj_docentes (created_by);
create index if not exists gestionesjj_cursos_created_by_idx on public.gestionesjj_cursos (created_by);

alter table public.gestionesjj_docentes enable row level security;
alter table public.gestionesjj_cursos enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.gestionesjj_docentes to authenticated;
grant select, insert, update, delete on public.gestionesjj_cursos to authenticated;

create policy "docentes_select_owner" on public.gestionesjj_docentes for select to authenticated using (public.gestionesjj_is_owner());
create policy "docentes_insert_owner" on public.gestionesjj_docentes for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "docentes_update_owner" on public.gestionesjj_docentes for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "docentes_delete_owner" on public.gestionesjj_docentes for delete to authenticated using (public.gestionesjj_is_owner());

create policy "cursos_select_owner" on public.gestionesjj_cursos for select to authenticated using (public.gestionesjj_is_owner());
create policy "cursos_insert_owner" on public.gestionesjj_cursos for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "cursos_update_owner" on public.gestionesjj_cursos for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "cursos_delete_owner" on public.gestionesjj_cursos for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_docentes_set_updated_at on public.gestionesjj_docentes;
create trigger gestionesjj_docentes_set_updated_at before update on public.gestionesjj_docentes for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_cursos_set_updated_at on public.gestionesjj_cursos;
create trigger gestionesjj_cursos_set_updated_at before update on public.gestionesjj_cursos for each row execute function public.gestionesjj_set_updated_at();
