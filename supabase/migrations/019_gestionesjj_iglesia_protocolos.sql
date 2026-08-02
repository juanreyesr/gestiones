-- Protocolos para actividades (area Iglesia): el paso a paso de cada actividad
-- del ministerio (un bautizo, una boda, la santa cena, una vigilia...), escrito
-- con formato basico y pensado para leerse en pantalla completa durante la
-- actividad.
--
-- El contenido se guarda como HTML limitado: negrita, cursiva, subrayado,
-- tamano, color, vinetas y numeracion. La lista blanca de etiquetas y estilos
-- vive en src/lib/iglesia/html-seguro.ts, que limpia el HTML tanto al guardar
-- como al mostrarlo.
--
-- Seguridad: mismo patron del resto (RLS owner-lock, sin acceso anonimo).

create table if not exists public.gestionesjj_iglesia_protocolos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 2 and 200),
  contenido text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gestionesjj_iglesia_protocolos_titulo_idx
  on public.gestionesjj_iglesia_protocolos (lower(titulo));

alter table public.gestionesjj_iglesia_protocolos enable row level security;

revoke all on public.gestionesjj_iglesia_protocolos from anon;
grant select, insert, update, delete on public.gestionesjj_iglesia_protocolos to authenticated;

drop policy if exists "gestionesjj_iglesia_protocolos_select_owner" on public.gestionesjj_iglesia_protocolos;
drop policy if exists "gestionesjj_iglesia_protocolos_insert_owner" on public.gestionesjj_iglesia_protocolos;
drop policy if exists "gestionesjj_iglesia_protocolos_update_owner" on public.gestionesjj_iglesia_protocolos;
drop policy if exists "gestionesjj_iglesia_protocolos_delete_owner" on public.gestionesjj_iglesia_protocolos;

create policy "gestionesjj_iglesia_protocolos_select_owner" on public.gestionesjj_iglesia_protocolos
  for select to authenticated using (public.gestionesjj_is_owner());
create policy "gestionesjj_iglesia_protocolos_insert_owner" on public.gestionesjj_iglesia_protocolos
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "gestionesjj_iglesia_protocolos_update_owner" on public.gestionesjj_iglesia_protocolos
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "gestionesjj_iglesia_protocolos_delete_owner" on public.gestionesjj_iglesia_protocolos
  for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_iglesia_protocolos_set_updated_at on public.gestionesjj_iglesia_protocolos;
create trigger gestionesjj_iglesia_protocolos_set_updated_at before update on public.gestionesjj_iglesia_protocolos
  for each row execute function public.gestionesjj_set_updated_at();
