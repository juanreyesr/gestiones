-- Area Iglesia. Primera fase con dos recursos independientes entre si, para
-- que el area pueda ir creciendo con mas "botones" sin tocar lo ya hecho:
--
--   1. PENDIENTES  -> gestion de tareas y proyectos estilo Monday:
--                     tableros > grupos > items > subitems, con columnas de
--                     estado, prioridad, responsable, fechas y etiquetas, mas
--                     un hilo de actualizaciones por item.
--   2. EVENTOS     -> bodas, matrimonios civiles, cumpleanos, bautizos,
--                     quinceanos, funerales, etc., con sus participantes por
--                     rol (novio, novia, padrinos, testigos, festejado...) y
--                     descarga en Word.
--
-- Diseno: los catalogos (estado, prioridad, tipo de evento, rol) quedan
-- fijados con CHECK para que la base y la UI compartan exactamente los mismos
-- valores (ver src/lib/iglesia/types.ts). El orden de grupos e items se
-- guarda en una columna entera reescrita al arrastrar, no con listas ligadas,
-- porque los tableros son pequenos y asi el render es un simple ORDER BY.
--
-- Seguridad: mismo patron que 002/006/008/013 — RLS owner-lock con
-- gestionesjj_is_owner(), sin grants para anon (nada de este modulo es
-- publico).

