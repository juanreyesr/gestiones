-- Clinica: consentimiento informado en la hoja de datos (adultos y menores de
-- edad) y modulo de evaluaciones que se envian al paciente y se integran a su
-- expediente (primer instrumento: B-Breve).
--
-- Decisiones de diseño:
-- - El consentimiento se acepta en el formulario publico /datos/<token>. Cada
--   aceptacion queda como un registro NUEVO en gestionesjj_consentimientos
--   (nunca se sobrescribe): texto completo tal como se mostro, version,
--   firmantes (paciente o padres/tutores con identificacion), asentimiento del
--   menor, IP y navegador como evidencia de la firma electronica. Ademas se
--   actualiza gestionesjj_pacientes.consentimiento_* para lo que ya lo usa.
-- - "Es menor de edad" lo marca el psicologo (es_menor); el formulario publico
--   no puede cambiarlo. Los datos de los padres/tutores viven en
--   gestionesjj_pacientes.responsables (jsonb) para prellenar si se reabre.
-- - Evaluaciones: el psicologo asigna un instrumento a un paciente y obtiene un
--   enlace /evaluacion/<token>. Cada envio es un registro nuevo en
--   gestionesjj_evaluacion_respuestas (sin politica de UPDATE: no se
--   sobrescriben, se necesitan para el seguimiento). Un enlace admite
--   `respuestas_permitidas` envios (p. ej. 2 para que cada cuidador responda).
-- - Seguridad: igual que el resto de la Clinica. RLS owner-only, anon sin
--   grants de tabla; el flujo publico pasa solo por RPCs SECURITY DEFINER que
--   no devuelven datos clinicos. Supabase cifra la base de datos en reposo
--   (AES-256) a nivel de disco.
-- - Compatibilidad: gestionesjj_public_datos_save conserva los parametros
--   anteriores; los nuevos van al final con default null. Un llamado sin
--   consentimiento (version anterior de la app) se rechaza.

-- ============================================================
-- 1) Pacientes: menor de edad, responsables, identificacion
-- ============================================================
alter table public.gestionesjj_pacientes
  add column if not exists es_menor boolean not null default false,
  add column if not exists responsables jsonb not null default '[]'::jsonb,
  add column if not exists identificacion text;

-- ============================================================
-- 2) Historial de consentimientos
-- ============================================================
create table if not exists public.gestionesjj_consentimientos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  version text not null,
  es_menor boolean not null default false,
  texto text not null,
  firmantes jsonb not null default '[]'::jsonb,
  asentimiento_menor boolean,
  declara_tutela boolean,
  ip text,
  user_agent text,
  aceptado_at timestamptz not null default now()
);

create index if not exists gestionesjj_consentimientos_paciente_idx
  on public.gestionesjj_consentimientos (paciente_id, aceptado_at desc);

alter table public.gestionesjj_consentimientos enable row level security;
revoke all on public.gestionesjj_consentimientos from anon;
grant select, delete on public.gestionesjj_consentimientos to authenticated;
drop policy if exists "consentimientos_select_owner" on public.gestionesjj_consentimientos;
create policy "consentimientos_select_owner" on public.gestionesjj_consentimientos
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "consentimientos_delete_owner" on public.gestionesjj_consentimientos;
create policy "consentimientos_delete_owner" on public.gestionesjj_consentimientos
  for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- 3) Evaluaciones asignadas y sus respuestas
