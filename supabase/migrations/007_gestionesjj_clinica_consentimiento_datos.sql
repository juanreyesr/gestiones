-- Modulo Clinica (fase 2):
--  * Consentimiento informado en el agendamiento publico (texto editable + registro por paciente).
--  * Pistas que marca el paciente al agendar (ya es paciente / primera sesion / dar seguimiento).
--  * Enlace publico para que el paciente llene su hoja de datos generales (token + estado completado).
--  * Motivo al cancelar / marcar no asistio.

-- ============================================================
-- PACIENTES: token de datos, estado de completado, registro de consentimiento
-- ============================================================
alter table public.gestionesjj_pacientes
  add column if not exists datos_token uuid unique,
  add column if not exists datos_completados_at timestamptz,
  add column if not exists consentimiento_aceptado_at timestamptz,
  add column if not exists consentimiento_texto text;

-- ============================================================
-- SOLICITUDES: pistas del paciente + snapshot del consentimiento aceptado
-- ============================================================
alter table public.gestionesjj_solicitudes_cita
  add column if not exists ya_es_paciente boolean not null default false,
  add column if not exists primera_sesion boolean not null default false,
  add column if not exists dar_seguimiento boolean not null default false,
  add column if not exists consentimiento_texto text;

-- ============================================================
-- CITAS: motivo al cambiar a cancelada / no asistio
-- ============================================================
alter table public.gestionesjj_citas
  add column if not exists motivo_estado text;

-- ============================================================
-- DISPONIBILIDAD: texto editable del consentimiento informado
-- ============================================================
alter table public.gestionesjj_disponibilidad
  add column if not exists consentimiento_texto text not null default
    'Al solicitar una cita acepto lo siguiente: (1) La información que comparto será tratada de forma confidencial y utilizada únicamente para mi atención psicológica. (2) La confidencialidad tiene límites cuando exista riesgo para mi vida o la de otras personas, o cuando la ley lo requiera. (3) Autorizo que se me contacte por teléfono o correo electrónico para confirmar, recordar o reprogramar mi cita. (4) Entiendo que si no puedo asistir debo avisar con anticipación. (5) La atención psicológica no sustituye una valoración médica o psiquiátrica cuando esta sea necesaria. Confirmo que la información que proporciono es verdadera y que participo de forma voluntaria.';

-- ============================================================
-- RPC PUBLICA 1 (reemplazo): info de agendamiento incluye el texto de consentimiento
-- ============================================================
drop function if exists public.gestionesjj_public_booking_info();

create or replace function public.gestionesjj_public_booking_info()
returns table (activo boolean, duracion_min integer, zona_horaria text, consentimiento_texto text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select d.agendamiento_publico from public.gestionesjj_disponibilidad d limit 1), false),
    coalesce((select d.duracion_min from public.gestionesjj_disponibilidad d limit 1), 50),
    coalesce((select d.zona_horaria from public.gestionesjj_disponibilidad d limit 1), 'America/Guatemala'),
    (select d.consentimiento_texto from public.gestionesjj_disponibilidad d limit 1);
$$;

revoke execute on function public.gestionesjj_public_booking_info() from public;
grant execute on function public.gestionesjj_public_booking_info() to anon, authenticated;

-- ============================================================
-- RPC PUBLICA 3 (reemplazo): crear solicitud con pistas + consentimiento obligatorio
-- ============================================================
drop function if exists public.gestionesjj_public_solicitar_cita(text, text, text, text, timestamptz);

