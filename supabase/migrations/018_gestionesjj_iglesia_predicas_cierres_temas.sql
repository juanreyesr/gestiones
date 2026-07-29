-- Segunda vuelta de Predicas del mes:
--
--   1. INVITADOS: quien predica (o cierra) puede ser alguien de fuera. Su
--      nombre se escribe suelto en la asignacion y NO entra al catalogo,
--      porque es solo de ese dia.
--   2. PERSONAS DE CIERRE: catalogo propio, separado del de predicadores. Se
--      precarga con los predicadores actuales, pero desde ahi se agrega y se
--      quita gente sin tocar el otro listado.
--   3. TEMAS POR ANIO: el tema de cada mes se define una vez al anio y queda
--      precargado al crear el mes.
--
-- Ademas se limpia el cierre fijo "Pastores de celebracion": cuando no hay
-- persona asignada, el documento exportado dice "No asignado" (que es
-- justamente cuando cierra el pastor de la celebracion).

-- ============================================================
-- 1. INVITADOS
-- ============================================================
alter table public.gestionesjj_iglesia_predicas_asignaciones
  add column if not exists predicador_texto text;

comment on column public.gestionesjj_iglesia_predicas_asignaciones.predicador_texto is
  'Nombre de un predicador invitado, que no se guarda en el catalogo.';

-- ============================================================
-- 2. CATALOGO DE PERSONAS DE CIERRE
-- ============================================================
create table if not exists public.gestionesjj_iglesia_cierres_personas (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 2 and 120),
  telefono text,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gestionesjj_iglesia_cierres_personas_nombre_idx
  on public.gestionesjj_iglesia_cierres_personas (lower(trim(nombre)));

-- Precarga: los predicadores que ya existen entran tambien como personas de
-- cierre. A partir de aqui los dos listados viven por separado.
insert into public.gestionesjj_iglesia_cierres_personas (created_by, nombre, telefono, activo)
select created_by, nombre, telefono, activo
from public.gestionesjj_iglesia_predicadores
on conflict do nothing;

alter table public.gestionesjj_iglesia_predicas_asignaciones
  add column if not exists cierre_persona_id uuid references public.gestionesjj_iglesia_cierres_personas(id) on delete set null;

-- Los cierres ya asignados apuntaban al catalogo de predicadores; se pasan al
-- catalogo nuevo emparejando por nombre.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gestionesjj_iglesia_predicas_asignaciones'
      and column_name = 'cierre_predicador_id'
  ) then
    execute $migracion$
      update public.gestionesjj_iglesia_predicas_asignaciones a
      set cierre_persona_id = c.id
      from public.gestionesjj_iglesia_predicadores p
      join public.gestionesjj_iglesia_cierres_personas c
        on lower(trim(c.nombre)) = lower(trim(p.nombre))
      where a.cierre_predicador_id = p.id and a.cierre_persona_id is null
    $migracion$;

    execute 'alter table public.gestionesjj_iglesia_predicas_asignaciones drop column cierre_predicador_id';
  end if;
end;
$$;

-- El cierre fijo deja de existir: sin persona asignada el documento dice
-- "No asignado".
update public.gestionesjj_iglesia_predicas_asignaciones
set cierre_texto = null
where cierre_texto = 'Pastores de celebración';

create index if not exists gestionesjj_iglesia_predicas_asignaciones_cierre_persona_idx
  on public.gestionesjj_iglesia_predicas_asignaciones (cierre_persona_id);

-- ============================================================
-- 3. TEMAS POR ANIO
-- ============================================================
create table if not exists public.gestionesjj_iglesia_temas_anio (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio integer not null check (anio between 2000 and 2100),
  mes smallint not null check (mes between 1 and 12),
  tema text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anio, mes)
);

create index if not exists gestionesjj_iglesia_temas_anio_idx
  on public.gestionesjj_iglesia_temas_anio (anio desc, mes);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_iglesia_cierres_personas enable row level security;
alter table public.gestionesjj_iglesia_temas_anio enable row level security;

revoke all on public.gestionesjj_iglesia_cierres_personas from anon;
revoke all on public.gestionesjj_iglesia_temas_anio from anon;

grant select, insert, update, delete on public.gestionesjj_iglesia_cierres_personas to authenticated;
grant select, insert, update, delete on public.gestionesjj_iglesia_temas_anio to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'gestionesjj_iglesia_cierres_personas',
    'gestionesjj_iglesia_temas_anio'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_owner', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_owner', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_owner', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_owner', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.gestionesjj_is_owner())',
      t || '_select_owner', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by)',
      t || '_insert_owner', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by)',
      t || '_update_owner', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.gestionesjj_is_owner())',
      t || '_delete_owner', t);
  end loop;
end;
$$;

drop trigger if exists gestionesjj_iglesia_cierres_personas_set_updated_at on public.gestionesjj_iglesia_cierres_personas;
create trigger gestionesjj_iglesia_cierres_personas_set_updated_at before update on public.gestionesjj_iglesia_cierres_personas
  for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_iglesia_temas_anio_set_updated_at on public.gestionesjj_iglesia_temas_anio;
create trigger gestionesjj_iglesia_temas_anio_set_updated_at before update on public.gestionesjj_iglesia_temas_anio
  for each row execute function public.gestionesjj_set_updated_at();
