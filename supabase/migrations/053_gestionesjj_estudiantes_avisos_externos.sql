-- Avisos del Aula virtual fuera de la plataforma: Telegram (bot propio de
-- estudiantes, distinto del bot privado del owner) y notificaciones push
-- del navegador. Solo lo del curso del estudiante: mensajes del docente,
-- semana nueva, tarea publicada, calificacion y fechas de vencimiento.
--
-- - Todas las tablas son solo de servidor (service role): RLS activado sin
--   policies, nadie las lee ni escribe desde el navegador.
-- - Las notificaciones que ya generan los triggers (migracion 027) se
--   reenvian con /api/estudiantes/avisos, que corre cada minuto (pg_cron).
-- - Al cerrar el curso (archivado o sin acceso) o retirar al estudiante, la
--   ruta deja de enviarle avisos y, si ya no tiene cursos activos, cierra su
--   vinculo de Telegram y borra sus suscripciones push.

-- Configuracion del bot de estudiantes y llaves VAPID (una sola fila).
create table if not exists public.gestionesjj_estudiantes_avisos_config (
  id boolean primary key default true check (id),
  bot_token text,
  bot_username text,
  webhook_secret text,
  vapid_public text,
  vapid_private text,
  updated_at timestamptz not null default now()
);

-- Vinculo estudiante <-> chat de Telegram (codigo de un solo uso mientras se vincula).
create table if not exists public.gestionesjj_estudiante_telegram (
  estudiante_id uuid primary key references public.gestionesjj_estudiantes(id) on delete cascade,
  chat_id bigint unique,
  codigo_hash text unique,
  codigo_expira timestamptz,
  vinculado_en timestamptz,
  created_at timestamptz not null default now()
);

-- Suscripciones push (una por navegador o telefono).
create table if not exists public.gestionesjj_estudiante_push (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.gestionesjj_estudiantes(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists gestionesjj_estudiante_push_estudiante_idx on public.gestionesjj_estudiante_push (estudiante_id);

-- Recordatorios de fecha de vencimiento ya avisados (uno por tarea y estudiante).
create table if not exists public.gestionesjj_estudiante_vencimientos_avisados (
  actividad_id uuid not null references public.gestionesjj_curso_actividades(id) on delete cascade,
  estudiante_id uuid not null references public.gestionesjj_estudiantes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (actividad_id, estudiante_id)
);

alter table public.gestionesjj_estudiantes_avisos_config enable row level security;
alter table public.gestionesjj_estudiante_telegram enable row level security;
alter table public.gestionesjj_estudiante_push enable row level security;
alter table public.gestionesjj_estudiante_vencimientos_avisados enable row level security;
revoke all on public.gestionesjj_estudiantes_avisos_config from anon, authenticated;
revoke all on public.gestionesjj_estudiante_telegram from anon, authenticated;
revoke all on public.gestionesjj_estudiante_push from anon, authenticated;
revoke all on public.gestionesjj_estudiante_vencimientos_avisados from anon, authenticated;

-- Notificaciones: marca de reenvio externo y nuevo tipo "vencimiento".
alter table public.gestionesjj_estudiante_notificaciones
  add column if not exists externo_enviado_at timestamptz;
-- Las notificaciones anteriores no se reenvian.
update public.gestionesjj_estudiante_notificaciones set externo_enviado_at = created_at where externo_enviado_at is null;
create index if not exists gestionesjj_estudiante_notificaciones_pendientes_idx
  on public.gestionesjj_estudiante_notificaciones (created_at) where externo_enviado_at is null;

alter table public.gestionesjj_estudiante_notificaciones
  drop constraint if exists gestionesjj_estudiante_notificaciones_tipo_check;
alter table public.gestionesjj_estudiante_notificaciones
  add constraint gestionesjj_estudiante_notificaciones_tipo_check
  check (tipo in ('contenido', 'tarea', 'calificacion', 'mensaje', 'vencimiento'));

-- CRON: cada minuto. La ruta sale de inmediato si no hay nada que enviar.
select cron.unschedule(jobid) from cron.job where jobname = 'gestionesjj_estudiantes_avisos';

select cron.schedule(
  'gestionesjj_estudiantes_avisos',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://www.juanjreyes.org/api/estudiantes/avisos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'gestionesjj_cron_secret'),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);
