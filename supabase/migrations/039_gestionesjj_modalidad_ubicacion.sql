-- /agendar: modalidad (presencial solo para Guatemala, o virtual) y la
-- opcion "Necesito la ubicacion" para las citas presenciales. Al llegar una
-- solicitud que pide ubicacion, el bot de Telegram lo avisa con un boton
-- para enviarle por WhatsApp la direccion con enlaces de Google Maps y Waze.
--
-- - gestionesjj_disponibilidad: direccion del consultorio y enlace de Maps
--   (opcional) para armar ese mensaje. Se editan en Clinica → Configuracion.
-- - gestionesjj_solicitudes_cita: modalidad y necesita_ubicacion.
-- - gestionesjj_public_solicitar_cita: dos parametros nuevos al final con
--   default (se reemplaza, no se sobrecarga, para que PostgREST no tenga dos
--   candidatas). Un llamado sin ellos (version anterior) sigue funcionando.
-- - gestionesjj_aprobar_solicitud: la cita creada toma la modalidad pedida.
-- Solo toca objetos del modulo Clinica.

alter table public.gestionesjj_disponibilidad
  add column if not exists direccion_consultorio text,
  add column if not exists ubicacion_maps_url text;

alter table public.gestionesjj_disponibilidad
  drop constraint if exists gestionesjj_disponibilidad_direccion_check;
alter table public.gestionesjj_disponibilidad
  add constraint gestionesjj_disponibilidad_direccion_check
  check (
    (direccion_consultorio is null or length(direccion_consultorio) <= 300)
    and (ubicacion_maps_url is null or (length(ubicacion_maps_url) <= 500 and ubicacion_maps_url ~ '^https://'))
  );

alter table public.gestionesjj_solicitudes_cita
  add column if not exists modalidad text,
  add column if not exists necesita_ubicacion boolean not null default false;

alter table public.gestionesjj_solicitudes_cita
  drop constraint if exists gestionesjj_solicitudes_modalidad_check;
alter table public.gestionesjj_solicitudes_cita
  add constraint gestionesjj_solicitudes_modalidad_check
  check (modalidad is null or modalidad in ('presencial', 'virtual'));

-- ============================================================
-- SOLICITAR CITA (publica)
-- ============================================================
drop function if exists public.gestionesjj_public_solicitar_cita(text, text, text, text, timestamptz, boolean, boolean, boolean, boolean);

create function public.gestionesjj_public_solicitar_cita(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_motivo text,
  p_inicio timestamptz,
  p_consentimiento boolean default false,
  p_ya_es_paciente boolean default false,
  p_primera_sesion boolean default false,
  p_dar_seguimiento boolean default false,
  p_modalidad text default null,
  p_necesita_ubicacion boolean default false
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
  v_modalidad text := nullif(lower(btrim(coalesce(p_modalidad, ''))), '');
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
  if v_modalidad is not null and v_modalidad not in ('presencial', 'virtual') then
    raise exception 'Elija si la cita es presencial o virtual.';
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
     ya_es_paciente, primera_sesion, dar_seguimiento, consentimiento_texto,
     modalidad, necesita_ubicacion)
  values
    (v_nombre, v_telefono, v_email, v_motivo, p_inicio, v_fin,
     coalesce(p_ya_es_paciente, false), coalesce(p_primera_sesion, false),
     coalesce(p_dar_seguimiento, false), cfg.consentimiento_texto,
     v_modalidad,
     -- La ubicacion solo tiene sentido en una cita presencial.
     coalesce(p_necesita_ubicacion, false) and v_modalidad = 'presencial')
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.gestionesjj_public_solicitar_cita(text, text, text, text, timestamptz, boolean, boolean, boolean, boolean, text, boolean) from public;
grant execute on function public.gestionesjj_public_solicitar_cita(text, text, text, text, timestamptz, boolean, boolean, boolean, boolean, text, boolean) to anon, authenticated;

-- ============================================================
-- APROBAR SOLICITUD (owner): la cita toma la modalidad pedida
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

  insert into public.gestionesjj_citas (paciente_id, inicio, fin, estado, origen, modalidad, motivo, gcal_sync_status, created_by)
  values (v_paciente, sol.inicio, sol.fin, 'confirmada', 'publica', coalesce(sol.modalidad, 'presencial'), sol.motivo, 'pendiente', (select auth.uid()))
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
