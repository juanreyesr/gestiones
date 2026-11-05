-- Consentimiento informado editable desde Clínica → Configuración.
--
-- - Cada vez que el psicólogo guarda la plantilla se inserta una versión nueva
--   (no se actualiza ni se borra: queda el historial de cambios por normativa).
--   La más reciente es la vigente.
-- - La versión 1 es la plantilla inicial que trae el código
--   (PLANTILLA_INICIAL en src/lib/clinica/consentimiento.ts); por eso el
--   correlativo de la tabla empieza en 2. Con la tabla vacía se usa la inicial.
-- - Lectura pública solo de la versión vigente, mediante una RPC: es el mismo
--   texto que ve el paciente en /datos/<token>.

create table if not exists public.gestionesjj_consentimiento_plantillas (
  numero integer generated always as identity (start with 2) primary key,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profesional text not null check (length(profesional) between 1 and 120),
  secciones jsonb not null check (
    jsonb_typeof(secciones) = 'array'
    and jsonb_array_length(secciones) between 1 and 40
    and octet_length(secciones::text) <= 100000
  ),
  nota text check (nota is null or length(nota) <= 300),
  created_at timestamptz not null default now()
);

alter table public.gestionesjj_consentimiento_plantillas enable row level security;
revoke all on public.gestionesjj_consentimiento_plantillas from anon;
revoke all on public.gestionesjj_consentimiento_plantillas from authenticated;
grant select, insert on public.gestionesjj_consentimiento_plantillas to authenticated;

drop policy if exists "consentimiento_plantillas_select_owner" on public.gestionesjj_consentimiento_plantillas;
create policy "consentimiento_plantillas_select_owner" on public.gestionesjj_consentimiento_plantillas
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "consentimiento_plantillas_insert_owner" on public.gestionesjj_consentimiento_plantillas;
create policy "consentimiento_plantillas_insert_owner" on public.gestionesjj_consentimiento_plantillas
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);

-- Versión vigente (sin filas: el formulario usa la plantilla inicial del código).
create or replace function public.gestionesjj_public_consentimiento_plantilla()
returns table (version text, profesional text, secciones jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select p.numero::text, p.profesional, p.secciones
  from public.gestionesjj_consentimiento_plantillas p
  order by p.numero desc
  limit 1;
$$;

revoke execute on function public.gestionesjj_public_consentimiento_plantilla() from public;
grant execute on function public.gestionesjj_public_consentimiento_plantilla() to anon, authenticated;
