-- Reservas que llegan por Google Calendar desde otros sistemas de citas
-- (Calendly u otros): el job de recordatorios (pg_cron cada 10 min, migracion
-- 034) detecta los eventos que traen datos de un formulario de reserva, los
-- guarda aqui ya leidos (nombre, telefono, correo, motivo...) y el owner
-- decide, desde Telegram o desde Clinica → Solicitudes (lo primero que se
-- haga), si es un paciente existente, si hay que crearlo o si se ignora.
-- Al resolverse se crea la cita en la agenda de la clinica enlazada al mismo
-- evento de Google (sin duplicarlo).
--
-- Contiene datos clinicos: owner-lock para leer (el panel), sin grants para
-- anon, y toda escritura pasa por el servidor con service role.
-- Solo agrega objetos nuevos con prefijo gestionesjj_.

create table if not exists public.gestionesjj_google_reservas (
  id uuid primary key default gen_random_uuid(),
  -- "<calendario>:<id del evento>" en Google.
  evento_clave text not null unique,
  calendario_id text not null,
  evento_id text not null,
  calendario_principal boolean not null default true,
  inicio timestamptz not null,
  fin timestamptz not null,
  titulo text,
  tipo_evento text,
  nombre text,
  telefono text,
  email text,
  motivo text,
  notas text,
  consentimiento boolean not null default false,
  consentimiento_texto text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'procesando', 'vinculada', 'creada', 'ignorada', 'cancelada')),
  paciente_id uuid references public.gestionesjj_pacientes(id) on delete set null,
  cita_id uuid references public.gestionesjj_citas(id) on delete set null,
  -- Mensaje de Telegram con los botones, para actualizarlo si se resuelve desde el panel.
  telegram_message_id bigint,
  resuelto_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gestionesjj_google_reservas_estado_idx
  on public.gestionesjj_google_reservas (estado, inicio);
create index if not exists gestionesjj_google_reservas_paciente_idx
  on public.gestionesjj_google_reservas (paciente_id);
create index if not exists gestionesjj_google_reservas_cita_idx
  on public.gestionesjj_google_reservas (cita_id);

alter table public.gestionesjj_google_reservas enable row level security;
revoke all on public.gestionesjj_google_reservas from anon, authenticated;
grant select on public.gestionesjj_google_reservas to authenticated;

drop policy if exists "google_reservas_select_owner" on public.gestionesjj_google_reservas;
create policy "google_reservas_select_owner"
on public.gestionesjj_google_reservas
for select
to authenticated
using (public.gestionesjj_is_owner());

-- ============================================================
-- APROBAR SOLICITUD DE /agendar DESDE TELEGRAM VINCULANDO A UN PACIENTE
-- Igual que la version de 2 parametros (migracion 033) pero permite indicar
-- el paciente existente; null crea uno nuevo como antes.
-- ============================================================
create or replace function public.gestionesjj_telegram_aprobar_solicitud(
  p_solicitud_id uuid,
  p_owner_id uuid,
  p_paciente_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = p_owner_id;
  if v_email is null then
    raise exception 'No autorizado.';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_owner_id, 'email', v_email, 'role', 'authenticated')::text,
    true
  );

  return public.gestionesjj_aprobar_solicitud(p_solicitud_id, p_paciente_id);
end;
$$;

revoke execute on function public.gestionesjj_telegram_aprobar_solicitud(uuid, uuid, uuid) from public;
revoke execute on function public.gestionesjj_telegram_aprobar_solicitud(uuid, uuid, uuid) from anon;
revoke execute on function public.gestionesjj_telegram_aprobar_solicitud(uuid, uuid, uuid) from authenticated;
grant execute on function public.gestionesjj_telegram_aprobar_solicitud(uuid, uuid, uuid) to service_role;