-- ============================================================
-- TABLEROS (cada tablero es un "espacio de trabajo": Ministerio de jovenes,
-- Remodelacion del templo, Pendientes personales del mes...)
-- ============================================================
create table if not exists public.gestionesjj_iglesia_tableros (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  descripcion text,
  color text not null default '#0073ea',
  orden integer not null default 0,
  archivado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- GRUPOS (las franjas de colores dentro de un tablero: "Esta semana",
-- "Proximos domingos", "En espera"...)
-- ============================================================
create table if not exists public.gestionesjj_iglesia_grupos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tablero_id uuid not null references public.gestionesjj_iglesia_tableros(id) on delete cascade,
  nombre text not null,
  color text not null default '#00c875',
  orden integer not null default 0,
  colapsado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ITEMS (las tareas). Un item con item_padre_id es un subitem: vive en el
-- mismo grupo que su padre y no se muestra como fila suelta del tablero.
-- ============================================================
create table if not exists public.gestionesjj_iglesia_items (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tablero_id uuid not null references public.gestionesjj_iglesia_tableros(id) on delete cascade,
  grupo_id uuid not null references public.gestionesjj_iglesia_grupos(id) on delete cascade,
  item_padre_id uuid references public.gestionesjj_iglesia_items(id) on delete cascade,
  titulo text not null,
  estado text not null default 'sin_empezar'
    check (estado in ('sin_empezar', 'en_proceso', 'atorado', 'en_revision', 'listo')),
  prioridad text not null default 'sin_definir'
    check (prioridad in ('sin_definir', 'baja', 'media', 'alta', 'critica')),
  responsable text,
  fecha_inicio date,
  fecha_limite date,
  etiquetas text[] not null default '{}',
  notas text,
  orden integer not null default 0,
  completado_en timestamptz,
  -- Un item puede haber nacido de un evento ("Confirmar salon" de una boda).
  -- Si el evento se borra el pendiente sobrevive, solo pierde el vinculo.
  evento_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ACTUALIZACIONES (el hilo de comentarios de cada item, como el panel de
-- "Updates" de Monday)
-- ============================================================
create table if not exists public.gestionesjj_iglesia_actualizaciones (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.gestionesjj_iglesia_items(id) on delete cascade,
  texto text not null check (length(texto) between 1 and 4000),
  created_at timestamptz not null default now()
);

-- ============================================================
-- EVENTOS (bodas, cumpleanos, bautizos, funerales...)
-- ============================================================
create table if not exists public.gestionesjj_iglesia_eventos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null check (tipo in (
    'boda', 'matrimonio_civil', 'aniversario_bodas', 'cumpleanos', 'quinceanos',
    'bautizo', 'presentacion_ninos', 'dedicacion', 'funeral', 'accion_gracias',
    'graduacion', 'otro'
  )),
  titulo text not null,
  fecha date not null,
  hora time,
  lugar text,
  direccion text,
  oficiante text,
  estado text not null default 'planificado'
    check (estado in ('planificado', 'confirmado', 'realizado', 'cancelado')),
  contacto_nombre text,
  contacto_telefono text,
  contacto_correo text,
  asistentes_estimados integer check (asistentes_estimados is null or asistentes_estimados >= 0),
  -- Texto libre con el orden del culto/programa; se imprime tal cual en Word.
  programa text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PARTICIPANTES DEL EVENTO (una fila por persona con su rol, para que el
-- documento de Word se arme igual para cualquier tipo de evento)
-- ============================================================
create table if not exists public.gestionesjj_iglesia_evento_participantes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  evento_id uuid not null references public.gestionesjj_iglesia_eventos(id) on delete cascade,
  rol text not null check (rol in (
    'novio', 'novia', 'contrayente', 'festejado', 'homenajeado', 'bautizado',
    'padre', 'madre', 'padrino', 'madrina', 'testigo', 'familiar', 'oficiante',
    'difunto', 'participante'
  )),
  nombre text not null,
  documento text,
  telefono text,
  notas text,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

-- El vinculo item -> evento se agrega despues de crear la tabla de eventos.
alter table public.gestionesjj_iglesia_items
  drop constraint if exists gestionesjj_iglesia_items_evento_id_fkey;
alter table public.gestionesjj_iglesia_items
  add constraint gestionesjj_iglesia_items_evento_id_fkey
  foreign key (evento_id) references public.gestionesjj_iglesia_eventos(id) on delete set null;

-- ============================================================
-- INDICES
-- ============================================================
create index if not exists gestionesjj_iglesia_grupos_tablero_idx
  on public.gestionesjj_iglesia_grupos (tablero_id, orden);
create index if not exists gestionesjj_iglesia_items_tablero_idx
  on public.gestionesjj_iglesia_items (tablero_id, grupo_id, orden);
create index if not exists gestionesjj_iglesia_items_padre_idx
  on public.gestionesjj_iglesia_items (item_padre_id);
create index if not exists gestionesjj_iglesia_items_fecha_idx
  on public.gestionesjj_iglesia_items (fecha_limite);
create index if not exists gestionesjj_iglesia_actualizaciones_item_idx
  on public.gestionesjj_iglesia_actualizaciones (item_id, created_at desc);
create index if not exists gestionesjj_iglesia_eventos_fecha_idx
  on public.gestionesjj_iglesia_eventos (fecha desc);
create index if not exists gestionesjj_iglesia_evento_participantes_evento_idx
  on public.gestionesjj_iglesia_evento_participantes (evento_id, orden);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_iglesia_tableros enable row level security;
alter table public.gestionesjj_iglesia_grupos enable row level security;
alter table public.gestionesjj_iglesia_items enable row level security;
alter table public.gestionesjj_iglesia_actualizaciones enable row level security;
alter table public.gestionesjj_iglesia_eventos enable row level security;
alter table public.gestionesjj_iglesia_evento_participantes enable row level security;

revoke all on public.gestionesjj_iglesia_tableros from anon;
revoke all on public.gestionesjj_iglesia_grupos from anon;
revoke all on public.gestionesjj_iglesia_items from anon;
revoke all on public.gestionesjj_iglesia_actualizaciones from anon;
revoke all on public.gestionesjj_iglesia_eventos from anon;
revoke all on public.gestionesjj_iglesia_evento_participantes from anon;

grant select, insert, update, delete on public.gestionesjj_iglesia_tableros to authenticated;
grant select, insert, update, delete on public.gestionesjj_iglesia_grupos to authenticated;
grant select, insert, update, delete on public.gestionesjj_iglesia_items to authenticated;
grant select, insert, update, delete on public.gestionesjj_iglesia_actualizaciones to authenticated;
grant select, insert, update, delete on public.gestionesjj_iglesia_eventos to authenticated;
grant select, insert, update, delete on public.gestionesjj_iglesia_evento_participantes to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'gestionesjj_iglesia_tableros',
    'gestionesjj_iglesia_grupos',
    'gestionesjj_iglesia_items',
    'gestionesjj_iglesia_actualizaciones',
    'gestionesjj_iglesia_eventos',
    'gestionesjj_iglesia_evento_participantes'
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
drop trigger if exists gestionesjj_iglesia_tableros_set_updated_at on public.gestionesjj_iglesia_tableros;
create trigger gestionesjj_iglesia_tableros_set_updated_at before update on public.gestionesjj_iglesia_tableros
  for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_iglesia_grupos_set_updated_at on public.gestionesjj_iglesia_grupos;
create trigger gestionesjj_iglesia_grupos_set_updated_at before update on public.gestionesjj_iglesia_grupos
  for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_iglesia_items_set_updated_at on public.gestionesjj_iglesia_items;
create trigger gestionesjj_iglesia_items_set_updated_at before update on public.gestionesjj_iglesia_items
  for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_iglesia_eventos_set_updated_at on public.gestionesjj_iglesia_eventos;
create trigger gestionesjj_iglesia_eventos_set_updated_at before update on public.gestionesjj_iglesia_eventos
  for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- completado_en automatico: al pasar un item a "listo" se sella la fecha, y
-- al sacarlo de "listo" se borra. Asi el tablero puede reportar cuando se
-- termino cada cosa sin depender de que la UI lo recuerde.
-- ============================================================
create or replace function public.gestionesjj_iglesia_items_sellar_completado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'listo' and (tg_op = 'INSERT' or old.estado is distinct from 'listo') then
    new.completado_en := coalesce(new.completado_en, now());
  elsif new.estado <> 'listo' then
    new.completado_en := null;
  end if;
  return new;
end;
$$;

drop trigger if exists gestionesjj_iglesia_items_completado on public.gestionesjj_iglesia_items;
create trigger gestionesjj_iglesia_items_completado
  before insert or update of estado on public.gestionesjj_iglesia_items
  for each row execute function public.gestionesjj_iglesia_items_sellar_completado();

-- ============================================================
-- Un subitem siempre pertenece al mismo tablero y grupo que su padre, y no se
-- permiten subitems de subitems (un solo nivel, como en Monday).
-- ============================================================
create or replace function public.gestionesjj_iglesia_items_validar_padre()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  padre record;
begin
  if new.item_padre_id is null then
    return new;
  end if;

  if new.item_padre_id = new.id then
    raise exception 'Un pendiente no puede ser subtarea de si mismo.';
  end if;

  select * into padre from public.gestionesjj_iglesia_items where id = new.item_padre_id;
  if padre is null then
    raise exception 'El pendiente padre no existe.';
  end if;
  if padre.item_padre_id is not null then
    raise exception 'Solo se permite un nivel de subtareas.';
  end if;

  new.tablero_id := padre.tablero_id;
  new.grupo_id := padre.grupo_id;
  return new;
end;
$$;

drop trigger if exists gestionesjj_iglesia_items_padre on public.gestionesjj_iglesia_items;
create trigger gestionesjj_iglesia_items_padre
  before insert or update of item_padre_id, grupo_id, tablero_id on public.gestionesjj_iglesia_items
  for each row execute function public.gestionesjj_iglesia_items_validar_padre();

-- Cuando un pendiente se arrastra a otro grupo, sus subtareas lo siguen. Se
-- hace en la base y no en la UI para que un subitem nunca quede colgando de un
-- grupo distinto al de su padre: si ese grupo se borrara, el delete en cascada
-- se llevaria subtareas de un pendiente que sigue vivo.
create or replace function public.gestionesjj_iglesia_items_sincronizar_hijos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.item_padre_id is null
     and (new.grupo_id is distinct from old.grupo_id or new.tablero_id is distinct from old.tablero_id) then
    update public.gestionesjj_iglesia_items
    set grupo_id = new.grupo_id, tablero_id = new.tablero_id
    where item_padre_id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists gestionesjj_iglesia_items_hijos on public.gestionesjj_iglesia_items;
create trigger gestionesjj_iglesia_items_hijos
  after update of grupo_id, tablero_id on public.gestionesjj_iglesia_items
  for each row execute function public.gestionesjj_iglesia_items_sincronizar_hijos();
