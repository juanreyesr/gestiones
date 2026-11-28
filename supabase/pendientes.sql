-- Migraciones pendientes (ver supabase/PENDIENTES.md). Pegar todo en Supabase → SQL Editor → Run.

-- ===== 075_gestionesjj_cas_mis_datos.sql =====
-- CAS UPANA:
-- 1) La preinscripción responde «ok:<número>» con el orden de inscripción asignado, para
--    mostrárselo al estudiante en la pantalla de confirmación.
-- 2) «Actualizar mis datos» (/cas/mis-datos): el estudiante se identifica con su carné y su
--    correo institucional (los dos deben coincidir) y puede ver y corregir su teléfono, correo
--    personal, campus, disponibilidad y nombre. No puede cambiar carné, correo institucional,
--    práctica, estado, notas ni su número de orden: eso lo hace la coordinación en /admin.
--    Las RPC no leen nada si los dos datos no coinciden; la API limita los intentos por IP.

alter table public.gestionesjj_cas_aspirantes
  add column if not exists actualizado_por_estudiante_at timestamptz;

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
  v_orden bigint;
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
    (v_nombre, v_carne, p_practica, v_tel, v_ci, v_cp, v_disp, v_campus, 'aspirante', 'formulario', now(), null)
  returning orden_inscripcion into v_orden;
  -- «ok:17»: la API separa el número para mostrárselo al estudiante.
  return 'ok:' || v_orden;
exception
  when unique_violation then
    return 'duplicado';
  when check_violation or not_null_violation then
    return 'invalido';
end;
$$;

revoke execute on function public.gestionesjj_public_cas_preinscripcion(text, text, text, text, text, text, text, boolean, text) from public;
grant execute on function public.gestionesjj_public_cas_preinscripcion(text, text, text, text, text, text, text, boolean, text) to anon, authenticated;

-- Consulta de los datos propios: null si el carné y el correo institucional no coinciden.
create or replace function public.gestionesjj_public_cas_mis_datos(p_carne text, p_correo_institucional text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre_completo', a.nombre_completo,
    'carne', a.carne,
    'practica', a.practica,
    'telefono', a.telefono,
    'correo_institucional', a.correo_institucional,
    'correo_personal', a.correo_personal,
    'campus', a.campus,
    'disponibilidad', a.disponibilidad,
    'orden_inscripcion', a.orden_inscripcion,
    'created_at', a.created_at
  )
  from public.gestionesjj_cas_aspirantes a
  where lower(btrim(a.carne)) = lower(btrim(coalesce(p_carne, '')))
    and a.correo_institucional = lower(btrim(coalesce(p_correo_institucional, '')))
    and btrim(coalesce(p_carne, '')) <> ''
    and btrim(coalesce(p_correo_institucional, '')) <> ''
  limit 1;
$$;

revoke execute on function public.gestionesjj_public_cas_mis_datos(text, text) from public;
grant execute on function public.gestionesjj_public_cas_mis_datos(text, text) to anon, authenticated;

-- Corrección de los datos propios: 'ok', 'no_encontrado' o 'invalido'.
create or replace function public.gestionesjj_public_cas_actualizar_datos(
  p_carne text,
  p_correo_institucional text,
  p_nombre text,
  p_telefono text,
  p_correo_personal text,
  p_campus text,
  p_disponibilidad text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_nombre text := nullif(regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g'), '');
  v_tel text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_cp text := lower(nullif(btrim(coalesce(p_correo_personal, '')), ''));
  v_campus text := nullif(regexp_replace(btrim(coalesce(p_campus, '')), '\s+', ' ', 'g'), '');
  v_disp text := nullif(btrim(coalesce(p_disponibilidad, '')), '');
  v_correo_re text := '^[^@\s]+@[^@\s]+\.[^@\s]+$';
begin
  if btrim(coalesce(p_carne, '')) = '' or btrim(coalesce(p_correo_institucional, '')) = '' then
    return 'no_encontrado';
  end if;

  select a.id into v_id
  from public.gestionesjj_cas_aspirantes a
  where lower(btrim(a.carne)) = lower(btrim(p_carne))
    and a.correo_institucional = lower(btrim(p_correo_institucional))
  limit 1
  for update;

  if v_id is null then
    return 'no_encontrado';
  end if;

  if v_nombre is null or char_length(v_nombre) not between 3 and 160
     or v_tel is null or char_length(v_tel) > 40 or char_length(regexp_replace(v_tel, '\D', '', 'g')) < 8
     or (v_cp is not null and (v_cp !~* v_correo_re or char_length(v_cp) > 200))
     or v_campus is null or char_length(v_campus) > 80
     or (v_disp is not null and char_length(v_disp) > 1000) then
    return 'invalido';
  end if;

  update public.gestionesjj_cas_aspirantes
  set nombre_completo = v_nombre,
      telefono = v_tel,
      correo_personal = v_cp,
      campus = v_campus,
      disponibilidad = v_disp,
      actualizado_por_estudiante_at = now()
  where id = v_id;
  return 'ok';
exception
  when check_violation or not_null_violation then
    return 'invalido';
end;
$$;

revoke execute on function public.gestionesjj_public_cas_actualizar_datos(text, text, text, text, text, text, text) from public;
grant execute on function public.gestionesjj_public_cas_actualizar_datos(text, text, text, text, text, text, text) to anon, authenticated;
