-- Modulo Recursos: encuestas en vivo (fase 1 de un motor compartido que en
-- fases futuras tambien alimentara quiz tipo concurso y preguntas del publico).
--
-- Flujo: el owner crea un "recurso" reutilizable con preguntas, lanza una
-- "sesion" en vivo (PIN de 6 digitos), los participantes entran sin cuenta
-- desde /vivo/[pin] con un apodo y responden. El owner ve resultados en vivo
-- via Supabase Realtime.
--
-- Seguridad (mismo patron que el modulo Clinica en 006/007):
--  * Todas las tablas usan RLS con gestionesjj_is_owner().
--  * anon NO tiene grants de tabla: el flujo publico (unirse, consultar
--    estado, responder) pasa unicamente por RPCs SECURITY DEFINER que
--    validan PIN/estado de sesion y limitan el tamano de las respuestas.

-- ============================================================
-- RECURSOS (encuesta/quiz/qa reutilizables)
-- ============================================================
create table if not exists public.gestionesjj_recursos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null default 'encuesta' check (tipo in ('encuesta', 'quiz', 'qa')),
  titulo text not null,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PREGUNTAS de un recurso
-- opciones: array jsonb [{"id":"...", "texto":"..."}] solo para opcion_multiple.
-- ============================================================
create table if not exists public.gestionesjj_recurso_preguntas (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recurso_id uuid not null references public.gestionesjj_recursos(id) on delete cascade,
  orden integer not null default 0,
  tipo_pregunta text not null check (tipo_pregunta in ('opcion_multiple', 'nube_palabras', 'abierta', 'escala')),
  texto text not null,
  opciones jsonb,
  escala_min integer not null default 1,
  escala_max integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gestionesjj_recurso_preguntas_opciones_validas check (
    (tipo_pregunta = 'opcion_multiple' and opciones is not null and jsonb_typeof(opciones) = 'array' and jsonb_array_length(opciones) >= 2)
    or (tipo_pregunta <> 'opcion_multiple' and opciones is null)
  ),
  constraint gestionesjj_recurso_preguntas_escala_valida check (escala_max > escala_min)
);

-- ============================================================
-- SESIONES en vivo (una por cada vez que se "lanza" un recurso)
-- ============================================================
create table if not exists public.gestionesjj_recurso_sesiones (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recurso_id uuid not null references public.gestionesjj_recursos(id) on delete cascade,
  pin text not null,
  estado text not null default 'espera' check (estado in ('espera', 'activa', 'cerrada')),
  pregunta_activa_id uuid references public.gestionesjj_recurso_preguntas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cerrada_at timestamptz
);

-- Un PIN solo debe ser unico mientras la sesion sigue abierta; al cerrarla
-- el codigo de 6 digitos vuelve a estar disponible para nuevas sesiones.
create unique index if not exists gestionesjj_recurso_sesiones_pin_activa_idx
  on public.gestionesjj_recurso_sesiones (pin) where estado in ('espera', 'activa');

