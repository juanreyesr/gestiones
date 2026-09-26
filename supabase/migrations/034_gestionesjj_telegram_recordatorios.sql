-- Recordatorios de cita por Telegram: un aviso al owner 1 hora antes de cada
-- cita, con boton para mandarle el recordatorio al paciente por WhatsApp.
--
-- Vercel Hobby solo permite cron diario, asi que el disparador cada 10
-- minutos vive aqui: pg_cron (ya usado por gestionesjj_autoinactivar_diario)
-- + pg_net llaman a POST /api/telegram/recordatorios con
-- Authorization: Bearer <CRON_SECRET>.
--
-- REQUISITO MANUAL: el valor de CRON_SECRET (el mismo de Vercel) debe
-- guardarse en Supabase Vault con el nombre 'gestionesjj_cron_secret'
-- (Dashboard → Project Settings → Vault → Add new secret). Mientras no
-- exista, la llamada sale sin token, la ruta responde 401 y no pasa nada.
--
-- Solo agrega objetos nuevos con prefijo gestionesjj_ (y habilita pg_net).

create extension if not exists pg_net;

-- ============================================================
-- REGISTRO DE RECORDATORIOS ENVIADOS (uno por cita y horario: si la cita
-- se reprograma, se vuelve a avisar)
-- ============================================================
create table if not exists public.gestionesjj_telegram_recordatorios (
  cita_id uuid not null references public.gestionesjj_citas(id) on delete cascade,
  inicio timestamptz not null,
  enviado_en timestamptz not null default now(),
  primary key (cita_id, inicio)
);

create index if not exists gestionesjj_telegram_recordatorios_inicio_idx
  on public.gestionesjj_telegram_recordatorios (inicio);

alter table public.gestionesjj_telegram_recordatorios enable row level security;
revoke all on public.gestionesjj_telegram_recordatorios from anon, authenticated;

-- ============================================================
-- CRON: cada 10 minutos
-- ============================================================
select cron.unschedule(jobid) from cron.job where jobname = 'gestionesjj_recordatorios_citas';

select cron.schedule(
  'gestionesjj_recordatorios_citas',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := 'https://gestionesjj.vercel.app/api/telegram/recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'gestionesjj_cron_secret'),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $cron$
);
