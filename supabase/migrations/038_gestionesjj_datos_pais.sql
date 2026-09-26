-- Formulario publico de datos del paciente (/datos/[token]): agrega pais y
-- zona horaria (columnas de la migracion 037).
--
-- gestionesjj_public_datos_get: se recrea (cambia su tipo de retorno) para
-- devolver pais y zona_horaria.
-- gestionesjj_public_datos_save: se reemplaza por una version con dos
-- parametros nuevos al final, con default null. Se borra la anterior en vez
-- de sobrecargarla para que PostgREST no tenga dos candidatas con los mismos
-- nombres de parametros. Un llamado sin p_pais / p_zona_horaria (version
-- anterior de la app) sigue funcionando y conserva lo que ya habia.
-- Solo toca funciones propias del modulo Clinica.

drop function if exists public.gestionesjj_public_datos_get(uuid);

create function public.gestionesjj_public_datos_get(p_token uuid)
returns table(
  estado text, nombre text, telefono text, email text, fecha_nacimiento date, genero text, ocupacion text,
  escolaridad text, estado_civil text, direccion text, emergencia_nombre text, emergencia_telefono text,
  emergencia_relacion text, referido_por text, tiene_hijos boolean, hijos jsonb, vive_solo boolean,
  convive_con text[], convive_otros text, horario_trabajo text, pais text, zona_horaria text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p record;
begin
  if p_token is null then
    estado := 'invalido'; return next; return;
  end if;
  select * into p from public.gestionesjj_pacientes where datos_token = p_token;
  if p is null then
    estado := 'invalido'; return next; return;
  end if;
  if p.datos_completados_at is not null then
    estado := 'completado'; return next; return;
  end if;

  estado := 'ok';
  nombre := p.nombre; telefono := p.telefono; email := p.email;
  fecha_nacimiento := p.fecha_nacimiento; genero := p.genero; ocupacion := p.ocupacion;
  escolaridad := p.escolaridad; estado_civil := p.estado_civil; direccion := p.direccion;
  emergencia_nombre := p.emergencia_nombre; emergencia_telefono := p.emergencia_telefono;
  emergencia_relacion := p.emergencia_relacion; referido_por := p.referido_por;
  tiene_hijos := p.tiene_hijos; hijos := p.hijos; vive_solo := p.vive_solo;
  convive_con := p.convive_con; convive_otros := p.convive_otros; horario_trabajo := p.horario_trabajo;
  pais := p.pais; zona_horaria := p.zona_horaria;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_datos_get(uuid) from public;
grant execute on function public.gestionesjj_public_datos_get(uuid) to anon, authenticated;

drop function if exists public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, boolean, jsonb, boolean, text[], text, text
);

create function public.gestionesjj_public_datos_save(
  p_token uuid, p_nombre text, p_telefono text, p_email text, p_fecha_nacimiento date, p_genero text,
  p_ocupacion text, p_escolaridad text, p_estado_civil text, p_direccion text, p_emergencia_nombre text,
  p_emergencia_telefono text, p_emergencia_relacion text, p_referido_por text, p_tiene_hijos boolean,
  p_hijos jsonb, p_vive_solo boolean, p_convive_con text[], p_convive_otros text, p_horario_trabajo text,
  p_pais text default null, p_zona_horaria text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_telefono text := btrim(coalesce(p_telefono, ''));
  v_hijos jsonb := case when coalesce(p_tiene_hijos, false) then coalesce(p_hijos, '[]'::jsonb) else '[]'::jsonb end;
  v_convive text[] := case when coalesce(p_vive_solo, false) then '{}'::text[] else coalesce(p_convive_con, '{}'::text[]) end;
  v_convive_otros text := case when coalesce(p_vive_solo, false) then null else nullif(btrim(coalesce(p_convive_otros, '')), '') end;
  v_pais text := nullif(upper(btrim(coalesce(p_pais, ''))), '');
  v_zona text := nullif(btrim(coalesce(p_zona_horaria, '')), '');
begin
  if p_token is null then
    return 'invalido';
  end if;
  select * into p from public.gestionesjj_pacientes where datos_token = p_token for update;
  if p is null then
    return 'invalido';
  end if;
  if p.datos_completados_at is not null then
    return 'completado';
  end if;
  if v_nombre = '' or length(v_nombre) > 120 or v_telefono = '' or length(v_telefono) > 30 then
    raise exception 'El nombre y el teléfono son obligatorios.';
  end if;
  if jsonb_typeof(v_hijos) <> 'array' or jsonb_array_length(v_hijos) > 20 then
    raise exception 'La información de hijos no es válida.';
  end if;
  if array_length(v_convive, 1) > 12 then
    raise exception 'Selección de convivencia no válida.';
  end if;
  if v_pais is not null and v_pais !~ '^[A-Z]{2}$' then
    raise exception 'El país no es válido.';
  end if;
  if v_zona is not null and (length(v_zona) > 64 or v_zona !~ '^[A-Za-z_]+(/[A-Za-z_+-]+)+$') then
    raise exception 'La zona horaria no es válida.';
  end if;

  update public.gestionesjj_pacientes set
    nombre = v_nombre,
    telefono = v_telefono,
    email = nullif(btrim(coalesce(p_email, '')), ''),
    fecha_nacimiento = p_fecha_nacimiento,
    genero = nullif(btrim(coalesce(p_genero, '')), ''),
    ocupacion = nullif(btrim(coalesce(p_ocupacion, '')), ''),
    escolaridad = nullif(btrim(coalesce(p_escolaridad, '')), ''),
    estado_civil = nullif(btrim(coalesce(p_estado_civil, '')), ''),
    direccion = nullif(btrim(coalesce(p_direccion, '')), ''),
    emergencia_nombre = nullif(btrim(coalesce(p_emergencia_nombre, '')), ''),
    emergencia_telefono = nullif(btrim(coalesce(p_emergencia_telefono, '')), ''),
    emergencia_relacion = nullif(btrim(coalesce(p_emergencia_relacion, '')), ''),
    referido_por = nullif(btrim(coalesce(p_referido_por, '')), ''),
    tiene_hijos = p_tiene_hijos,
    hijos = v_hijos,
    vive_solo = p_vive_solo,
    convive_con = v_convive,
    convive_otros = v_convive_otros,
    horario_trabajo = nullif(btrim(coalesce(p_horario_trabajo, '')), ''),
    -- Sin pais/zona en el llamado (version anterior de la app) se conserva lo que habia.
    pais = coalesce(v_pais, p.pais),
    zona_horaria = case when p_pais is null and p_zona_horaria is null then p.zona_horaria else v_zona end,
    datos_completados_at = now()
  where id = p.id;

  return 'guardado';
end;
$$;

revoke execute on function public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, boolean, jsonb, boolean, text[], text, text, text, text
) from public;
grant execute on function public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, boolean, jsonb, boolean, text[], text, text, text, text
) to anon, authenticated;
