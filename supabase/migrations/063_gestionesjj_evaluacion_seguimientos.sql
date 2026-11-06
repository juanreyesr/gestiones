-- Seguimiento programado de evaluaciones.
--
-- El psicólogo programa que un instrumento (con sus escalas) se repita cada N
-- días. Cuando llega la fecha (pg_cron revisa cada hora, de 8:00 a 20:00 de
-- Guatemala), /api/telegram/seguimientos:
--   - si el enlace anterior ya se respondió (o no hay), crea un enlace nuevo y
--     avanza la próxima fecha;
--   - si el enlace anterior sigue sin responder, NO crea otro: manda un
--     recordatorio con el mismo enlace y vuelve a revisar en 3 días;
-- y en ambos casos avisa por Telegram con un botón que abre WhatsApp con el
-- mensaje para el paciente (o su padre/madre) ya escrito, incluido el enlace.
-- Si Telegram falla, el aviso queda pendiente (pendiente_evaluacion_id) y se
-- reintenta cada hora hasta 5 veces sin crear enlaces de más.

create table if not exists public.gestionesjj_evaluacion_seguimientos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  instrumento text not null check (instrumento ~ '^[a-z0-9-]{2,40}$'),
  opciones jsonb not null default '{}'::jsonb check (jsonb_typeof(opciones) = 'object'),
  etiqueta text check (etiqueta is null or length(etiqueta) <= 60),
  cada_dias integer not null check (cada_dias between 7 and 180),
  proxima_fecha date not null,
  activo boolean not null default true,
  ultima_evaluacion_id uuid references public.gestionesjj_evaluaciones(id) on delete set null,
  pendiente_evaluacion_id uuid references public.gestionesjj_evaluaciones(id) on delete set null,
  pendiente_tipo text check (pendiente_tipo is null or pendiente_tipo in ('nuevo', 'recordatorio')),
  ultimo_aviso_at timestamptz,
  avisos integer not null default 0,
  intentos integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gestionesjj_evaluacion_seguimientos_paciente_idx
  on public.gestionesjj_evaluacion_seguimientos (paciente_id, created_at desc);
create index if not exists gestionesjj_evaluacion_seguimientos_vencidos_idx
  on public.gestionesjj_evaluacion_seguimientos (proxima_fecha) where activo;

alter table public.gestionesjj_evaluacion_seguimientos enable row level security;
revoke all on public.gestionesjj_evaluacion_seguimientos from anon;
grant select, insert, update, delete on public.gestionesjj_evaluacion_seguimientos to authenticated;

drop policy if exists "evaluacion_seguimientos_select_owner" on public.gestionesjj_evaluacion_seguimientos;
create policy "evaluacion_seguimientos_select_owner" on public.gestionesjj_evaluacion_seguimientos
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "evaluacion_seguimientos_insert_owner" on public.gestionesjj_evaluacion_seguimientos;
create policy "evaluacion_seguimientos_insert_owner" on public.gestionesjj_evaluacion_seguimientos
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "evaluacion_seguimientos_update_owner" on public.gestionesjj_evaluacion_seguimientos;
create policy "evaluacion_seguimientos_update_owner" on public.gestionesjj_evaluacion_seguimientos
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "evaluacion_seguimientos_delete_owner" on public.gestionesjj_evaluacion_seguimientos;
create policy "evaluacion_seguimientos_delete_owner" on public.gestionesjj_evaluacion_seguimientos
  for delete to authenticated using (public.gestionesjj_is_owner());

drop trigger if exists gestionesjj_evaluacion_seguimientos_set_updated_at on public.gestionesjj_evaluacion_seguimientos;
create trigger gestionesjj_evaluacion_seguimientos_set_updated_at
  before update on public.gestionesjj_evaluacion_seguimientos
  for each row execute function public.gestionesjj_set_updated_at();

-- ¿Hay algún seguimiento por avisar ahora? (lo usa el cron para no llamar en vano)
create or replace function public.gestionesjj_seguimientos_por_avisar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select extract(hour from now() at time zone 'America/Guatemala') between 8 and 20
     and exists (
       select 1 from public.gestionesjj_evaluacion_seguimientos s
       where s.activo and s.intentos < 5
         and (s.pendiente_evaluacion_id is not null
              or s.proxima_fecha <= (now() at time zone 'America/Guatemala')::date)
     );
$$;
revoke execute on function public.gestionesjj_seguimientos_por_avisar() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'gestionesjj_evaluacion_seguimientos';

select cron.schedule(
  'gestionesjj_evaluacion_seguimientos',
  '7 * * * *',
  $cron$
  select net.http_post(
    url := 'https://www.juanjreyes.org/api/telegram/seguimientos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'gestionesjj_cron_secret'),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  )
  where public.gestionesjj_seguimientos_por_avisar();
  $cron$
);
