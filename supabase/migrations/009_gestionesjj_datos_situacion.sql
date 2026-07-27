-- Modulo Clinica: la hoja de datos que llena el paciente deja de pedir
-- informacion clinica (motivo/antecedentes/medicacion, que llena el terapeuta)
-- y ahora captura, con controles de seleccion:
--   * hijos (si/no + lista nombre/edad)
--   * con quien vive (vive solo si/no + relaciones)
--   * trabajo actual (ocupacion) y horario laboral
-- La RPC de guardado publica NUNCA toca las columnas clinicas.

-- ============================================================
-- PACIENTES: situacion familiar y laboral
-- ============================================================
alter table public.gestionesjj_pacientes
  add column if not exists tiene_hijos boolean,
  add column if not exists hijos jsonb not null default '[]'::jsonb,
  add column if not exists vive_solo boolean,
  add column if not exists convive_con text[] not null default '{}'::text[],
  add column if not exists convive_otros text,
  add column if not exists horario_trabajo text;

-- ============================================================
-- RPC PUBLICA (reemplazo): leer la hoja de datos por token
-- estado: 'ok' | 'completado' | 'invalido'. Sin campos clinicos.
-- ============================================================
drop function if exists public.gestionesjj_public_datos_get(uuid);

create or replace function public.gestionesjj_public_datos_get(p_token uuid)
returns table (
  estado text,
  nombre text,
  telefono text,
  email text,
  fecha_nacimiento date,
  genero text,
  ocupacion text,
  escolaridad text,
  estado_civil text,
  direccion text,
  emergencia_nombre text,
  emergencia_telefono text,
  emergencia_relacion text,
  referido_por text,
  tiene_hijos boolean,
  hijos jsonb,
  vive_solo boolean,
  convive_con text[],
  convive_otros text,
  horario_trabajo text
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
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_datos_get(uuid) from public;
grant execute on function public.gestionesjj_public_datos_get(uuid) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA (reemplazo): guardar la hoja de datos por token.
-- Solo campos descriptivos + situacion; jamas toca notas clinicas ni privadas.
-- ============================================================
drop function if exists public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text, text, text
);

create or replace function public.gestionesjj_public_datos_save(
  p_token uuid,
  p_nombre text,
  p_telefono text,
  p_email text,
  p_fecha_nacimiento date,
  p_genero text,
  p_ocupacion text,
  p_escolaridad text,
  p_estado_civil text,
  p_direccion text,
  p_emergencia_nombre text,
  p_emergencia_telefono text,
  p_emergencia_relacion text,
  p_referido_por text,
  p_tiene_hijos boolean,
  p_hijos jsonb,
  p_vive_solo boolean,
  p_convive_con text[],
  p_convive_otros text,
  p_horario_trabajo text
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
    datos_completados_at = now()
  where id = p.id;

  return 'guardado';
end;
$$;

revoke execute on function public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, boolean, jsonb, boolean, text[], text, text
) from public;
grant execute on function public.gestionesjj_public_datos_save(
  uuid, text, text, text, date, text, text, text, text, text, text, text, text, text, boolean, jsonb, boolean, text[], text, text
) to anon, authenticated;
