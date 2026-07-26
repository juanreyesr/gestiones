-- La gestion de pendientes nacio dentro del area Iglesia (migracion 014), pero
-- sus tableros sirven igual para la clinica, los cursos, la coordinacion o lo
-- personal, asi que paso a ser un area propia del menu principal. Aqui se
-- renombra todo lo que llevaba el prefijo "iglesia" para que el esquema diga la
-- verdad: tablas, indices, disparadores, funciones y politicas.
--
-- Los eventos (gestionesjj_iglesia_eventos y sus participantes) SI son del area
-- Iglesia y conservan su nombre. El vinculo pendiente -> evento tambien se
-- queda: un pendiente puede seguir naciendo de una boda o un bautizo.
--
-- Renombrar preserva datos, indices, restricciones y politicas; no es una copia.
-- Todo el archivo es idempotente: si ya se aplico, no hace nada.

-- ============================================================
-- TABLAS
-- ============================================================
do $$
declare
  par record;
begin
  for par in
    select * from (values
      ('gestionesjj_iglesia_tableros', 'gestionesjj_pendientes_tableros'),
      ('gestionesjj_iglesia_grupos', 'gestionesjj_pendientes_grupos'),
      ('gestionesjj_iglesia_items', 'gestionesjj_pendientes_items'),
      ('gestionesjj_iglesia_actualizaciones', 'gestionesjj_pendientes_actualizaciones')
    ) as t(viejo, nuevo)
  loop
    if to_regclass('public.' || par.viejo) is not null
       and to_regclass('public.' || par.nuevo) is null then
      execute format('alter table public.%I rename to %I', par.viejo, par.nuevo);
    end if;
  end loop;
end;
$$;

-- ============================================================
-- INDICES Y RESTRICCIONES
-- Se renombra cualquier objeto de estas tablas cuyo nombre siga empezando con
-- el prefijo viejo, en vez de listarlos uno por uno: asi entran tambien los
-- nombres que Postgres genero solo (llaves primarias, llaves foraneas y CHECK).
-- Las restricciones van primero porque renombrar una arrastra su indice.
-- ============================================================
do $$
declare
  tabla text;
  obj record;
begin
  foreach tabla in array array[
    'gestionesjj_pendientes_tableros',
    'gestionesjj_pendientes_grupos',
    'gestionesjj_pendientes_items',
    'gestionesjj_pendientes_actualizaciones'
  ]
  loop
    if to_regclass('public.' || tabla) is null then
      continue;
    end if;

    for obj in
      select conname as nombre from pg_constraint
      where conrelid = ('public.' || tabla)::regclass
        and conname like 'gestionesjj\_iglesia\_%'
    loop
      execute format(
        'alter table public.%I rename constraint %I to %I',
        tabla, obj.nombre, replace(obj.nombre, 'gestionesjj_iglesia_', 'gestionesjj_pendientes_'));
    end loop;

    for obj in
      select indexname as nombre from pg_indexes
      where schemaname = 'public' and tablename = tabla
        and indexname like 'gestionesjj\_iglesia\_%'
    loop
      execute format(
        'alter index public.%I rename to %I',
        obj.nombre, replace(obj.nombre, 'gestionesjj_iglesia_', 'gestionesjj_pendientes_'));
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- POLITICAS RLS (cuatro por tabla: select / insert / update / delete)
-- ============================================================
do $$
declare
  tabla record;
  accion text;
  viejo text;
  nuevo text;
begin
  for tabla in
    select * from (values
      ('gestionesjj_iglesia_tableros', 'gestionesjj_pendientes_tableros'),
      ('gestionesjj_iglesia_grupos', 'gestionesjj_pendientes_grupos'),
      ('gestionesjj_iglesia_items', 'gestionesjj_pendientes_items'),
      ('gestionesjj_iglesia_actualizaciones', 'gestionesjj_pendientes_actualizaciones')
    ) as t(viejo, nuevo)
  loop
    foreach accion in array array['select', 'insert', 'update', 'delete']
    loop
      viejo := tabla.viejo || '_' || accion || '_owner';
      nuevo := tabla.nuevo || '_' || accion || '_owner';
      if exists (select 1 from pg_policies where schemaname = 'public' and tablename = tabla.nuevo and policyname = viejo) then
        execute format('alter policy %I on public.%I rename to %I', viejo, tabla.nuevo, nuevo);
      end if;
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- DISPARADORES
-- ============================================================
do $$
declare
  par record;
begin
  for par in
    select * from (values
      ('gestionesjj_pendientes_tableros', 'gestionesjj_iglesia_tableros_set_updated_at', 'gestionesjj_pendientes_tableros_set_updated_at'),
      ('gestionesjj_pendientes_grupos', 'gestionesjj_iglesia_grupos_set_updated_at', 'gestionesjj_pendientes_grupos_set_updated_at'),
      ('gestionesjj_pendientes_items', 'gestionesjj_iglesia_items_set_updated_at', 'gestionesjj_pendientes_items_set_updated_at'),
      ('gestionesjj_pendientes_items', 'gestionesjj_iglesia_items_completado', 'gestionesjj_pendientes_items_completado'),
      ('gestionesjj_pendientes_items', 'gestionesjj_iglesia_items_padre', 'gestionesjj_pendientes_items_padre'),
      ('gestionesjj_pendientes_items', 'gestionesjj_iglesia_items_hijos', 'gestionesjj_pendientes_items_hijos')
    ) as t(tabla, viejo, nuevo)
  loop
    if to_regclass('public.' || par.tabla) is not null
       and exists (
         select 1 from pg_trigger
         where tgname = par.viejo and tgrelid = to_regclass('public.' || par.tabla)
       ) then
      execute format('alter trigger %I on public.%I rename to %I', par.viejo, par.tabla, par.nuevo);
    end if;
  end loop;
end;
$$;

-- ============================================================
-- FUNCIONES DE LOS DISPARADORES
-- Los disparadores siguen apuntando a la funcion tras renombrarla.
-- ============================================================
do $$
declare
  par record;
begin
  for par in
    select * from (values
      ('gestionesjj_iglesia_items_sellar_completado', 'gestionesjj_pendientes_items_sellar_completado'),
      ('gestionesjj_iglesia_items_validar_padre', 'gestionesjj_pendientes_items_validar_padre'),
      ('gestionesjj_iglesia_items_sincronizar_hijos', 'gestionesjj_pendientes_items_sincronizar_hijos')
    ) as t(viejo, nuevo)
  loop
    if exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = par.viejo
    ) then
      execute format('alter function public.%I() rename to %I', par.viejo, par.nuevo);
    end if;
  end loop;
end;
$$;

-- Las funciones renombradas siguen apuntando a las tablas viejas por nombre
-- dentro de su cuerpo (search_path = '' obliga a nombre calificado), asi que se
-- vuelven a crear con los nombres nuevos.
create or replace function public.gestionesjj_pendientes_items_validar_padre()
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

  select * into padre from public.gestionesjj_pendientes_items where id = new.item_padre_id;
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

create or replace function public.gestionesjj_pendientes_items_sincronizar_hijos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.item_padre_id is null
     and (new.grupo_id is distinct from old.grupo_id or new.tablero_id is distinct from old.tablero_id) then
    update public.gestionesjj_pendientes_items
    set grupo_id = new.grupo_id, tablero_id = new.tablero_id
    where item_padre_id = new.id;
  end if;
  return null;
end;
$$;
