-- CAS UPANA: formulario público de preinscripción (/cas/registro).
-- El estudiante no lee ni toca la tabla: solo llama a esta RPC, que valida los datos, inserta y
-- responde un estado ('ok', 'duplicado' o 'invalido'). Si el carné ya existe no revela ni cambia
-- nada: los datos ya registrados solo los corrige la coordinación desde /admin.

alter table public.gestionesjj_cas_aspirantes
  add column if not exists origen text not null default 'admin' check (origen in ('admin', 'formulario')),
  add column if not exists disponibilidad text check (disponibilidad is null or char_length(disponibilidad) <= 1000),
  add column if not exists consentimiento_at timestamptz;

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
