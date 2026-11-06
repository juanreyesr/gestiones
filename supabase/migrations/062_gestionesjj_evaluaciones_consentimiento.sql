-- Evaluaciones por enlace: datos del expediente y consentimiento previo.
--
-- - El formulario ya no pregunta nombre, edad ni fecha: el nombre del
--   paciente sale del expediente, la fecha es la del envío (hora de
--   Guatemala) y la edad se calcula de la fecha de nacimiento. (En el B-Breve
--   sigue pidiéndose el nombre y la relación de quien responde, que es un
--   cuidador.)
-- - Antes de responder cualquier evaluación, el paciente (o sus padres o
--   tutores si es menor) debe haber firmado el consentimiento informado. Si
--   aún no lo firmó, la página de la evaluación lo muestra y permite firmarlo
--   ahí mismo (gestionesjj_public_evaluacion_consentir). Se registra igual que
--   en la hoja de datos: un registro nuevo en gestionesjj_consentimientos con
--   texto, versión, firmantes, IP y navegador.
-- - El enlace solo devuelve el nombre del paciente y los datos de firmantes
--   mientras falta el consentimiento (para prellenar la firma).

-- Consentimiento firmado: historial o el registro anterior en pacientes.
create or replace function public.gestionesjj_paciente_tiene_consentimiento(p_paciente uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.gestionesjj_consentimientos c where c.paciente_id = p_paciente)
      or exists (select 1 from public.gestionesjj_pacientes p where p.id = p_paciente and p.consentimiento_aceptado_at is not null);
$$;
revoke execute on function public.gestionesjj_paciente_tiene_consentimiento(uuid) from public, anon, authenticated;

-- ============================================================
-- 1) Leer el enlace: agrega consentimiento y datos para firmarlo
-- ============================================================
drop function if exists public.gestionesjj_public_evaluacion_get(uuid);