-- ============================================================
-- PARTICIPANTES (sin cuenta; entran con PIN + apodo via RPC publica)
-- ============================================================
create table if not exists public.gestionesjj_recurso_participantes (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.gestionesjj_recurso_sesiones(id) on delete cascade,
  apodo text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RESPUESTAS de cada participante a cada pregunta
-- valor jsonb: {"opcion_id":"..."} | {"texto":"..."} | {"valor":3}
-- ============================================================
create table if not exists public.gestionesjj_recurso_respuestas (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.gestionesjj_recurso_sesiones(id) on delete cascade,
  pregunta_id uuid not null references public.gestionesjj_recurso_preguntas(id) on delete cascade,
  participante_id uuid not null references public.gestionesjj_recurso_participantes(id) on delete cascade,
  valor jsonb not null,
  created_at timestamptz not null default now(),
  unique (participante_id, pregunta_id)
);

-- ============================================================
-- INDICES
-- ============================================================
create index if not exists gestionesjj_recurso_preguntas_recurso_idx on public.gestionesjj_recurso_preguntas (recurso_id, orden);
create index if not exists gestionesjj_recurso_sesiones_recurso_idx on public.gestionesjj_recurso_sesiones (recurso_id, created_at desc);
create index if not exists gestionesjj_recurso_participantes_sesion_idx on public.gestionesjj_recurso_participantes (sesion_id);
create index if not exists gestionesjj_recurso_respuestas_sesion_pregunta_idx on public.gestionesjj_recurso_respuestas (sesion_id, pregunta_id);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_recursos enable row level security;
alter table public.gestionesjj_recurso_preguntas enable row level security;
alter table public.gestionesjj_recurso_sesiones enable row level security;
alter table public.gestionesjj_recurso_participantes enable row level security;
alter table public.gestionesjj_recurso_respuestas enable row level security;

-- anon jamas toca estas tablas directamente (solo via RPC security definer).
revoke all on public.gestionesjj_recursos from anon;
revoke all on public.gestionesjj_recurso_preguntas from anon;
revoke all on public.gestionesjj_recurso_sesiones from anon;
revoke all on public.gestionesjj_recurso_participantes from anon;
revoke all on public.gestionesjj_recurso_respuestas from anon;

grant select, insert, update, delete on public.gestionesjj_recursos to authenticated;
grant select, insert, update, delete on public.gestionesjj_recurso_preguntas to authenticated;
grant select, update, delete on public.gestionesjj_recurso_sesiones to authenticated;
grant select, delete on public.gestionesjj_recurso_participantes to authenticated;
grant select, delete on public.gestionesjj_recurso_respuestas to authenticated;

create policy "recursos_select_owner" on public.gestionesjj_recursos for select to authenticated using (public.gestionesjj_is_owner());
create policy "recursos_insert_owner" on public.gestionesjj_recursos for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "recursos_update_owner" on public.gestionesjj_recursos for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "recursos_delete_owner" on public.gestionesjj_recursos for delete to authenticated using (public.gestionesjj_is_owner());

create policy "recurso_preguntas_select_owner" on public.gestionesjj_recurso_preguntas for select to authenticated using (public.gestionesjj_is_owner());
create policy "recurso_preguntas_insert_owner" on public.gestionesjj_recurso_preguntas for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "recurso_preguntas_update_owner" on public.gestionesjj_recurso_preguntas for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "recurso_preguntas_delete_owner" on public.gestionesjj_recurso_preguntas for delete to authenticated using (public.gestionesjj_is_owner());

-- El owner nunca inserta sesiones directamente (se crean via RPC gestionesjj_crear_sesion).
create policy "recurso_sesiones_select_owner" on public.gestionesjj_recurso_sesiones for select to authenticated using (public.gestionesjj_is_owner());
create policy "recurso_sesiones_update_owner" on public.gestionesjj_recurso_sesiones for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "recurso_sesiones_delete_owner" on public.gestionesjj_recurso_sesiones for delete to authenticated using (public.gestionesjj_is_owner());

-- Participantes y respuestas: el owner solo lee/borra (llegan via RPC anon).
create policy "recurso_participantes_select_owner" on public.gestionesjj_recurso_participantes for select to authenticated using (public.gestionesjj_is_owner());
create policy "recurso_participantes_delete_owner" on public.gestionesjj_recurso_participantes for delete to authenticated using (public.gestionesjj_is_owner());

create policy "recurso_respuestas_select_owner" on public.gestionesjj_recurso_respuestas for select to authenticated using (public.gestionesjj_is_owner());
create policy "recurso_respuestas_delete_owner" on public.gestionesjj_recurso_respuestas for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- REALTIME: el presentador escucha participantes y respuestas en vivo.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gestionesjj_recurso_sesiones'
  ) then
    alter publication supabase_realtime add table public.gestionesjj_recurso_sesiones;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gestionesjj_recurso_participantes'
  ) then
    alter publication supabase_realtime add table public.gestionesjj_recurso_participantes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gestionesjj_recurso_respuestas'
  ) then
    alter publication supabase_realtime add table public.gestionesjj_recurso_respuestas;
  end if;
