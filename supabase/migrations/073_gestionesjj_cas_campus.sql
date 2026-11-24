-- CAS UPANA: campus al que pertenece cada aspirante (Campus Central, Campus Chimaltenango,
-- Campus Naranjo u otro escrito a mano), para filtrar a los interesados por campus.
-- Texto libre a propósito: las tres opciones principales viven en el código
-- (src/lib/cas/aspirantes.ts) y «Otro» guarda lo que el estudiante escriba.
-- La RPC pública pasa a pedir el campus (obligatorio en el formulario); la firma anterior,
-- sin campus, se elimina para que no quede una puerta sin ese dato.

alter table public.gestionesjj_cas_aspirantes
  add column if not exists campus text check (campus is null or char_length(btrim(campus)) between 1 and 80);

create index if not exists gestionesjj_cas_aspirantes_campus_idx
  on public.gestionesjj_cas_aspirantes (campus);

-- Preinscripciones recibidas antes de esta migración: la API guardó el campus al inicio de la
-- disponibilidad como «Campus: …». Se pasa a la columna y se quita de la disponibilidad.
update public.gestionesjj_cas_aspirantes
set campus = left(btrim(substring(disponibilidad from '^Campus: ([^\n]+)')), 80),
    disponibilidad = nullif(btrim(regexp_replace(disponibilidad, '^Campus: [^\n]*\n?', '')), '')
where campus is null and disponibilidad ~ '^Campus: [^\n]+';

drop function if exists public.gestionesjj_public_cas_preinscripcion(text, text, text, text, text, text, text, boolean);

create or replace function public.gestionesjj_public_cas_preinscripcion(
  p_nombre text,
  p_carne text,
  p_practica text,
  p_telefono text,
  p_correo_institucional text,
  p_correo_personal text,
  p_disponibilidad text,
  p_consentimiento boolean,
  p_campus text
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
  v_campus text := nullif(regexp_replace(btrim(coalesce(p_campus, '')), '\s+', ' ', 'g'), '');
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
     or (v_disp is not null and char_length(v_disp) > 1000)
     or v_campus is null or char_length(v_campus) > 80 then
    return 'invalido';
  end if;

  if exists (select 1 from public.gestionesjj_cas_aspirantes where lower(btrim(carne)) = lower(v_carne)) then
    return 'duplicado';
  end if;

  insert into public.gestionesjj_cas_aspirantes
    (nombre_completo, carne, practica, telefono, correo_institucional, correo_personal, disponibilidad, campus,
     estado, origen, consentimiento_at, created_by)
  values
    (v_nombre, v_carne, p_practica, v_tel, v_ci, v_cp, v_disp, v_campus, 'aspirante', 'formulario', now(), null);
  return 'ok';
exception
  when unique_violation then
    return 'duplicado';
  when check_violation or not_null_violation then
    return 'invalido';
end;
$$;

revoke execute on function public.gestionesjj_public_cas_preinscripcion(text, text, text, text, text, text, text, boolean, text) from public;
grant execute on function public.gestionesjj_public_cas_preinscripcion(text, text, text, text, text, text, text, boolean, text) to anon, authenticated;
