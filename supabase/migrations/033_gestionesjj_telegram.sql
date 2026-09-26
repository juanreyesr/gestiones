-- Conexion con Telegram: un bot privado que avisa al owner de lo que pasa en
-- la plataforma (solicitudes de cita, mensajes y entregas de estudiantes...)
-- y le permite actuar desde el chat (aprobar citas, contestar mensajes,
-- marcar pendientes, crear pendientes nuevos).
--
-- Todo lo de Telegram lo maneja el servidor con service role: estas tablas
-- tienen RLS activado y NINGUNA politica, asi que ni anon ni authenticated
-- pueden leerlas ni escribirlas (igual que gestionesjj_google_tokens). Solo
-- agrega objetos nuevos con el prefijo gestionesjj_telegram: no toca nada de
-- las demas apps de la BD compartida.

-- ============================================================
-- CONFIGURACION (fila unica)
-- ============================================================
create table if not exists public.gestionesjj_telegram_config (
  id smallint primary key default 1 check (id = 1),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- Chat privado vinculado. Solo este chat puede darle ordenes al bot.
  chat_id bigint,
  chat_nombre text,
  vinculado_en timestamptz,
  -- Codigo de un solo uso para vincular (se guarda solo su SHA-256).
  codigo_hash text,
  codigo_expira timestamptz,
  -- {"citas_solicitudes": true, "estudiantes_mensajes": true, ...}; las
  -- llaves que falten toman el valor por defecto definido en el codigo.
  preferencias jsonb not null default '{}'::jsonb,
  ultimo_resumen date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gestionesjj_telegram_config enable row level security;
revoke all on public.gestionesjj_telegram_config from anon, authenticated;

-- ============================================================
-- HILOS: enlaza un mensaje que el bot mando con el registro de la app que lo
-- origino, para que "responder" a ese mensaje en Telegram sepa a quien va
-- (p. ej. contestarle a un estudiante desde el chat).
-- ============================================================
create table if not exists public.gestionesjj_telegram_hilos (
  chat_id bigint not null,
  message_id bigint not null,
  tipo text not null check (tipo in ('mensaje_estudiante')),
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (chat_id, message_id)
);

create index if not exists gestionesjj_telegram_hilos_created_idx
  on public.gestionesjj_telegram_hilos (created_at);

alter table public.gestionesjj_telegram_hilos enable row level security;
revoke all on public.gestionesjj_telegram_hilos from anon, authenticated;

-- ============================================================
-- APROBAR SOLICITUD DE CITA DESDE TELEGRAM
-- gestionesjj_aprobar_solicitud exige que el JWT sea del owner. El servidor
-- llama con service role (sin correo en el JWT), asi que este envoltorio
-- fija los claims del owner solo durante esta transaccion y delega en la
-- funcion original: la logica de aprobar (crear paciente, copiar el
-- consentimiento, crear la cita) sigue viviendo en un solo lugar.
-- Solo service_role puede ejecutarlo.
-- ============================================================
create or replace function public.gestionesjj_telegram_aprobar_solicitud(
  p_solicitud_id uuid,
  p_owner_id uuid
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

  -- La funcion original vuelve a verificar gestionesjj_is_owner(): si
  -- p_owner_id no es el owner, falla con 'No autorizado.'.
  return public.gestionesjj_aprobar_solicitud(p_solicitud_id, null);
end;
$$;

revoke execute on function public.gestionesjj_telegram_aprobar_solicitud(uuid, uuid) from public;
revoke execute on function public.gestionesjj_telegram_aprobar_solicitud(uuid, uuid) from anon;
revoke execute on function public.gestionesjj_telegram_aprobar_solicitud(uuid, uuid) from authenticated;
grant execute on function public.gestionesjj_telegram_aprobar_solicitud(uuid, uuid) to service_role;