-- ============================================================
create table if not exists public.gestionesjj_evaluaciones (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  instrumento text not null check (instrumento ~ '^[a-z0-9-]{2,40}$'),
  token uuid not null unique default gen_random_uuid(),
  respuestas_permitidas integer not null default 1 check (respuestas_permitidas between 1 and 6),
  estado text not null default 'abierta' check (estado in ('abierta', 'completa', 'cerrada')),
  nota text check (nota is null or length(nota) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_evaluaciones_paciente_idx
  on public.gestionesjj_evaluaciones (paciente_id, created_at desc);

create table if not exists public.gestionesjj_evaluacion_respuestas (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  evaluacion_id uuid references public.gestionesjj_evaluaciones(id) on delete set null,
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  instrumento text not null check (instrumento ~ '^[a-z0-9-]{2,40}$'),
  respondiente_nombre text not null check (length(respondiente_nombre) between 1 and 120),
  respondiente_relacion text check (respondiente_relacion is null or length(respondiente_relacion) <= 60),
  fecha date,
  datos jsonb not null check (jsonb_typeof(datos) = 'object' and octet_length(datos::text) <= 20000),
  origen text not null default 'enlace' check (origen in ('enlace', 'codigo')),
  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_evaluacion_respuestas_paciente_idx
  on public.gestionesjj_evaluacion_respuestas (paciente_id, instrumento, created_at desc);
create index if not exists gestionesjj_evaluacion_respuestas_evaluacion_idx
  on public.gestionesjj_evaluacion_respuestas (evaluacion_id);

alter table public.gestionesjj_evaluaciones enable row level security;
alter table public.gestionesjj_evaluacion_respuestas enable row level security;
revoke all on public.gestionesjj_evaluaciones from anon;
revoke all on public.gestionesjj_evaluacion_respuestas from anon;
grant select, insert, update, delete on public.gestionesjj_evaluaciones to authenticated;
-- Respuestas: sin UPDATE (cada envio es un registro nuevo y no se sobrescribe).
grant select, insert, delete on public.gestionesjj_evaluacion_respuestas to authenticated;

drop policy if exists "evaluaciones_clin_select_owner" on public.gestionesjj_evaluaciones;
create policy "evaluaciones_clin_select_owner" on public.gestionesjj_evaluaciones
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "evaluaciones_clin_insert_owner" on public.gestionesjj_evaluaciones;
create policy "evaluaciones_clin_insert_owner" on public.gestionesjj_evaluaciones
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "evaluaciones_clin_update_owner" on public.gestionesjj_evaluaciones;
create policy "evaluaciones_clin_update_owner" on public.gestionesjj_evaluaciones
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "evaluaciones_clin_delete_owner" on public.gestionesjj_evaluaciones;
create policy "evaluaciones_clin_delete_owner" on public.gestionesjj_evaluaciones
  for delete to authenticated using (public.gestionesjj_is_owner());

drop policy if exists "evaluacion_respuestas_select_owner" on public.gestionesjj_evaluacion_respuestas;
create policy "evaluacion_respuestas_select_owner" on public.gestionesjj_evaluacion_respuestas
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "evaluacion_respuestas_insert_owner" on public.gestionesjj_evaluacion_respuestas;
create policy "evaluacion_respuestas_insert_owner" on public.gestionesjj_evaluacion_respuestas
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "evaluacion_respuestas_delete_owner" on public.gestionesjj_evaluacion_respuestas;
create policy "evaluacion_respuestas_delete_owner" on public.gestionesjj_evaluacion_respuestas
  for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- 4) RPC publica: leer la hoja de datos (agrega es_menor, responsables, identificacion)
-- ============================================================
drop function if exists public.gestionesjj_public_datos_get(uuid);

create function public.gestionesjj_public_datos_get(p_token uuid)
returns table(
  estado text, nombre text, telefono text, email text, fecha_nacimiento date, genero text, ocupacion text,
  escolaridad text, estado_civil text, direccion text, emergencia_nombre text, emergencia_telefono text,
  emergencia_relacion text, referido_por text, tiene_hijos boolean, hijos jsonb, vive_solo boolean,
  convive_con text[], convive_otros text, horario_trabajo text, pais text, zona_horaria text,
  es_menor boolean, responsables jsonb, identificacion text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p record;
begin
  if p_token is null then
    estado := 'invalido'; return next; return;
  end if;
  select * into p from public.gestionesjj_pacientes where datos_token = p_token;
  if p is null then
    estado := 'invalido'; return next; return;
  end if;
  if p.datos_completados_at is not null then
    estado := 'completado'; return next; return;
  end if;

  estado := 'ok';
  nombre := p.nombre; telefono := p.telefono; email := p.email;
  fecha_nacimiento := p.fecha_nacimiento; genero := p.genero; ocupacion := p.ocupacion;
  escolaridad := p.escolaridad; estado_civil := p.estado_civil; direccion := p.direccion;
  emergencia_nombre := p.emergencia_nombre; emergencia_telefono := p.emergencia_telefono;
  emergencia_relacion := p.emergencia_relacion; referido_por := p.referido_por;
  tiene_hijos := p.tiene_hijos; hijos := p.hijos; vive_solo := p.vive_solo;
  convive_con := p.convive_con; convive_otros := p.convive_otros; horario_trabajo := p.horario_trabajo;
  pais := p.pais; zona_horaria := p.zona_horaria;
  es_menor := p.es_menor; responsables := p.responsables; identificacion := p.identificacion;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_datos_get(uuid) from public;
grant execute on function public.gestionesjj_public_datos_get(uuid) to anon, authenticated;

-- ============================================================
-- 5) RPC publica: guardar hoja de datos + consentimiento obligatorio
-- ============================================================
drop function if exists public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, boolean, jsonb, boolean, text[], text, text, text, text
);

create function public.gestionesjj_public_datos_save(
  p_token uuid, p_nombre text, p_telefono text, p_email text, p_fecha_nacimiento date, p_genero text,
  p_ocupacion text, p_escolaridad text, p_estado_civil text, p_direccion text, p_emergencia_nombre text,
  p_emergencia_telefono text, p_emergencia_relacion text, p_referido_por text, p_tiene_hijos boolean,
  p_hijos jsonb, p_vive_solo boolean, p_convive_con text[], p_convive_otros text, p_horario_trabajo text,
  p_pais text default null, p_zona_horaria text default null,
  p_identificacion text default null,
  p_responsables jsonb default null,
  p_consentimiento_version text default null,
  p_consentimiento_texto text default null,
  p_asentimiento_menor boolean default null,
  p_declara_tutela boolean default null,
  p_ip text default null,
  p_user_agent text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_telefono text := btrim(coalesce(p_telefono, ''));
  v_hijos jsonb := case when coalesce(p_tiene_hijos, false) then coalesce(p_hijos, '[]'::jsonb) else '[]'::jsonb end;
  v_convive text[] := case when coalesce(p_vive_solo, false) then '{}'::text[] else coalesce(p_convive_con, '{}'::text[]) end;
  v_convive_otros text := case when coalesce(p_vive_solo, false) then null else nullif(btrim(coalesce(p_convive_otros, '')), '') end;
  v_pais text := nullif(upper(btrim(coalesce(p_pais, ''))), '');
  v_zona text := nullif(btrim(coalesce(p_zona_horaria, '')), '');
  v_ident text := nullif(btrim(coalesce(p_identificacion, '')), '');
  v_resp jsonb := coalesce(p_responsables, '[]'::jsonb);
  v_texto text := btrim(coalesce(p_consentimiento_texto, ''));
  v_version text := nullif(btrim(coalesce(p_consentimiento_version, '')), '');
  v_firmantes jsonb;
  r jsonb;
begin
  if p_token is null then
    return 'invalido';
  end if;
  select * into p from public.gestionesjj_pacientes where datos_token = p_token for update;
  if p is null then
    return 'invalido';
  end if;
  if p.datos_completados_at is not null then
    return 'completado';
  end if;
  if v_nombre = '' or length(v_nombre) > 120 or v_telefono = '' or length(v_telefono) > 30 then
    raise exception 'El nombre y el teléfono son obligatorios.';
  end if;
  if jsonb_typeof(v_hijos) <> 'array' or jsonb_array_length(v_hijos) > 20 then
    raise exception 'La información de hijos no es válida.';
  end if;
  if array_length(v_convive, 1) > 12 then
    raise exception 'Selección de convivencia no válida.';
  end if;
  if v_pais is not null and v_pais !~ '^[A-Z]{2}$' then
    raise exception 'El país no es válido.';
  end if;
  if v_zona is not null and (length(v_zona) > 64 or v_zona !~ '^[A-Za-z_]+(/[A-Za-z_+-]+)+$') then
    raise exception 'La zona horaria no es válida.';
  end if;
  if v_ident is not null and length(v_ident) > 40 then
    raise exception 'El documento de identificación no es válido.';
  end if;

  -- Consentimiento informado: obligatorio.
  if v_texto = '' or v_version is null or length(v_texto) > 30000 or length(v_version) > 20 then
    raise exception 'Debe aceptar el consentimiento informado para guardar su información.';
  end if;

  -- Menor de edad: al menos un padre, madre o tutor con nombre e identificacion.
  if jsonb_typeof(v_resp) <> 'array' or jsonb_array_length(v_resp) > 2 then
    raise exception 'Los datos de los padres o tutores no son válidos.';
  end if;
  if p.es_menor then
    if jsonb_array_length(v_resp) = 0 then
      raise exception 'Indique el nombre e identificación del padre, madre o tutor que firma el consentimiento.';
    end if;
    for r in select * from jsonb_array_elements(v_resp) loop
      if jsonb_typeof(r) <> 'object'
         or length(btrim(coalesce(r ->> 'nombre', ''))) not between 1 and 120
         or length(btrim(coalesce(r ->> 'identificacion', ''))) not between 1 and 40
         or length(coalesce(r ->> 'parentesco', '')) > 40
         or length(coalesce(r ->> 'telefono', '')) > 30
         or length(coalesce(r ->> 'tipoIdentificacion', '')) > 30 then
        raise exception 'Complete el nombre y la identificación de cada padre, madre o tutor.';
      end if;
    end loop;
    if not coalesce(p_declara_tutela, false) then
      raise exception 'Confirme que ejerce la patria potestad o tutela legal del menor.';
    end if;
    v_firmantes := v_resp;
  else
    v_resp := '[]'::jsonb;
    v_firmantes := jsonb_build_array(jsonb_build_object(
      'nombre', v_nombre, 'identificacion', coalesce(v_ident, ''), 'parentesco', 'Paciente'
    ));
  end if;

  update public.gestionesjj_pacientes set
    nombre = v_nombre,
    telefono = v_telefono,
    email = nullif(btrim(coalesce(p_email, '')), ''),
    fecha_nacimiento = p_fecha_nacimiento,
    genero = nullif(btrim(coalesce(p_genero, '')), ''),
    ocupacion = nullif(btrim(coalesce(p_ocupacion, '')), ''),
    escolaridad = nullif(btrim(coalesce(p_escolaridad, '')), ''),
    estado_civil = nullif(btrim(coalesce(p_estado_civil, '')), ''),
    direccion = nullif(btrim(coalesce(p_direccion, '')), ''),
    emergencia_nombre = nullif(btrim(coalesce(p_emergencia_nombre, '')), ''),
    emergencia_telefono = nullif(btrim(coalesce(p_emergencia_telefono, '')), ''),
    emergencia_relacion = nullif(btrim(coalesce(p_emergencia_relacion, '')), ''),
    referido_por = nullif(btrim(coalesce(p_referido_por, '')), ''),
    tiene_hijos = p_tiene_hijos,
    hijos = v_hijos,
    vive_solo = p_vive_solo,
    convive_con = v_convive,
    convive_otros = v_convive_otros,
    horario_trabajo = nullif(btrim(coalesce(p_horario_trabajo, '')), ''),
    pais = coalesce(v_pais, p.pais),
    zona_horaria = case when p_pais is null and p_zona_horaria is null then p.zona_horaria else v_zona end,
    identificacion = case when p.es_menor then p.identificacion else v_ident end,
    responsables = case when p.es_menor then v_resp else p.responsables end,
    consentimiento_texto = v_texto,
    consentimiento_aceptado_at = now(),
    datos_completados_at = now()
  where id = p.id;

  insert into public.gestionesjj_consentimientos
    (paciente_id, version, es_menor, texto, firmantes, asentimiento_menor, declara_tutela, ip, user_agent)
  values
    (p.id, v_version, p.es_menor, v_texto, v_firmantes,
     case when p.es_menor then coalesce(p_asentimiento_menor, false) else null end,
     case when p.es_menor then true else null end,
     left(nullif(btrim(coalesce(p_ip, '')), ''), 64),
     left(nullif(btrim(coalesce(p_user_agent, '')), ''), 300));

  return 'guardado';
end;
$$;

revoke execute on function public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, boolean, jsonb, boolean, text[], text, text, text, text,
  text, jsonb, text, text, boolean, boolean, text, text
) from public;
grant execute on function public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, boolean, jsonb, boolean, text[], text, text, text, text,
  text, jsonb, text, text, boolean, boolean, text, text
) to anon, authenticated;