create or replace function public.gestionesjj_public_solicitar_cita(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_motivo text,
  p_inicio timestamptz,
  p_consentimiento boolean default false,
  p_ya_es_paciente boolean default false,
  p_primera_sesion boolean default false,
  p_dar_seguimiento boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg record;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_telefono text := btrim(coalesce(p_telefono, ''));
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_fin timestamptz;
  v_id uuid;
begin
  select * into cfg from public.gestionesjj_disponibilidad where agendamiento_publico limit 1;
  if cfg is null then
    raise exception 'El agendamiento en línea no está disponible.';
  end if;
  if not coalesce(p_consentimiento, false) then
    raise exception 'Debe aceptar el consentimiento informado para solicitar una cita.';
  end if;
  if v_nombre = '' or length(v_nombre) > 120 then
    raise exception 'Ingrese un nombre válido.';
  end if;
  if v_telefono = '' or length(v_telefono) > 30 then
    raise exception 'Ingrese un teléfono válido.';
  end if;
  if v_email is not null and (length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'Ingrese un correo electrónico válido.';
  end if;
  if v_motivo is not null and length(v_motivo) > 500 then
    raise exception 'El motivo es demasiado largo (máximo 500 caracteres).';
  end if;

  perform pg_advisory_xact_lock(hashtext('gestionesjj_solicitudes_cita'));

  if (
    select count(*) from public.gestionesjj_solicitudes_cita s
    where s.estado = 'pendiente'
      and (s.telefono = v_telefono or (v_email is not null and s.email = v_email))
  ) >= 3 then
    raise exception 'Ya tiene solicitudes pendientes. Espere la confirmación antes de agendar otra.';
  end if;
  if (
    select count(*) from public.gestionesjj_solicitudes_cita s
    where s.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Hay demasiadas solicitudes en este momento. Intente de nuevo más tarde.';
  end if;

  if not exists (
    select 1 from public.gestionesjj_public_slots(
      (p_inicio at time zone cfg.zona_horaria)::date,
      (p_inicio at time zone cfg.zona_horaria)::date
    ) s
    where s.inicio = p_inicio
  ) then
    raise exception 'Ese horario ya no está disponible. Por favor elija otro.';
  end if;

  v_fin := p_inicio + make_interval(mins => cfg.duracion_min);

  insert into public.gestionesjj_solicitudes_cita
    (nombre, telefono, email, motivo, inicio, fin,
     ya_es_paciente, primera_sesion, dar_seguimiento, consentimiento_texto)
  values
    (v_nombre, v_telefono, v_email, v_motivo, p_inicio, v_fin,
     coalesce(p_ya_es_paciente, false), coalesce(p_primera_sesion, false),
     coalesce(p_dar_seguimiento, false), cfg.consentimiento_texto)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.gestionesjj_public_solicitar_cita(text, text, text, text, timestamptz, boolean, boolean, boolean, boolean) from public;
grant execute on function public.gestionesjj_public_solicitar_cita(text, text, text, text, timestamptz, boolean, boolean, boolean, boolean) to anon, authenticated;

-- ============================================================
-- RPC OWNER (reemplazo): aprobar copia el consentimiento aceptado al paciente
-- ============================================================
create or replace function public.gestionesjj_aprobar_solicitud(
  p_solicitud_id uuid,
  p_paciente_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sol record;
  v_paciente uuid := p_paciente_id;
  v_cita uuid;
begin
  if not public.gestionesjj_is_owner() then
    raise exception 'No autorizado.';
  end if;

  select * into sol from public.gestionesjj_solicitudes_cita where id = p_solicitud_id for update;
  if sol is null then
    raise exception 'La solicitud no existe.';
  end if;
  if sol.estado <> 'pendiente' then
    raise exception 'La solicitud ya no está pendiente.';
  end if;

  if v_paciente is null then
    insert into public.gestionesjj_pacientes
      (nombre, telefono, email, motivo_consulta, consentimiento_texto, consentimiento_aceptado_at, created_by)
    values
      (sol.nombre, sol.telefono, sol.email, sol.motivo, sol.consentimiento_texto, sol.created_at, (select auth.uid()))
    returning id into v_paciente;
  elsif sol.consentimiento_texto is not null then
    update public.gestionesjj_pacientes
    set consentimiento_texto = sol.consentimiento_texto,
        consentimiento_aceptado_at = sol.created_at
    where id = v_paciente;
  end if;

  insert into public.gestionesjj_citas (paciente_id, inicio, fin, estado, origen, motivo, gcal_sync_status, created_by)
  values (v_paciente, sol.inicio, sol.fin, 'confirmada', 'publica', sol.motivo, 'pendiente', (select auth.uid()))
  returning id into v_cita;

  update public.gestionesjj_solicitudes_cita
  set estado = 'aprobada', paciente_id = v_paciente, cita_id = v_cita
  where id = p_solicitud_id;

  return v_cita;
end;
$$;

revoke execute on function public.gestionesjj_aprobar_solicitud(uuid, uuid) from public;
revoke execute on function public.gestionesjj_aprobar_solicitud(uuid, uuid) from anon;
grant execute on function public.gestionesjj_aprobar_solicitud(uuid, uuid) to authenticated;

-- ============================================================
-- RPC PUBLICA 4: leer la hoja de datos generales por token (solo campos descriptivos)
-- estado: 'ok' | 'completado' | 'invalido'
-- ============================================================
create or replace function public.gestionesjj_public_datos_get(p_token uuid)
returns table (
  estado text,
  nombre text,
  telefono text,
  email text,
  fecha_nacimiento date,
  genero text,
  ocupacion text,
  escolaridad text,
  estado_civil text,
  direccion text,
  emergencia_nombre text,
  emergencia_telefono text,
  emergencia_relacion text,
  motivo_consulta text,
  antecedentes_medicos text,
  antecedentes_psicologicos text,
  antecedentes_familiares text,
  medicacion_actual text,
  referido_por text
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
  emergencia_relacion := p.emergencia_relacion; motivo_consulta := p.motivo_consulta;
  antecedentes_medicos := p.antecedentes_medicos; antecedentes_psicologicos := p.antecedentes_psicologicos;
  antecedentes_familiares := p.antecedentes_familiares; medicacion_actual := p.medicacion_actual;
  referido_por := p.referido_por;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_datos_get(uuid) from public;
grant execute on function public.gestionesjj_public_datos_get(uuid) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA 5: guardar la hoja de datos generales por token
-- Solo actualiza campos descriptivos; jamas toca notas privadas ni estado.
-- ============================================================
create or replace function public.gestionesjj_public_datos_save(
  p_token uuid,
  p_nombre text,
  p_telefono text,
  p_email text,
  p_fecha_nacimiento date,
  p_genero text,
  p_ocupacion text,
  p_escolaridad text,
  p_estado_civil text,
  p_direccion text,
  p_emergencia_nombre text,
  p_emergencia_telefono text,
  p_emergencia_relacion text,
  p_motivo_consulta text,
  p_antecedentes_medicos text,
  p_antecedentes_psicologicos text,
  p_antecedentes_familiares text,
  p_medicacion_actual text,
  p_referido_por text
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
    motivo_consulta = nullif(btrim(coalesce(p_motivo_consulta, '')), ''),
    antecedentes_medicos = nullif(btrim(coalesce(p_antecedentes_medicos, '')), ''),
    antecedentes_psicologicos = nullif(btrim(coalesce(p_antecedentes_psicologicos, '')), ''),
    antecedentes_familiares = nullif(btrim(coalesce(p_antecedentes_familiares, '')), ''),
    medicacion_actual = nullif(btrim(coalesce(p_medicacion_actual, '')), ''),
    referido_por = nullif(btrim(coalesce(p_referido_por, '')), ''),
    datos_completados_at = now()
  where id = p.id;

  return 'guardado';
end;
$$;

revoke execute on function public.gestionesjj_public_datos_save(uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.gestionesjj_public_datos_save(uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
