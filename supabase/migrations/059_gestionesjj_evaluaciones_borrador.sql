-- Evaluaciones: un enlace por persona que responde, guardado automático del
-- avance (borrador) y cierre al enviar.
--
-- - etiqueta: a quién va dirigido el enlace ("Mamá", "Cuidador 2"...). Lo
--   escribe el psicólogo; el formulario no lo muestra de forma destacada.
-- - borrador / borrador_at: lo respondido hasta el momento. Se guarda solo
--   mientras el enlace está abierto, se devuelve al reabrir el mismo enlace
--   (para continuar donde se quedó) y se borra al enviar. El psicólogo ve el
--   avance en el expediente (RLS owner-only, igual que el resto).
-- - Ya no hay código de respaldo: si el envío final falla, lo respondido sigue
--   en el borrador y se reintenta desde el mismo enlace.

alter table public.gestionesjj_evaluaciones
  add column if not exists etiqueta text check (etiqueta is null or length(etiqueta) <= 60),
  add column if not exists borrador jsonb check (
    borrador is null or (jsonb_typeof(borrador) = 'object' and octet_length(borrador::text) <= 20000)
  ),
  add column if not exists borrador_at timestamptz;

-- Lectura pública: agrega el borrador para continuar (solo si el enlace está abierto).
drop function if exists public.gestionesjj_public_evaluacion_get(uuid);

create function public.gestionesjj_public_evaluacion_get(p_token uuid)
returns table (estado text, instrumento text, ref text, borrador jsonb)
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

-- Guardado automático del avance.
create or replace function public.gestionesjj_public_evaluacion_borrador(p_token uuid, p_borrador jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  v_usadas integer;
begin
  if p_token is null then
    return 'invalido';
  end if;
  select * into e from public.gestionesjj_evaluaciones where token = p_token for update;
  if e is null then
    return 'invalido';
  end if;
  if e.estado = 'cerrada' then
    return 'cerrada';
  end if;
  select count(*) into v_usadas from public.gestionesjj_evaluacion_respuestas where evaluacion_id = e.id;
  if e.estado = 'completa' or v_usadas >= e.respuestas_permitidas then
    return 'completa';
  end if;
  if p_borrador is null or jsonb_typeof(p_borrador) <> 'object' or octet_length(p_borrador::text) > 20000 then
    raise exception 'El avance no es válido.';
  end if;
  update public.gestionesjj_evaluaciones set borrador = p_borrador, borrador_at = now() where id = e.id;
  return 'guardado';
end;
$$;

revoke execute on function public.gestionesjj_public_evaluacion_borrador(uuid, jsonb) from public;
grant execute on function public.gestionesjj_public_evaluacion_borrador(uuid, jsonb) to anon, authenticated;

-- Envío final: igual que antes, y además borra el borrador y cierra el enlace.
create or replace function public.gestionesjj_public_evaluacion_responder(
  p_token uuid,
  p_nombre text,
  p_relacion text,
  p_fecha date,
  p_datos jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  v_usadas integer;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_relacion text := nullif(btrim(coalesce(p_relacion, '')), '');
begin
  if p_token is null then
    return 'invalido';
  end if;
  select * into e from public.gestionesjj_evaluaciones where token = p_token for update;
  if e is null then
    return 'invalido';
  end if;
  if e.estado = 'cerrada' then
    return 'cerrada';
  end if;
  select count(*) into v_usadas from public.gestionesjj_evaluacion_respuestas where evaluacion_id = e.id;
  if e.estado = 'completa' or v_usadas >= e.respuestas_permitidas then
    return 'completa';
  end if;
  if length(v_nombre) not between 1 and 120 or (v_relacion is not null and length(v_relacion) > 60) then
    raise exception 'Indique su nombre y su relación con el niño o niña.';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' or octet_length(p_datos::text) > 20000 then
    raise exception 'Las respuestas no son válidas.';
  end if;
  if p_fecha is not null and (p_fecha < date '2020-01-01' or p_fecha > (now() at time zone 'America/Guatemala')::date + 1) then
    raise exception 'La fecha no es válida.';
  end if;

  insert into public.gestionesjj_evaluacion_respuestas
    (created_by, evaluacion_id, paciente_id, instrumento, respondiente_nombre, respondiente_relacion, fecha, datos, origen)
  values
    (e.created_by, e.id, e.paciente_id, e.instrumento, v_nombre, v_relacion, p_fecha, p_datos, 'enlace');

  update public.gestionesjj_evaluaciones
  set borrador = null,
      borrador_at = null,
      estado = case when v_usadas + 1 >= e.respuestas_permitidas then 'completa' else estado end
  where id = e.id;

  return 'guardado';
end;
$$;

revoke execute on function public.gestionesjj_public_evaluacion_responder(uuid, text, text, date, jsonb) from public;
grant execute on function public.gestionesjj_public_evaluacion_responder(uuid, text, text, date, jsonb) to anon, authenticated;