-- ============================================================
-- 6) RPC publica: datos minimos de una evaluacion por token
-- estado: 'ok' | 'completa' | 'cerrada' | 'invalido'. No devuelve datos clinicos
-- ni el nombre del paciente; solo el instrumento y un codigo de caso corto.
-- ============================================================
create or replace function public.gestionesjj_public_evaluacion_get(p_token uuid)
returns table (estado text, instrumento text, ref text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e record;
  v_usadas integer;
begin
  if p_token is null then
    estado := 'invalido'; return next; return;
  end if;
  select * into e from public.gestionesjj_evaluaciones where token = p_token;
  if e is null then
    estado := 'invalido'; return next; return;
  end if;
  instrumento := e.instrumento;
  ref := upper(left(replace(e.paciente_id::text, '-', ''), 8));
  if e.estado = 'cerrada' then
    estado := 'cerrada'; return next; return;
  end if;
  select count(*) into v_usadas from public.gestionesjj_evaluacion_respuestas where evaluacion_id = e.id;
  if e.estado = 'completa' or v_usadas >= e.respuestas_permitidas then
    estado := 'completa'; return next; return;
  end if;
  estado := 'ok';
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_evaluacion_get(uuid) from public;
grant execute on function public.gestionesjj_public_evaluacion_get(uuid) to anon, authenticated;

-- ============================================================
-- 7) RPC publica: registrar una respuesta (siempre un registro nuevo)
-- La validacion fina del contenido se hace en /api/evaluacion/[token] segun el
-- instrumento; aqui se validan limites y el estado del enlace.
-- ============================================================
create or replace function public.gestionesjj_public_evaluacion_responder(
  p_token uuid,
  p_nombre text,
  p_relacion text,
  p_fecha date,
  p_datos jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  v_usadas integer;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_relacion text := nullif(btrim(coalesce(p_relacion, '')), '');
begin
  if p_token is null then
    return 'invalido';
  end if;
  select * into e from public.gestionesjj_evaluaciones where token = p_token for update;
  if e is null then
    return 'invalido';
  end if;
  if e.estado = 'cerrada' then
    return 'cerrada';
  end if;
  select count(*) into v_usadas from public.gestionesjj_evaluacion_respuestas where evaluacion_id = e.id;
  if e.estado = 'completa' or v_usadas >= e.respuestas_permitidas then
    return 'completa';
  end if;
  if length(v_nombre) not between 1 and 120 or (v_relacion is not null and length(v_relacion) > 60) then
    raise exception 'Indique su nombre y su relación con el niño o niña.';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' or octet_length(p_datos::text) > 20000 then
    raise exception 'Las respuestas no son válidas.';
  end if;
  if p_fecha is not null and (p_fecha < date '2020-01-01' or p_fecha > (now() at time zone 'America/Guatemala')::date + 1) then
    raise exception 'La fecha no es válida.';
  end if;

  insert into public.gestionesjj_evaluacion_respuestas
    (created_by, evaluacion_id, paciente_id, instrumento, respondiente_nombre, respondiente_relacion, fecha, datos, origen)
  values
    (e.created_by, e.id, e.paciente_id, e.instrumento, v_nombre, v_relacion, p_fecha, p_datos, 'enlace');

  if v_usadas + 1 >= e.respuestas_permitidas then
    update public.gestionesjj_evaluaciones set estado = 'completa' where id = e.id;
  end if;

  return 'guardado';
end;
$$;

revoke execute on function public.gestionesjj_public_evaluacion_responder(uuid, text, text, date, jsonb) from public;
grant execute on function public.gestionesjj_public_evaluacion_responder(uuid, text, text, date, jsonb) to anon, authenticated;

-- ============================================================
-- 8) Defensa adicional: los privilegios por defecto del esquema dan UPDATE a
-- authenticated; se quitan para que respuestas y consentimientos no se
-- puedan modificar ni siquiera desde la sesion del psicologo.
-- ============================================================
revoke update, truncate on public.gestionesjj_evaluacion_respuestas from authenticated;
revoke insert, update, truncate on public.gestionesjj_consentimientos from authenticated;
