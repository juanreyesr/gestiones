-- Avisos por Telegram 1 hora antes de los compromisos de Google Calendar
-- (eventos de cualquier calendario visible del owner que no son citas de la
-- clinica). Los dispara el mismo job de pg_cron de la migracion 034.
--
-- Registro de avisos enviados: uno por evento y horario (si el evento se
-- mueve, se vuelve a avisar). La clave es "<calendario>:<id del evento>" de
-- Google; no hay FK porque los eventos viven fuera de la BD.
-- Solo agrega un objeto nuevo con prefijo gestionesjj_.

create table if not exists public.gestionesjj_telegram_recordatorios_google (
  evento_clave text not null,
  inicio timestamptz not null,
  enviado_en timestamptz not null default now(),
  primary key (evento_clave, inicio)
);

create index if not exists gestionesjj_telegram_recordatorios_google_inicio_idx
  on public.gestionesjj_telegram_recordatorios_google (inicio);

alter table public.gestionesjj_telegram_recordatorios_google enable row level security;
revoke all on public.gestionesjj_telegram_recordatorios_google from anon, authenticated;
