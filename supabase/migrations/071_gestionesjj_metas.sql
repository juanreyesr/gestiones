-- Seguimiento de metas terapéuticas.
--
-- gestionesjj_metas: metas del paciente (manuales, de la ficha 1.1 o propuestas por la IA)
-- con indicador, plazo y estado. gestionesjj_meta_avances: puntuación de avance de 0 a 10
-- por sesión (o por fecha, si se registra fuera de sesión), con una nota breve.
-- RLS owner-only, igual que el resto del expediente.

create table if not exists public.gestionesjj_metas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meta text not null check (length(btrim(meta)) between 1 and 300),
  indicador text check (indicador is null or length(indicador) <= 300),
  plazo text check (plazo is null or length(plazo) <= 100),
  estado text not null default 'activa' check (estado in ('activa', 'lograda', 'pausada', 'descartada')),
  origen text not null default 'manual' check (origen in ('manual', 'ia', 'ficha')),
  orden integer not null default 0,
  estado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gestionesjj_metas_paciente_idx on public.gestionesjj_metas (paciente_id, orden);

create table if not exists public.gestionesjj_meta_avances (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid not null references public.gestionesjj_metas(id) on delete cascade,
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  sesion_id uuid references public.gestionesjj_sesiones(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  puntuacion smallint not null check (puntuacion between 0 and 10),
  nota text check (nota is null or length(nota) <= 500),
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_meta_avances_meta_idx on public.gestionesjj_meta_avances (meta_id, fecha);
create index if not exists gestionesjj_meta_avances_paciente_idx on public.gestionesjj_meta_avances (paciente_id);
-- Una sola puntuación por meta y sesión (se actualiza si se vuelve a registrar).
create unique index if not exists gestionesjj_meta_avances_meta_sesion_uq
  on public.gestionesjj_meta_avances (meta_id, sesion_id) where sesion_id is not null;

alter table public.gestionesjj_metas enable row level security;
alter table public.gestionesjj_meta_avances enable row level security;
revoke all on public.gestionesjj_metas from anon;
revoke all on public.gestionesjj_metas from authenticated;
revoke all on public.gestionesjj_meta_avances from anon;
revoke all on public.gestionesjj_meta_avances from authenticated;
grant select, insert, update, delete on public.gestionesjj_metas to authenticated;
grant select, insert, update, delete on public.gestionesjj_meta_avances to authenticated;

drop policy if exists "metas_select_owner" on public.gestionesjj_metas;
create policy "metas_select_owner" on public.gestionesjj_metas
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "metas_insert_owner" on public.gestionesjj_metas;
create policy "metas_insert_owner" on public.gestionesjj_metas
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "metas_update_owner" on public.gestionesjj_metas;
create policy "metas_update_owner" on public.gestionesjj_metas
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "metas_delete_owner" on public.gestionesjj_metas;
create policy "metas_delete_owner" on public.gestionesjj_metas
  for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "meta_avances_select_owner" on public.gestionesjj_meta_avances;
create policy "meta_avances_select_owner" on public.gestionesjj_meta_avances
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "meta_avances_insert_owner" on public.gestionesjj_meta_avances;
create policy "meta_avances_insert_owner" on public.gestionesjj_meta_avances
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "meta_avances_update_owner" on public.gestionesjj_meta_avances;
create policy "meta_avances_update_owner" on public.gestionesjj_meta_avances
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "meta_avances_delete_owner" on public.gestionesjj_meta_avances;
create policy "meta_avances_delete_owner" on public.gestionesjj_meta_avances
  for delete to authenticated using (public.gestionesjj_is_owner());
