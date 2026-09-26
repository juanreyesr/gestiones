-- Programacion de supervisiones: fechas del periodo en la base y recordatorio
-- por Telegram 5 minutos antes de cada supervision.
--
-- El plan de supervisiones no se guarda: se calcula a partir de los cursos,
-- las evaluaciones y las fechas del periodo (src/lib/supervision.ts). Hasta
-- ahora esas fechas vivian en el navegador; para que el servidor pueda
-- calcular el mismo plan y avisar a tiempo, pasan a esta tabla.
--
-- Solo agrega objetos nuevos con prefijo gestionesjj_. Reutiliza pg_cron,
-- pg_net y el secreto 'gestionesjj_cron_secret' de la migracion 034.

-- ============================================================
-- FECHAS DEL PERIODO (una fila por año y trimestre)
-- ============================================================
create table if not exists public.gestionesjj_supervision_periodos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio integer not null check (anio between 2020 and 2100),
  trimestre integer not null check (trimestre between 1 and 3),
  inicio_clases date not null,
  inicio_plan date not null,
  fin date not null,
  semana_parcial integer check (semana_parcial is null or semana_parcial between 1 and 60),
  updated_at timestamptz not null default now(),
  unique (created_by, anio, trimestre),
  check (inicio_clases <= fin)
);

alter table public.gestionesjj_supervision_periodos enable row level security;
grant select, insert, update, delete on public.gestionesjj_supervision_periodos to authenticated;

create policy "supervision_periodos_select_owner" on public.gestionesjj_supervision_periodos
  for select to authenticated using (public.gestionesjj_is_owner());
create policy "supervision_periodos_insert_owner" on public.gestionesjj_supervision_periodos
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "supervision_periodos_update_owner" on public.gestionesjj_supervision_periodos
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "supervision_periodos_delete_owner" on public.gestionesjj_supervision_periodos
  for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_supervision_periodos_set_updated_at on public.gestionesjj_supervision_periodos;
create trigger gestionesjj_supervision_periodos_set_updated_at
  before update on public.gestionesjj_supervision_periodos
  for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- REGISTRO DE RECORDATORIOS ENVIADOS (uno por curso y horario)
-- ============================================================
create table if not exists public.gestionesjj_telegram_recordatorios_supervision (
  curso_id uuid not null references public.gestionesjj_cursos(id) on delete cascade,
  inicio timestamptz not null,
  enviado_en timestamptz not null default now(),
  primary key (curso_id, inicio)
);

create index if not exists gestionesjj_telegram_recordatorios_supervision_inicio_idx
  on public.gestionesjj_telegram_recordatorios_supervision (inicio);

alter table public.gestionesjj_telegram_recordatorios_supervision enable row level security;
revoke all on public.gestionesjj_telegram_recordatorios_supervision from anon, authenticated;

-- ============================================================
-- CRON: cada minuto (el aviso es 5 minutos antes; con el cron de 10
-- minutos de la 034 podria llegar hasta 15 minutos antes o tarde).
-- La ruta sale de inmediato si hoy no hay supervisiones.
-- ============================================================
select cron.unschedule(jobid) from cron.job where jobname = 'gestionesjj_recordatorios_supervision';

select cron.schedule(
  'gestionesjj_recordatorios_supervision',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://www.juanjreyes.org/api/telegram/supervisiones',
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
