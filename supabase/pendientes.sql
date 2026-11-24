-- Migraciones pendientes (ver supabase/PENDIENTES.md). Pegar todo en Supabase → SQL Editor → Run.

-- ===== 070_gestionesjj_cas_formulario_abierto.sql =====
-- CAS UPANA: interruptor para abrir o cerrar el formulario público de preinscripción.
-- Una sola fila de configuración (id = true). Sin la fila, el formulario se considera abierto.
-- La página pública consulta el estado con una RPC (sin leer la tabla) y la RPC de preinscripción
-- responde 'cerrado' si está cerrado, para que nadie se cuele con el formulario ya abierto.

create table if not exists public.gestionesjj_cas_config (
  id boolean primary key default true check (id),
  formulario_abierto boolean not null default true,
  mensaje_cerrado text check (mensaje_cerrado is null or char_length(mensaje_cerrado) <= 600),
  updated_at timestamptz not null default now()
);

insert into public.gestionesjj_cas_config (id) values (true) on conflict (id) do nothing;

alter table public.gestionesjj_cas_config enable row level security;

drop policy if exists "cas_config_select_owner" on public.gestionesjj_cas_config;
drop policy if exists "cas_config_insert_owner" on public.gestionesjj_cas_config;
drop policy if exists "cas_config_update_owner" on public.gestionesjj_cas_config;
create policy "cas_config_select_owner" on public.gestionesjj_cas_config for select to authenticated using (public.gestionesjj_is_owner());
create policy "cas_config_insert_owner" on public.gestionesjj_cas_config for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "cas_config_update_owner" on public.gestionesjj_cas_config for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());

revoke all on public.gestionesjj_cas_config from anon;

create or replace function public.gestionesjj_public_cas_formulario_estado()
returns table (abierto boolean, mensaje text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select c.formulario_abierto from public.gestionesjj_cas_config c where c.id), true),
         (select c.mensaje_cerrado from public.gestionesjj_cas_config c where c.id);
$$;

revoke execute on function public.gestionesjj_public_cas_formulario_estado() from public;
grant execute on function public.gestionesjj_public_cas_formulario_estado() to anon, authenticated;

create or replace function public.gestionesjj_public_cas_preinscripcion(
  p_nombre text,
  p_carne text,
  p_practica text,
  p_telefono text,
  p_correo_institucional text,
  p_correo_personal text,
  p_disponibilidad text,
  p_consentimiento boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := nullif(regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g'), '');
  v_carne text := upper(nullif(btrim(coalesce(p_carne, '')), ''));
  v_tel text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_ci text := lower(nullif(btrim(coalesce(p_correo_institucional, '')), ''));
  v_cp text := lower(nullif(btrim(coalesce(p_correo_personal, '')), ''));
  v_disp text := nullif(btrim(coalesce(p_disponibilidad, '')), '');
  v_correo_re text := '^[^@\s]+@[^@\s]+\.[^@\s]+$';
begin
  -- Formulario cerrado desde /admin: no se recibe nada (sin fila de configuración = abierto).
  if exists (select 1 from public.gestionesjj_cas_config where id and not formulario_abierto) then
    return 'cerrado';
  end if;

  if coalesce(p_consentimiento, false) is not true
     or v_nombre is null or char_length(v_nombre) not between 3 and 160
     or v_carne is null or char_length(v_carne) > 40
     or coalesce(p_practica, '') not in ('consejeria_cuarto', 'profesional_quinto')
     or v_tel is null or char_length(v_tel) > 40 or char_length(regexp_replace(v_tel, '\D', '', 'g')) < 8
     or v_ci is null or v_ci !~* v_correo_re or char_length(v_ci) > 200
     or (v_cp is not null and (v_cp !~* v_correo_re or char_length(v_cp) > 200))
     or (v_disp is not null and char_length(v_disp) > 1000) then
    return 'invalido';
  end if;

  if exists (select 1 from public.gestionesjj_cas_aspirantes where lower(btrim(carne)) = lower(v_carne)) then
    return 'duplicado';
  end if;

  insert into public.gestionesjj_cas_aspirantes
    (nombre_completo, carne, practica, telefono, correo_institucional, correo_personal, disponibilidad,
     estado, origen, consentimiento_at, created_by)
  values
    (v_nombre, v_carne, p_practica, v_tel, v_ci, v_cp, v_disp, 'aspirante', 'formulario', now(), null);
  return 'ok';
exception
  when unique_violation then
    return 'duplicado';
  when check_violation or not_null_violation then
    return 'invalido';
end;
$$;

revoke execute on function public.gestionesjj_public_cas_preinscripcion(text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.gestionesjj_public_cas_preinscripcion(text, text, text, text, text, text, text, boolean) to anon, authenticated;
