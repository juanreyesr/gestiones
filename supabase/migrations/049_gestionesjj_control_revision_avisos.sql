-- Avisos por Telegram del control de revision de evaluaciones (migracion 048).
-- A las 7:00 p. m. de Guatemala del dia limite, y del lunes siguiente, llega a
-- Telegram un mensaje por docente con el boton de WhatsApp listo: recordatorio
-- si tiene evaluaciones pendientes y felicitacion si entrego todo a tiempo (el
-- lunes solo recordatorios). La logica vive en
-- src/lib/server/control-revision-avisos.ts.
--
-- Solo agrega columnas y un job nuevos. Reutiliza pg_cron, pg_net y el secreto
-- 'gestionesjj_cron_secret' de la migracion 034.

alter table public.gestionesjj_control_revision_periodos
  add column if not exists aviso_limite_at timestamptz,
  add column if not exists aviso_lunes_at timestamptz;

-- Si cambia la fecha limite, los avisos vuelven a quedar pendientes.
create or replace function public.gestionesjj_control_revision_reiniciar_avisos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.fecha_limite is distinct from old.fecha_limite then
    new.aviso_limite_at := null;
    new.aviso_lunes_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists gestionesjj_control_revision_reiniciar_avisos on public.gestionesjj_control_revision_periodos;
create trigger gestionesjj_control_revision_reiniciar_avisos
  before update on public.gestionesjj_control_revision_periodos
  for each row execute function public.gestionesjj_control_revision_reiniciar_avisos();

-- ============================================================
-- CRON: 01:00 UTC = 7:00 p. m. en Guatemala (UTC-6 todo el ano). La ruta sale
-- de inmediato si hoy no es fecha limite ni lunes siguiente de ningun periodo.
-- ============================================================
select cron.unschedule(jobid) from cron.job where jobname = 'gestionesjj_control_revision_avisos';

select cron.schedule(
  'gestionesjj_control_revision_avisos',
  '0 1 * * *',
  $cron$
  select net.http_post(
    url := 'https://www.juanjreyes.org/api/telegram/control-revision',
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
