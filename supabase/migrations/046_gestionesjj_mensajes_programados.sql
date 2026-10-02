-- Mensajes programados (Gestión de pendientes): el owner deja escrito un
-- mensaje de WhatsApp con el numero del destinatario y la hora; a esa hora el
-- bot de Telegram le manda un boton que abre WhatsApp con ese numero y el
-- mensaje listo. El envio lo hace el owner al tocar el boton (no es automatico).
--
-- Disparador: pg_cron cada minuto, pero solo llama a
-- POST /api/telegram/mensajes-programados cuando hay algun mensaje vencido sin
-- avisar, asi no se gasta una invocacion de Vercel por minuto. Reutiliza
-- pg_net y el secreto 'gestionesjj_cron_secret' de la migracion 034.
--
-- Solo agrega objetos nuevos con prefijo gestionesjj_.

create table if not exists public.gestionesjj_mensajes_programados (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  telefono text not null check (length(btrim(telefono)) between 6 and 30),
  mensaje text not null check (length(btrim(mensaje)) between 1 and 2000),
  programado_para timestamptz not null,
  -- Momento en que se mando el boton a Telegram (null = todavia no).
  avisado_at timestamptz,
  -- Intentos fallidos de aviso (Telegram caido o sin vincular): se reintenta
  -- cada minuto hasta 5 veces y luego queda con el error a la vista.
  intentos integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gestionesjj_mensajes_programados_pendientes_idx
  on public.gestionesjj_mensajes_programados (programado_para) where avisado_at is null;

alter table public.gestionesjj_mensajes_programados enable row level security;
revoke all on public.gestionesjj_mensajes_programados from anon;
grant select, insert, update, delete on public.gestionesjj_mensajes_programados to authenticated;

drop policy if exists "mensajes_programados_select_owner" on public.gestionesjj_mensajes_programados;
create policy "mensajes_programados_select_owner" on public.gestionesjj_mensajes_programados
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "mensajes_programados_insert_owner" on public.gestionesjj_mensajes_programados;
create policy "mensajes_programados_insert_owner" on public.gestionesjj_mensajes_programados
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "mensajes_programados_update_owner" on public.gestionesjj_mensajes_programados;
create policy "mensajes_programados_update_owner" on public.gestionesjj_mensajes_programados
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "mensajes_programados_delete_owner" on public.gestionesjj_mensajes_programados;
create policy "mensajes_programados_delete_owner" on public.gestionesjj_mensajes_programados
  for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_mensajes_programados_set_updated_at on public.gestionesjj_mensajes_programados;
create trigger gestionesjj_mensajes_programados_set_updated_at
  before update on public.gestionesjj_mensajes_programados
  for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- CRON: cada minuto, solo si hay mensajes vencidos sin avisar (y con
-- intentos disponibles)
-- ============================================================
select cron.unschedule(jobid) from cron.job where jobname = 'gestionesjj_mensajes_programados';

select cron.schedule(
  'gestionesjj_mensajes_programados',
  '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://www.juanjreyes.org/api/telegram/mensajes-programados',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'gestionesjj_cron_secret'),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  )
  where exists (
    select 1 from public.gestionesjj_mensajes_programados
    where avisado_at is null and intentos < 5 and programado_para <= now()
  );
  $cron$
);
