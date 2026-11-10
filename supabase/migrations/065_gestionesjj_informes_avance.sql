-- Informe de avance (evolución) para el paciente.
--
-- Una fila por paciente: notas y opciones del psicólogo y, al publicarlo,
-- una COPIA FIJA del informe simplificado (contenido) con un token para el
-- enlace /informe/<token>. El paciente solo ve esa copia (sin puntajes
-- profesionales, hipótesis ni preguntas sensibles); nunca el panel.
-- RLS owner-only; lectura pública únicamente por la RPC con el token.

create table if not exists public.gestionesjj_informes_avance (
  paciente_id uuid primary key references public.gestionesjj_pacientes(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notas_paciente text check (notas_paciente is null or length(notas_paciente) <= 6000),
  opciones jsonb not null default '{}'::jsonb check (jsonb_typeof(opciones) = 'object' and octet_length(opciones::text) <= 2000),
  contenido jsonb check (contenido is null or (jsonb_typeof(contenido) = 'object' and octet_length(contenido::text) <= 60000)),
  token uuid unique,
  publicado_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.gestionesjj_informes_avance enable row level security;
revoke all on public.gestionesjj_informes_avance from anon;
revoke all on public.gestionesjj_informes_avance from authenticated;
grant select, insert, update, delete on public.gestionesjj_informes_avance to authenticated;

drop policy if exists "informes_avance_select_owner" on public.gestionesjj_informes_avance;
create policy "informes_avance_select_owner" on public.gestionesjj_informes_avance
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "informes_avance_insert_owner" on public.gestionesjj_informes_avance;
create policy "informes_avance_insert_owner" on public.gestionesjj_informes_avance
  for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "informes_avance_update_owner" on public.gestionesjj_informes_avance;
create policy "informes_avance_update_owner" on public.gestionesjj_informes_avance
  for update to authenticated using (public.gestionesjj_is_owner())
  with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
drop policy if exists "informes_avance_delete_owner" on public.gestionesjj_informes_avance;
create policy "informes_avance_delete_owner" on public.gestionesjj_informes_avance
  for delete to authenticated using (public.gestionesjj_is_owner());

-- Informe de avance publicado (solo la copia fija; nada más).
create or replace function public.gestionesjj_public_informe_avance_get(p_token uuid)
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
  select * into i from public.gestionesjj_informes_avance where token = p_token;
  if i is null or i.publicado_at is null or i.contenido is null then
    estado := 'invalido'; return next; return;
  end if;
  estado := 'ok';
  contenido := i.contenido;
  publicado_at := i.publicado_at;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_informe_avance_get(uuid) from public;
grant execute on function public.gestionesjj_public_informe_avance_get(uuid) to anon, authenticated;