end $$;

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
drop trigger if exists gestionesjj_recursos_set_updated_at on public.gestionesjj_recursos;
create trigger gestionesjj_recursos_set_updated_at before update on public.gestionesjj_recursos for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_recurso_preguntas_set_updated_at on public.gestionesjj_recurso_preguntas;
create trigger gestionesjj_recurso_preguntas_set_updated_at before update on public.gestionesjj_recurso_preguntas for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_recurso_sesiones_set_updated_at on public.gestionesjj_recurso_sesiones;
create trigger gestionesjj_recurso_sesiones_set_updated_at before update on public.gestionesjj_recurso_sesiones for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- RPC OWNER: crear una sesion en vivo (genera PIN de 6 digitos sin colision)
-- ============================================================
create or replace function public.gestionesjj_crear_sesion(p_recurso_id uuid)
returns table (sesion_id uuid, pin text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pin text;
  v_id uuid;
  v_intentos integer := 0;
begin
  if not public.gestionesjj_is_owner() then
    raise exception 'No autorizado.';
  end if;

  if not exists (select 1 from public.gestionesjj_recursos where id = p_recurso_id) then
    raise exception 'El recurso no existe.';
  end if;

  loop
    v_intentos := v_intentos + 1;
    v_pin := lpad((100000 + floor(random() * 900000))::int::text, 6, '0');
    begin
      insert into public.gestionesjj_recurso_sesiones (created_by, recurso_id, pin, estado)
      values ((select auth.uid()), p_recurso_id, v_pin, 'espera')
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_intentos >= 20 then
        raise exception 'No se pudo generar un PIN disponible. Intenta de nuevo.';
      end if;
    end;
  end loop;

  sesion_id := v_id;
  pin := v_pin;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_crear_sesion(uuid) from public;
grant execute on function public.gestionesjj_crear_sesion(uuid) to authenticated;

-- ============================================================
-- RPC PUBLICA 1: consultar una sesion por PIN (pantalla de ingreso)
-- ============================================================
create or replace function public.gestionesjj_public_sesion_por_pin(p_pin text)
returns table (sesion_id uuid, estado text, recurso_titulo text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.estado, r.titulo
  from public.gestionesjj_recurso_sesiones s
  join public.gestionesjj_recursos r on r.id = s.recurso_id
  where s.pin = p_pin and s.estado in ('espera', 'activa')
  limit 1;
$$;

revoke execute on function public.gestionesjj_public_sesion_por_pin(text) from public;
grant execute on function public.gestionesjj_public_sesion_por_pin(text) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA 2: unirse a una sesion con PIN + apodo
-- ============================================================
create or replace function public.gestionesjj_public_unirse(p_pin text, p_apodo text)
returns table (participante_id uuid, sesion_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  ses record;
  v_apodo text := btrim(coalesce(p_apodo, ''));
  v_id uuid;
begin
  if v_apodo = '' or length(v_apodo) > 40 then
    raise exception 'Ingresa un apodo válido (máximo 40 caracteres).';
  end if;

  select * into ses from public.gestionesjj_recurso_sesiones where pin = p_pin and estado in ('espera', 'activa');
  if ses is null then
    raise exception 'El PIN no es válido o la sesión ya terminó.';
  end if;

  perform pg_advisory_xact_lock(hashtext('gestionesjj_recurso_participantes_' || ses.id::text));

  if (select count(*) from public.gestionesjj_recurso_participantes where sesion_id = ses.id) >= 500 then
    raise exception 'Se alcanzó el límite de participantes de esta sesión.';
  end if;

  insert into public.gestionesjj_recurso_participantes (sesion_id, apodo)
  values (ses.id, v_apodo)
  returning id into v_id;

  participante_id := v_id;
  sesion_id := ses.id;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_unirse(text, text) from public;
grant execute on function public.gestionesjj_public_unirse(text, text) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA 3: estado de la sesion desde el punto de vista del participante
-- (usado en polling desde el celular para saber cuando cambia la pregunta)
-- ============================================================
create or replace function public.gestionesjj_public_estado_participante(p_participante_id uuid)
returns table (
  estado text,
  sesion_titulo text,
  pregunta_id uuid,
  pregunta_tipo text,
  pregunta_texto text,
  pregunta_opciones jsonb,
  pregunta_escala_min integer,
  pregunta_escala_max integer,
  ya_respondio boolean,
  participantes_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  part record;
  ses record;
  preg record;
begin
  select * into part from public.gestionesjj_recurso_participantes where id = p_participante_id;
  if part is null then
    estado := 'invalido';
    return next;
    return;
  end if;

  select * into ses from public.gestionesjj_recurso_sesiones where id = part.sesion_id;
  if ses is null or ses.estado = 'cerrada' then
    estado := 'cerrada';
    return next;
    return;
  end if;

  estado := ses.estado;
  select r.titulo into sesion_titulo from public.gestionesjj_recursos r where r.id = ses.recurso_id;

  if ses.pregunta_activa_id is not null then
    select * into preg from public.gestionesjj_recurso_preguntas where id = ses.pregunta_activa_id;
    pregunta_id := preg.id;
    pregunta_tipo := preg.tipo_pregunta;
    pregunta_texto := preg.texto;
    pregunta_opciones := preg.opciones;
    pregunta_escala_min := preg.escala_min;
    pregunta_escala_max := preg.escala_max;
    ya_respondio := exists(
      select 1 from public.gestionesjj_recurso_respuestas resp
      where resp.participante_id = p_participante_id and resp.pregunta_id = preg.id
    );
  end if;

  select count(*)::integer into participantes_count from public.gestionesjj_recurso_participantes where sesion_id = ses.id;

  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_estado_participante(uuid) from public;
grant execute on function public.gestionesjj_public_estado_participante(uuid) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA 4: responder la pregunta activa
-- ============================================================
create or replace function public.gestionesjj_public_responder(
  p_participante_id uuid,
  p_pregunta_id uuid,
  p_valor jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  part record;
  ses record;
  preg record;
  v_opcion_id text;
  v_valor_num numeric;
  v_texto text;
begin
  select * into part from public.gestionesjj_recurso_participantes where id = p_participante_id;
  if part is null then
    raise exception 'Participante no encontrado.';
  end if;

  select * into ses from public.gestionesjj_recurso_sesiones where id = part.sesion_id for update;
  if ses is null or ses.estado <> 'activa' or ses.pregunta_activa_id is null or ses.pregunta_activa_id <> p_pregunta_id then
    raise exception 'Esta pregunta ya no está activa.';
  end if;

  select * into preg from public.gestionesjj_recurso_preguntas where id = p_pregunta_id;
  if preg is null then
    raise exception 'La pregunta no existe.';
  end if;

  if preg.tipo_pregunta = 'opcion_multiple' then
    v_opcion_id := p_valor ->> 'opcion_id';
    if v_opcion_id is null or not exists (
      select 1 from jsonb_array_elements(preg.opciones) op where op ->> 'id' = v_opcion_id
    ) then
      raise exception 'Opción inválida.';
    end if;
  elsif preg.tipo_pregunta = 'escala' then
    begin
      v_valor_num := (p_valor ->> 'valor')::numeric;
    exception when others then
      raise exception 'Valor de escala inválido.';
    end;
    if v_valor_num is null or v_valor_num < preg.escala_min or v_valor_num > preg.escala_max then
      raise exception 'Valor de escala fuera de rango.';
    end if;
  elsif preg.tipo_pregunta in ('abierta', 'nube_palabras') then
    v_texto := btrim(coalesce(p_valor ->> 'texto', ''));
    if v_texto = '' then
      raise exception 'La respuesta no puede estar vacía.';
    end if;
    if preg.tipo_pregunta = 'nube_palabras' and length(v_texto) > 40 then
      raise exception 'La respuesta es demasiado larga (máximo 40 caracteres).';
    end if;
    if preg.tipo_pregunta = 'abierta' and length(v_texto) > 500 then
      raise exception 'La respuesta es demasiado larga (máximo 500 caracteres).';
    end if;
  end if;

  begin
    insert into public.gestionesjj_recurso_respuestas (sesion_id, pregunta_id, participante_id, valor)
    values (ses.id, p_pregunta_id, p_participante_id, p_valor);
  exception when unique_violation then
    raise exception 'Ya respondiste esta pregunta.';
  end;

  return true;
end;
$$;

revoke execute on function public.gestionesjj_public_responder(uuid, uuid, jsonb) from public;
grant execute on function public.gestionesjj_public_responder(uuid, uuid, jsonb) to anon, authenticated;
