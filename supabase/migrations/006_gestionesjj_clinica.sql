-- Modulo Clinica: pacientes, sesiones, compromisos, citas, solicitudes publicas,
-- disponibilidad y tokens de Google Calendar.
--
-- Seguridad:
--  * Todas las tablas clinicas usan RLS con gestionesjj_is_owner() (igual que 002/003).
--  * anon NO tiene grants de tabla: el flujo publico de agendamiento pasa unicamente
--    por RPCs SECURITY DEFINER que devuelven solo rangos de tiempo o insertan
--    solicitudes validadas y con limites anti-abuso.
--  * gestionesjj_google_tokens tiene RLS activo sin politicas y revoke total:
--    solo el service role (que salta RLS) puede leerla o escribirla.

-- ============================================================
-- PACIENTES
-- ============================================================
create table if not exists public.gestionesjj_pacientes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  telefono text not null,
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
  referido_por text,
  notas_generales text,
  estado text not null default 'activo' check (estado in ('activo', 'inactivo', 'alta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CITAS
-- ============================================================
create table if not exists public.gestionesjj_citas (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paciente_id uuid references public.gestionesjj_pacientes(id) on delete set null,
  contacto_nombre text,
  contacto_telefono text,
  contacto_email text,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'confirmada'
    check (estado in ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio')),
  origen text not null default 'interna' check (origen in ('interna', 'publica')),
  modalidad text default 'presencial' check (modalidad in ('presencial', 'virtual')),
  motivo text,
  notas text,
  gcal_event_id text,
  gcal_sync_status text check (gcal_sync_status in ('sincronizada', 'pendiente', 'error', 'no_configurado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gestionesjj_citas_fin_despues_de_inicio check (fin > inicio),
  constraint gestionesjj_citas_tiene_destinatario check (paciente_id is not null or contacto_nombre is not null),
  -- Imposibilita la doble reserva a nivel de base de datos para citas activas.
  constraint gestionesjj_citas_sin_traslape exclude using gist
    (tstzrange(inicio, fin) with &&) where (estado in ('pendiente', 'confirmada'))
);

-- ============================================================
-- SESIONES
-- ============================================================
create table if not exists public.gestionesjj_sesiones (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  cita_id uuid references public.gestionesjj_citas(id) on delete set null,
  estado text not null default 'en_curso' check (estado in ('en_curso', 'finalizada')),
  modalidad text check (modalidad in ('seguimiento', 'tema_nuevo')),
  tema text,
  notas text,
  resumen text,
  seguimiento text,
  resumen_origen text check (resumen_origen in ('ia', 'manual')),
  iniciada_at timestamptz not null default now(),
  finalizada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COMPROMISOS Y TAREAS (filas individuales, checkeables entre sesiones)
-- ============================================================
create table if not exists public.gestionesjj_compromisos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sesion_id uuid not null references public.gestionesjj_sesiones(id) on delete cascade,
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  tipo text not null check (tipo in ('compromiso', 'tarea')),
  descripcion text not null,
  cumplido boolean not null default false,
  cumplido_en_sesion_id uuid references public.gestionesjj_sesiones(id) on delete set null,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SOLICITUDES DE CITA (pagina publica de agendamiento)
-- Sin created_by: las inserta la RPC security definer con rol anon.
-- ============================================================
create table if not exists public.gestionesjj_solicitudes_cita (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  email text,
  motivo text,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'rechazada', 'expirada')),
  paciente_id uuid references public.gestionesjj_pacientes(id) on delete set null,
  cita_id uuid references public.gestionesjj_citas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gestionesjj_solicitudes_fin_despues_de_inicio check (fin > inicio)
);

-- ============================================================
-- DISPONIBILIDAD (configuracion de fila unica)
-- horario_semanal: {"1":[{"inicio":"09:00","fin":"13:00"},...], ...} con dow 0-6
-- ============================================================
create table if not exists public.gestionesjj_disponibilidad (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  zona_horaria text not null default 'America/Guatemala',
  duracion_min integer not null default 50 check (duracion_min between 15 and 240),
  buffer_min integer not null default 10 check (buffer_min between 0 and 120),
  antelacion_min_horas integer not null default 12 check (antelacion_min_horas between 0 and 168),
  antelacion_max_dias integer not null default 30 check (antelacion_max_dias between 1 and 60),
  agendamiento_publico boolean not null default false,
  horario_semanal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TOKENS DE GOOGLE CALENDAR (solo service role)
-- ============================================================
create table if not exists public.gestionesjj_google_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null unique,
  google_email text,
  calendar_id text not null default 'primary',
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  estado text not null default 'conectado' check (estado in ('conectado', 'revocado', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INDICES
-- ============================================================
create index if not exists gestionesjj_pacientes_nombre_idx on public.gestionesjj_pacientes (lower(nombre));
create index if not exists gestionesjj_pacientes_estado_idx on public.gestionesjj_pacientes (estado);
create index if not exists gestionesjj_sesiones_paciente_idx on public.gestionesjj_sesiones (paciente_id, iniciada_at desc);
create index if not exists gestionesjj_compromisos_sesion_idx on public.gestionesjj_compromisos (sesion_id);
create index if not exists gestionesjj_compromisos_pendientes_idx on public.gestionesjj_compromisos (paciente_id) where not cumplido;
create index if not exists gestionesjj_citas_inicio_idx on public.gestionesjj_citas (inicio);
create index if not exists gestionesjj_citas_estado_idx on public.gestionesjj_citas (estado) where estado in ('pendiente', 'confirmada');
create index if not exists gestionesjj_solicitudes_estado_idx on public.gestionesjj_solicitudes_cita (estado, inicio);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_pacientes enable row level security;
alter table public.gestionesjj_citas enable row level security;
alter table public.gestionesjj_sesiones enable row level security;
alter table public.gestionesjj_compromisos enable row level security;
alter table public.gestionesjj_solicitudes_cita enable row level security;
alter table public.gestionesjj_disponibilidad enable row level security;
alter table public.gestionesjj_google_tokens enable row level security;

-- anon jamas toca tablas clinicas directamente (solo via RPC).
revoke all on public.gestionesjj_pacientes from anon;
revoke all on public.gestionesjj_citas from anon;
revoke all on public.gestionesjj_sesiones from anon;
revoke all on public.gestionesjj_compromisos from anon;
revoke all on public.gestionesjj_solicitudes_cita from anon;
revoke all on public.gestionesjj_disponibilidad from anon;

-- Tokens: inalcanzables desde cualquier cliente del navegador.
revoke all on public.gestionesjj_google_tokens from anon, authenticated;

grant select, insert, update, delete on public.gestionesjj_pacientes to authenticated;
grant select, insert, update, delete on public.gestionesjj_citas to authenticated;
grant select, insert, update, delete on public.gestionesjj_sesiones to authenticated;
grant select, insert, update, delete on public.gestionesjj_compromisos to authenticated;
grant select, update, delete on public.gestionesjj_solicitudes_cita to authenticated;
grant select, insert, update, delete on public.gestionesjj_disponibilidad to authenticated;

create policy "pacientes_select_owner" on public.gestionesjj_pacientes for select to authenticated using (public.gestionesjj_is_owner());
create policy "pacientes_insert_owner" on public.gestionesjj_pacientes for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "pacientes_update_owner" on public.gestionesjj_pacientes for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "pacientes_delete_owner" on public.gestionesjj_pacientes for delete to authenticated using (public.gestionesjj_is_owner());

create policy "citas_select_owner" on public.gestionesjj_citas for select to authenticated using (public.gestionesjj_is_owner());
create policy "citas_insert_owner" on public.gestionesjj_citas for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "citas_update_owner" on public.gestionesjj_citas for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "citas_delete_owner" on public.gestionesjj_citas for delete to authenticated using (public.gestionesjj_is_owner());

create policy "sesiones_select_owner" on public.gestionesjj_sesiones for select to authenticated using (public.gestionesjj_is_owner());
create policy "sesiones_insert_owner" on public.gestionesjj_sesiones for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "sesiones_update_owner" on public.gestionesjj_sesiones for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "sesiones_delete_owner" on public.gestionesjj_sesiones for delete to authenticated using (public.gestionesjj_is_owner());

create policy "compromisos_select_owner" on public.gestionesjj_compromisos for select to authenticated using (public.gestionesjj_is_owner());
create policy "compromisos_insert_owner" on public.gestionesjj_compromisos for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "compromisos_update_owner" on public.gestionesjj_compromisos for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "compromisos_delete_owner" on public.gestionesjj_compromisos for delete to authenticated using (public.gestionesjj_is_owner());

-- El owner nunca inserta solicitudes directamente (llegan via RPC anon).
create policy "solicitudes_select_owner" on public.gestionesjj_solicitudes_cita for select to authenticated using (public.gestionesjj_is_owner());
create policy "solicitudes_update_owner" on public.gestionesjj_solicitudes_cita for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "solicitudes_delete_owner" on public.gestionesjj_solicitudes_cita for delete to authenticated using (public.gestionesjj_is_owner());

create policy "disponibilidad_select_owner" on public.gestionesjj_disponibilidad for select to authenticated using (public.gestionesjj_is_owner());
create policy "disponibilidad_insert_owner" on public.gestionesjj_disponibilidad for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "disponibilidad_update_owner" on public.gestionesjj_disponibilidad for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "disponibilidad_delete_owner" on public.gestionesjj_disponibilidad for delete to authenticated using (public.gestionesjj_is_owner());

-- gestionesjj_google_tokens: sin politicas a proposito (solo service role).

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
drop trigger if exists gestionesjj_pacientes_set_updated_at on public.gestionesjj_pacientes;
create trigger gestionesjj_pacientes_set_updated_at before update on public.gestionesjj_pacientes for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_citas_set_updated_at on public.gestionesjj_citas;
create trigger gestionesjj_citas_set_updated_at before update on public.gestionesjj_citas for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_sesiones_set_updated_at on public.gestionesjj_sesiones;
create trigger gestionesjj_sesiones_set_updated_at before update on public.gestionesjj_sesiones for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_compromisos_set_updated_at on public.gestionesjj_compromisos;
create trigger gestionesjj_compromisos_set_updated_at before update on public.gestionesjj_compromisos for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_solicitudes_set_updated_at on public.gestionesjj_solicitudes_cita;
create trigger gestionesjj_solicitudes_set_updated_at before update on public.gestionesjj_solicitudes_cita for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_disponibilidad_set_updated_at on public.gestionesjj_disponibilidad;
create trigger gestionesjj_disponibilidad_set_updated_at before update on public.gestionesjj_disponibilidad for each row execute function public.gestionesjj_set_updated_at();

drop trigger if exists gestionesjj_google_tokens_set_updated_at on public.gestionesjj_google_tokens;
create trigger gestionesjj_google_tokens_set_updated_at before update on public.gestionesjj_google_tokens for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- RPC PUBLICA 1: informacion minima de agendamiento (sin datos sensibles)
-- ============================================================
create or replace function public.gestionesjj_public_booking_info()
returns table (activo boolean, duracion_min integer, zona_horaria text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select d.agendamiento_publico from public.gestionesjj_disponibilidad d limit 1), false),
    coalesce((select d.duracion_min from public.gestionesjj_disponibilidad d limit 1), 50),
    coalesce((select d.zona_horaria from public.gestionesjj_disponibilidad d limit 1), 'America/Guatemala');
$$;

revoke execute on function public.gestionesjj_public_booking_info() from public;
grant execute on function public.gestionesjj_public_booking_info() to anon, authenticated;

-- ============================================================
-- RPC PUBLICA 2: slots disponibles (solo rangos de tiempo, nunca datos de pacientes)
-- ============================================================
create or replace function public.gestionesjj_public_slots(p_desde date, p_hasta date)
returns table (inicio timestamptz, fin timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cfg record;
  v_desde date;
  v_hasta date;
  v_dia date;
  v_rango jsonb;
  v_ventana_inicio timestamptz;
  v_ventana_fin timestamptz;
  v_slot_inicio timestamptz;
  v_slot_fin timestamptz;
  v_paso interval;
  v_min_inicio timestamptz;
begin
  select * into cfg from public.gestionesjj_disponibilidad where agendamiento_publico limit 1;
  if cfg is null then
    return;
  end if;

  v_desde := greatest(p_desde, current_date);
  v_hasta := least(p_hasta, current_date + cfg.antelacion_max_dias, v_desde + 45);
  v_paso := make_interval(mins => cfg.duracion_min + cfg.buffer_min);
  v_min_inicio := now() + make_interval(hours => cfg.antelacion_min_horas);

  v_dia := v_desde;
  while v_dia <= v_hasta loop
    for v_rango in
      select value from jsonb_array_elements(
        coalesce(cfg.horario_semanal -> extract(dow from v_dia)::int::text, '[]'::jsonb)
      )
    loop
      -- Hora de pared del consultorio convertida a timestamptz en su zona horaria.
      v_ventana_inicio := (v_dia + (v_rango ->> 'inicio')::time) at time zone cfg.zona_horaria;
      v_ventana_fin := (v_dia + (v_rango ->> 'fin')::time) at time zone cfg.zona_horaria;
      v_slot_inicio := v_ventana_inicio;
      loop
        v_slot_fin := v_slot_inicio + make_interval(mins => cfg.duracion_min);
        exit when v_slot_fin > v_ventana_fin;
        if v_slot_inicio >= v_min_inicio
          and not exists (
            select 1 from public.gestionesjj_citas c
            where c.estado in ('pendiente', 'confirmada')
              and tstzrange(c.inicio, c.fin) && tstzrange(v_slot_inicio, v_slot_fin)
          )
          and not exists (
            select 1 from public.gestionesjj_solicitudes_cita s
            where s.estado = 'pendiente'
              and tstzrange(s.inicio, s.fin) && tstzrange(v_slot_inicio, v_slot_fin)
          )
        then
          inicio := v_slot_inicio;
          fin := v_slot_fin;
          return next;
        end if;
        v_slot_inicio := v_slot_inicio + v_paso;
      end loop;
    end loop;
    v_dia := v_dia + 1;
  end loop;
  return;
end;
$$;

revoke execute on function public.gestionesjj_public_slots(date, date) from public;
grant execute on function public.gestionesjj_public_slots(date, date) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA 3: crear solicitud de cita (validacion completa server-side)
-- ============================================================
create or replace function public.gestionesjj_public_solicitar_cita(
  p_nombre text,
  p_telefono text,
  p_email text,
  p_motivo text,
  p_inicio timestamptz
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

  -- Serializa solicitudes concurrentes para que la revalidacion del slot sea confiable.
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

  insert into public.gestionesjj_solicitudes_cita (nombre, telefono, email, motivo, inicio, fin)
  values (v_nombre, v_telefono, v_email, v_motivo, p_inicio, v_fin)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.gestionesjj_public_solicitar_cita(text, text, text, text, timestamptz) from public;
grant execute on function public.gestionesjj_public_solicitar_cita(text, text, text, text, timestamptz) to anon, authenticated;

-- ============================================================
-- RPC OWNER: aprobar solicitud de forma atomica
-- (security definer para poder tocar solicitudes + pacientes + citas juntas,
--  pero exige gestionesjj_is_owner y solo authenticated puede ejecutarla)
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
    insert into public.gestionesjj_pacientes (nombre, telefono, email, motivo_consulta, created_by)
    values (sol.nombre, sol.telefono, sol.email, sol.motivo, (select auth.uid()))
    returning id into v_paciente;
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