create function public.gestionesjj_public_evaluacion_get(p_token uuid)
returns table(
  estado text, instrumento text, ref text, borrador jsonb, opciones jsonb,
  consentimiento boolean, es_menor boolean, paciente_nombre text, identificacion text, responsables jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e record;
  p record;
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
  consentimiento := public.gestionesjj_paciente_tiene_consentimiento(e.paciente_id);
  if not consentimiento then
    select * into p from public.gestionesjj_pacientes where id = e.paciente_id;
    es_menor := p.es_menor;
    paciente_nombre := p.nombre;
    identificacion := p.identificacion;
    responsables := p.responsables;
  end if;
  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_evaluacion_get(uuid) from public;
grant execute on function public.gestionesjj_public_evaluacion_get(uuid) to anon, authenticated;

-- ============================================================
-- 2) Firmar el consentimiento desde el enlace de la evaluación
-- ============================================================
create or replace function public.gestionesjj_public_evaluacion_consentir(
  p_token uuid,
  p_version text,
  p_texto text,
  p_identificacion text,
  p_responsables jsonb,
  p_asentimiento_menor boolean,
  p_declara_tutela boolean,
  p_ip text,
  p_user_agent text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  p record;
  r jsonb;
  v_usadas integer;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_version text := nullif(btrim(coalesce(p_version, '')), '');
  v_ident text := nullif(btrim(coalesce(p_identificacion, '')), '');
  v_resp jsonb := coalesce(p_responsables, '[]'::jsonb);
  v_firmantes jsonb;
begin
  if p_token is null then
    return 'invalido';
  end if;
  select * into e from public.gestionesjj_evaluaciones where token = p_token;
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
  if public.gestionesjj_paciente_tiene_consentimiento(e.paciente_id) then
    return 'ya_firmado';
  end if;
  select * into p from public.gestionesjj_pacientes where id = e.paciente_id for update;

  if v_texto = '' or v_version is null or length(v_texto) > 30000 or length(v_version) > 20 then
    raise exception 'Debe leer y aceptar el consentimiento informado.';
  end if;
  if v_ident is not null and length(v_ident) > 40 then
    raise exception 'El documento de identificación no es válido.';
  end if;
  if jsonb_typeof(v_resp) <> 'array' or jsonb_array_length(v_resp) > 2 then
    raise exception 'Los datos de los padres o tutores no son válidos.';
  end if;

  if p.es_menor then
    if jsonb_array_length(v_resp) = 0 then
      raise exception 'Indique el nombre e identificación del padre, madre o tutor que firma el consentimiento.';
    end if;
    for r in select * from jsonb_array_elements(v_resp) loop
      if jsonb_typeof(r) <> 'object'
         or length(btrim(coalesce(r ->> 'nombre', ''))) not between 1 and 120
         or length(btrim(coalesce(r ->> 'identificacion', ''))) not between 1 and 40
         or length(coalesce(r ->> 'parentesco', '')) > 40
         or length(coalesce(r ->> 'telefono', '')) > 30
         or length(coalesce(r ->> 'tipoIdentificacion', '')) > 30 then
        raise exception 'Complete el nombre y la identificación de cada padre, madre o tutor.';
      end if;
    end loop;
    if not coalesce(p_declara_tutela, false) then
      raise exception 'Confirme que ejerce la patria potestad o tutela legal del menor.';
    end if;
    v_firmantes := v_resp;
  else
    if v_ident is null then
      raise exception 'Escriba su número de identificación para firmar.';
    end if;
    v_firmantes := jsonb_build_array(jsonb_build_object(
      'nombre', p.nombre, 'identificacion', v_ident, 'parentesco', 'Paciente'
    ));
  end if;

  update public.gestionesjj_pacientes set
    identificacion = case when p.es_menor then p.identificacion else v_ident end,
    responsables = case when p.es_menor then v_resp else p.responsables end,
    consentimiento_texto = v_texto,
    consentimiento_aceptado_at = now()
  where id = p.id;

  insert into public.gestionesjj_consentimientos
    (paciente_id, version, es_menor, texto, firmantes, asentimiento_menor, declara_tutela, ip, user_agent)
  values
    (p.id, v_version, p.es_menor, v_texto, v_firmantes,
     case when p.es_menor then coalesce(p_asentimiento_menor, false) else null end,
     case when p.es_menor then true else null end,
     left(nullif(btrim(coalesce(p_ip, '')), ''), 64),
     left(nullif(btrim(coalesce(p_user_agent, '')), ''), 300));

  return 'firmado';
end;
$$;

revoke execute on function public.gestionesjj_public_evaluacion_consentir(uuid, text, text, text, jsonb, boolean, boolean, text, text) from public;
grant execute on function public.gestionesjj_public_evaluacion_consentir(uuid, text, text, text, jsonb, boolean, boolean, text, text) to anon, authenticated;

-- ============================================================
-- 3) Responder: exige consentimiento; nombre, fecha y edad del expediente
-- ============================================================
create or replace function public.gestionesjj_public_evaluacion_responder(
  p_token uuid, p_nombre text, p_relacion text, p_fecha date, p_datos jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  p record;
  v_usadas integer;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_relacion text := nullif(btrim(coalesce(p_relacion, '')), '');
  v_hoy date := (now() at time zone 'America/Guatemala')::date;
  v_fecha date;
  v_datos jsonb := p_datos;
  v_edad integer;
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
  if not public.gestionesjj_paciente_tiene_consentimiento(e.paciente_id) then
    raise exception 'Antes de responder debe leer y firmar el consentimiento informado.';
  end if;
  select * into p from public.gestionesjj_pacientes where id = e.paciente_id;

  -- Nombre: el que indique quien responde (cuidadores) o el del expediente.
  if v_nombre = '' then
    v_nombre := btrim(coalesce(p.nombre, ''));
  end if;
  if length(v_nombre) not between 1 and 120 or (v_relacion is not null and length(v_relacion) > 60) then
    raise exception 'Indique su nombre y su relación con el niño o niña.';
  end if;
  if v_datos is null or jsonb_typeof(v_datos) <> 'object' or octet_length(v_datos::text) > 20000 then
    raise exception 'Las respuestas no son válidas.';
  end if;
  -- Fecha: la del envío, salvo que venga una válida (versiones anteriores del formulario).
  v_fecha := coalesce(p_fecha, v_hoy);
  if v_fecha < date '2020-01-01' or v_fecha > v_hoy + 1 then
    raise exception 'La fecha no es válida.';
  end if;
  -- Edad a la fecha de respuesta, desde la fecha de nacimiento del expediente.
  if p.fecha_nacimiento is not null and p.fecha_nacimiento <= v_fecha then
    v_edad := extract(year from age(v_fecha, p.fecha_nacimiento))::integer;
    if v_edad between 1 and 110 and coalesce(v_datos ->> 'edad', '') = '' then
      v_datos := v_datos || jsonb_build_object('edad', v_edad);
    end if;
  end if;
  v_datos := v_datos || jsonb_build_object('fecha', to_char(v_fecha, 'YYYY-MM-DD'));
  if coalesce(v_datos ->> 'nombre', '') = '' then
    v_datos := v_datos || jsonb_build_object('nombre', v_nombre);
  end if;

  insert into public.gestionesjj_evaluacion_respuestas
    (created_by, evaluacion_id, paciente_id, instrumento, respondiente_nombre, respondiente_relacion, fecha, datos, origen)
  values
    (e.created_by, e.id, e.paciente_id, e.instrumento, v_nombre, v_relacion, v_fecha, v_datos, 'enlace');

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
