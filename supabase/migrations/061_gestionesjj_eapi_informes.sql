-- EAPI versión JJ (Batería AEI) y notas / informe al paciente de las evaluaciones.
--
-- - gestionesjj_evaluaciones.opciones (jsonb): opciones del instrumento por
--   enlace; para EAPI {"docs": true} incluye el módulo TOC (DOCS). La RPC
--   pública las devuelve para que el formulario muestre los bloques correctos.
-- - gestionesjj_evaluacion_informes: una fila por respuesta con las notas
--   privadas del psicólogo, sus notas para el paciente, las opciones del
--   informe y, al publicarlo, una COPIA FIJA del informe para el paciente
--   (contenido) con un token para el enlace /informe/<token>. Lo que ve el
--   paciente es solo esa copia; nunca el informe profesional ni la respuesta.
-- - RLS owner-only; el paciente lee el informe publicado únicamente por la
--   RPC pública con el token.

alter table public.gestionesjj_evaluaciones
  add column if not exists opciones jsonb not null default '{}'::jsonb
    check (jsonb_typeof(opciones) = 'object' and octet_length(opciones::text) <= 2000);

drop function if exists public.gestionesjj_public_evaluacion_get(uuid);

create function public.gestionesjj_public_evaluacion_get(p_token uuid)
returns table (estado text, instrumento text, ref text, borrador jsonb, opciones jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e record;
  v_usadas integer;
begin
  if p_token is null then
    estado := 'invalido'; return next; return;
  end if;
  select * into e from public.gestionesjj_evaluaciones where token = p_token;
  if e is null then
    estado := 'invalido'; return next; return;
  end if;
  instrumento := e.instrumento;
  ref := upper(left(replace(e.paciente_id::text, '-', ''), 8));
  opciones := e.opciones;
  if e.estado = 'cerrada' then
    estado := 'cerrada'; return next; return;
  end if;
  select count(*) into v_usadas from public.gestionesjj_evaluacion_respuestas where evaluacion_id = e.id;
  if e.estado = 'completa' or v_usadas >= e.respuestas_permitidas then
    estado := 'completa'; return next; return;
  end if;
  estado := 'ok';
  borrador := e.borrador;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_evaluacion_get(uuid) from public;
grant execute on function public.gestionesjj_public_evaluacion_get(uuid) to anon, authenticated;

create table if not exists public.gestionesjj_evaluacion_informes (
  respuesta_id uuid primary key references public.gestionesjj_evaluacion_respuestas(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  paciente_id uuid not null references public.gestionesjj_pacientes(id) on delete cascade,
  notas_privadas text check (notas_privadas is null or length(notas_privadas) <= 10000),
  notas_paciente text check (notas_paciente is null or length(notas_paciente) <= 6000),
  opciones jsonb not null default '{}'::jsonb check (jsonb_typeof(opciones) = 'object' and octet_length(opciones::text) <= 2000),
  contenido jsonb check (contenido is null or (jsonb_typeof(contenido) = 'object' and octet_length(contenido::text) <= 60000)),
  token uuid unique,
  publicado_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists gestionesjj_evaluacion_informes_paciente_idx
  on public.gestionesjj_evaluacion_informes (paciente_id);

alter table public.gestionesjj_evaluacion_informes enable row level security;
revoke all on public.gestionesjj_evaluacion_informes from anon;
revoke all on public.gestionesjj_evaluacion_informes from authenticated;
grant select, insert, update, delete on public.gestionesjj_evaluacion_informes to authenticated;

drop policy if exists "evaluacion_informes_select_owner" on public.gestionesjj_evaluacion_informes;
create policy "evaluacion_informes_select_owner" on public.gestionesjj_evaluacion_informes
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "evaluacion_informes_insert_owner" on public.gestionesjj_evaluacion_informes;
create policy "evaluacion_informes_insert_owner" on public.gestionesjj_evaluacion_informes
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "evaluacion_informes_update_owner" on public.gestionesjj_evaluacion_informes;
create policy "evaluacion_informes_update_owner" on public.gestionesjj_evaluacion_informes
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "evaluacion_informes_delete_owner" on public.gestionesjj_evaluacion_informes;
create policy "evaluacion_informes_delete_owner" on public.gestionesjj_evaluacion_informes
  for delete to authenticated using (public.gestionesjj_is_owner());

-- Informe publicado para el paciente (solo la copia fija; nada más).
create or replace function public.gestionesjj_public_informe_get(p_token uuid)
returns table (estado text, contenido jsonb, publicado_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  i record;
begin
  if p_token is null then
    estado := 'invalido'; return next; return;
  end if;
  select * into i from public.gestionesjj_evaluacion_informes where token = p_token;
  if i is null or i.publicado_at is null or i.contenido is null then
    estado := 'invalido'; return next; return;
  end if;
  estado := 'ok';
  contenido := i.contenido;
  publicado_at := i.publicado_at;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_informe_get(uuid) from public;
grant execute on function public.gestionesjj_public_informe_get(uuid) to anon, authenticated;
