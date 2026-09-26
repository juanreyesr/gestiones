-- Recordatorio automatico de citas por WhatsApp (WhatsApp Business Platform,
-- Cloud API) con botones "Confirmo" / "Necesito reprogramar".
--
-- El envio lo hace el mismo job de pg_cron de la migracion 034 (cada 10
-- minutos, POST /api/telegram/recordatorios). Las respuestas y los estados de
-- entrega llegan al webhook /api/whatsapp/webhook. Todo queda apagado
-- mientras no existan las variables WHATSAPP_* en Vercel.
--
-- Solo agrega objetos nuevos con prefijo gestionesjj_ (y una columna).

-- Por paciente: si recibe o no el recordatorio automatico.
alter table public.gestionesjj_pacientes
  add column if not exists whatsapp_recordatorios boolean not null default true;

-- ============================================================
-- REGISTRO DE MENSAJES (uno por cita y horario: si la cita se reprograma,
-- se vuelve a recordar)
-- ============================================================
create table if not exists public.gestionesjj_whatsapp_mensajes (
  id uuid primary key default gen_random_uuid(),
  cita_id uuid not null references public.gestionesjj_citas(id) on delete cascade,
  inicio timestamptz not null,
  telefono text not null,
  wa_message_id text,
  estado text not null default 'enviando'
    check (estado in ('enviando', 'enviado', 'entregado', 'leido', 'fallido')),
  error text,
  respuesta text check (respuesta is null or respuesta in ('confirmar', 'reprogramar')),
  respondido_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cita_id, inicio)
);

create unique index if not exists gestionesjj_whatsapp_mensajes_wa_id_idx
  on public.gestionesjj_whatsapp_mensajes (wa_message_id) where wa_message_id is not null;

alter table public.gestionesjj_whatsapp_mensajes enable row level security;
revoke all on public.gestionesjj_whatsapp_mensajes from anon, authenticated;
-- El owner puede consultar el estado desde la agenda; solo el servidor escribe.
grant select on public.gestionesjj_whatsapp_mensajes to authenticated;
create policy "whatsapp_mensajes_select_owner" on public.gestionesjj_whatsapp_mensajes
  for select to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_whatsapp_mensajes_set_updated_at on public.gestionesjj_whatsapp_mensajes;
create trigger gestionesjj_whatsapp_mensajes_set_updated_at
  before update on public.gestionesjj_whatsapp_mensajes
  for each row execute function public.gestionesjj_set_updated_at();
