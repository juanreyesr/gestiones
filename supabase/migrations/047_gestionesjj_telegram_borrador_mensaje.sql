-- Programar mensajes desde Telegram (/programar): el bot pregunta paso a paso
-- el numero, el mensaje y la hora, y antes de guardar muestra un resumen para
-- confirmar. Esta tabla guarda en que paso va la conversacion (una sola por
-- chat); al confirmar se crea la fila en gestionesjj_mensajes_programados
-- (migracion 046) y el borrador se borra. Un borrador sin movimiento por 30
-- minutos se descarta.
--
-- Solo el servidor (service role) la usa. Solo agrega objetos nuevos con
-- prefijo gestionesjj_.

create table if not exists public.gestionesjj_telegram_borrador_mensaje (
  chat_id bigint primary key,
  paso text not null check (paso in ('telefono', 'mensaje', 'hora', 'confirmar')),
  telefono text,
  mensaje text,
  programado_para timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.gestionesjj_telegram_borrador_mensaje enable row level security;
revoke all on public.gestionesjj_telegram_borrador_mensaje from anon, authenticated;
