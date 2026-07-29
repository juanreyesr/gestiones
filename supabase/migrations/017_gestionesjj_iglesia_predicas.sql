-- Predicas del mes (area Iglesia). Cada mes se arma un calendario con quien
-- predica y quien cierra en cada celebracion:
--
--   Domingos -> tres celebraciones: 07:30, 09:30 y 11:30
--   Martes   -> una celebracion: 19:00
--
-- Diseno: el calendario del mes se materializa como una fila por celebracion
-- (mes + fecha + horario, con indice unico), en vez de guardarse como un jsonb.
-- Asi la advertencia de "este predicador ya predico en ese mismo horario este
-- mes" y el contador de veces asignado son un simple GROUP BY, y el mes se
-- puede editar celda por celda con un update puntual.
--
-- El cierre puede ser una persona del catalogo (cierre_predicador_id) o un
-- texto fijo (cierre_texto), porque en las celebraciones de 09:30 y 11:30 el
-- cierre no es una persona sino "Pastores de celebracion".
--
-- Seguridad: mismo patron del resto (RLS owner-lock, sin acceso anonimo).

-- ============================================================
-- CATALOGO DE PREDICADORES
-- ============================================================
create table if not exists public.gestionesjj_iglesia_predicadores (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 2 and 120),
  telefono text,
  notas text,
  -- "Inactivar" en vez de borrar: deja de aparecer al asignar pero conserva su
  -- historial en los meses ya publicados.
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sin nombres repetidos (ignorando mayusculas y espacios de los extremos).
create unique index if not exists gestionesjj_iglesia_predicadores_nombre_idx
  on public.gestionesjj_iglesia_predicadores (lower(trim(nombre)));

-- ============================================================
-- MES (tema, instrucciones y notas del calendario)
-- ============================================================
create table if not exists public.gestionesjj_iglesia_predicas_meses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio integer not null check (anio between 2000 and 2100),
  mes smallint not null check (mes between 1 and 12),
  tema text,
  -- Una instruccion por linea; se imprimen al pie del Excel.
  instrucciones text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anio, mes)
);

-- ============================================================
-- ASIGNACIONES (una fila por celebracion del mes)
-- ============================================================
create table if not exists public.gestionesjj_iglesia_predicas_asignaciones (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mes_id uuid not null references public.gestionesjj_iglesia_predicas_meses(id) on delete cascade,
  fecha date not null,
  horario text not null check (horario in ('07:30', '09:30', '11:30', '19:00')),
  -- Si se borra un predicador del catalogo, la celebracion queda sin asignar
  -- en vez de desaparecer: el calendario del mes no se rompe.
  predicador_id uuid references public.gestionesjj_iglesia_predicadores(id) on delete set null,
  cierre_predicador_id uuid references public.gestionesjj_iglesia_predicadores(id) on delete set null,
  cierre_texto text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mes_id, fecha, horario)
);

create index if not exists gestionesjj_iglesia_predicas_asignaciones_mes_idx
  on public.gestionesjj_iglesia_predicas_asignaciones (mes_id, fecha, horario);
create index if not exists gestionesjj_iglesia_predicas_asignaciones_predicador_idx
  on public.gestionesjj_iglesia_predicas_asignaciones (predicador_id);
create index if not exists gestionesjj_iglesia_predicas_asignaciones_cierre_idx
  on public.gestionesjj_iglesia_predicas_asignaciones (cierre_predicador_id);
create index if not exists gestionesjj_iglesia_predicas_meses_periodo_idx
  on public.gestionesjj_iglesia_predicas_meses (anio desc, mes desc);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_iglesia_predicadores enable row level security;
alter table public.gestionesjj_iglesia_predicas_meses enable row level security;
alter table public.gestionesjj_iglesia_predicas_asignaciones enable row level security;

revoke all on public.gestionesjj_iglesia_predicadores from anon;
revoke all on public.gestionesjj_iglesia_predicas_meses from anon;
revoke all on public.gestionesjj_iglesia_predicas_asignaciones from anon;

grant select, insert, update, delete on public.gestionesjj_iglesia_predicadores to authenticated;
grant select, insert, update, delete on public.gestionesjj_iglesia_predicas_meses to authenticated;
grant select, insert, update, delete on public.gestionesjj_iglesia_predicas_asignaciones to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'gestionesjj_iglesia_predicadores',
    'gestionesjj_iglesia_predicas_meses',
    'gestionesjj_iglesia_predicas_asignaciones'
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

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
drop trigger if exists gestionesjj_iglesia_predicadores_set_updated_at on public.gestionesjj_iglesia_predicadores;
create trigger gestionesjj_iglesia_predicadores_set_updated_at before update on public.gestionesjj_iglesia_predicadores
  for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_iglesia_predicas_meses_set_updated_at on public.gestionesjj_iglesia_predicas_meses;
create trigger gestionesjj_iglesia_predicas_meses_set_updated_at before update on public.gestionesjj_iglesia_predicas_meses
  for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_iglesia_predicas_asignaciones_set_updated_at on public.gestionesjj_iglesia_predicas_asignaciones;
create trigger gestionesjj_iglesia_predicas_asignaciones_set_updated_at before update on public.gestionesjj_iglesia_predicas_asignaciones
  for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- La fecha de una asignacion debe caer en el mes al que pertenece, y el
-- horario debe corresponder al dia: 07:30/09:30/11:30 son de domingo y 19:00
-- es de martes. Se valida en la base para que ningun error de la interfaz
-- ensucie el calendario.
-- ============================================================
create or replace function public.gestionesjj_iglesia_predicas_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  periodo record;
  dia integer;
begin
  select anio, mes into periodo
  from public.gestionesjj_iglesia_predicas_meses
  where id = new.mes_id;

  if periodo is null then
    raise exception 'El mes de la asignacion no existe.';
  end if;

  if extract(year from new.fecha) <> periodo.anio or extract(month from new.fecha) <> periodo.mes then
    raise exception 'La fecha % no pertenece al mes %/%.', new.fecha, periodo.mes, periodo.anio;
  end if;

  dia := extract(isodow from new.fecha);
  if new.horario = '19:00' and dia <> 2 then
    raise exception 'La celebracion de las 19:00 es de martes.';
  end if;
  if new.horario <> '19:00' and dia <> 7 then
    raise exception 'Las celebraciones de 07:30, 09:30 y 11:30 son de domingo.';
  end if;

  return new;
end;
$$;

drop trigger if exists gestionesjj_iglesia_predicas_asignaciones_validar on public.gestionesjj_iglesia_predicas_asignaciones;
create trigger gestionesjj_iglesia_predicas_asignaciones_validar
  before insert or update of fecha, horario, mes_id on public.gestionesjj_iglesia_predicas_asignaciones
  for each row execute function public.gestionesjj_iglesia_predicas_validar();
