-- Bitacora de las predicas del mes (area Iglesia).
--
-- El calendario de predicas se arma aqui, en GestionesJJ, pero desde octubre
-- de 2026 tambien lo ve el sistema de CCI Chimaltenango (comparten este mismo
-- proyecto de Supabase): todos los pastores lo consultan en "Predicas del mes"
-- y en el bot de Telegram, y los superadministradores de CCI asignan los
-- CIERRES de cada celebracion. Aqui se llenan los predicadores y alla los
-- cierres.
--
-- Para que un cierre que cambio desde CCI no aparezca "de la nada" en la
-- pantalla de predicas, cada cambio queda anotado en esta bitacora con quien lo
-- hizo y desde donde. Las filas las escribe la funcion de CCI
-- (cci_chimaltenango_set_sunday_closing, security definer); aqui solo se leen.
--
-- Seguridad: lectura solo para la cuenta duena (gestionesjj_is_owner), sin
-- politicas de escritura: nadie escribe directo desde el navegador.

create table if not exists public.gestionesjj_iglesia_predicas_bitacora (
  id uuid primary key default gen_random_uuid(),
  mes_id uuid not null references public.gestionesjj_iglesia_predicas_meses(id) on delete cascade,
  -- Si la celebracion se borra (al eliminar el mes se va todo por el cascade
  -- de arriba), el renglon conserva la fecha y el horario.
  asignacion_id uuid references public.gestionesjj_iglesia_predicas_asignaciones(id) on delete set null,
  fecha date not null,
  horario text not null,
  campo text not null check (campo in ('cierre')),
  valor_anterior text,
  valor_nuevo text,
  origen text not null check (origen in ('gestiones', 'cci')),
  autor text,
  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_iglesia_predicas_bitacora_mes_idx
  on public.gestionesjj_iglesia_predicas_bitacora (mes_id, created_at desc);

alter table public.gestionesjj_iglesia_predicas_bitacora enable row level security;

drop policy if exists gestionesjj_iglesia_predicas_bitacora_select_owner on public.gestionesjj_iglesia_predicas_bitacora;
create policy gestionesjj_iglesia_predicas_bitacora_select_owner
  on public.gestionesjj_iglesia_predicas_bitacora
  for select to authenticated
  using (public.gestionesjj_is_owner());

revoke all on table public.gestionesjj_iglesia_predicas_bitacora from anon;
