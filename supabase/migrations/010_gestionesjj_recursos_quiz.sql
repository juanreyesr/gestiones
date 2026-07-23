-- Modulo Recursos (fase 2): quiz tipo concurso, con temporizador y puntos por
-- rapidez, reutilizando el motor de encuestas de la fase 1 (009).
--
-- Un quiz es un recurso con tipo='quiz' cuyas preguntas son de opcion_multiple
-- con la opcion correcta marcada (opciones jsonb: {"id","texto","correcta"?}).
-- No se agrega un tipo_pregunta nuevo: el CHECK constraint de 009 no se toca.
--
-- Seguridad: el tiempo transcurrido y los puntos se calculan siempre en el
-- servidor (RPC SECURITY DEFINER), nunca a partir de datos enviados por el
-- participante, para que nadie pueda falsear su velocidad de respuesta.
--
-- Todas las columnas nuevas son nullable o con default: las encuestas de la
-- fase 1 siguen funcionando exactamente igual.

alter table public.gestionesjj_recurso_preguntas
  add column if not exists tiempo_limite integer,
  add column if not exists puntos integer not null default 1000;

alter table public.gestionesjj_recurso_sesiones
  add column if not exists pregunta_activa_iniciada_at timestamptz;

alter table public.gestionesjj_recurso_respuestas
  add column if not exists es_correcta boolean,
  add column if not exists puntos_obtenidos integer not null default 0,
  add column if not exists tiempo_ms integer;

alter table public.gestionesjj_recurso_participantes
  add column if not exists puntaje integer not null default 0;

-- ============================================================
-- RPC OWNER: activar una pregunta (reemplaza el update directo de la tabla)
-- para que el reloj de inicio quede fijado por el servidor.
-- ============================================================
create or replace function public.gestionesjj_activar_pregunta(p_sesion_id uuid, p_pregunta_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.gestionesjj_is_owner() then
    raise exception 'No autorizado.';
  end if;

  if not exists (
    select 1 from public.gestionesjj_recurso_preguntas
    where id = p_pregunta_id and recurso_id = (
      select recurso_id from public.gestionesjj_recurso_sesiones where id = p_sesion_id
    )
  ) then
    raise exception 'La pregunta no pertenece a esta sesión.';
  end if;

  update public.gestionesjj_recurso_sesiones
  set estado = 'activa', pregunta_activa_id = p_pregunta_id, pregunta_activa_iniciada_at = now()
  where id = p_sesion_id;
end;
$$;

revoke execute on function public.gestionesjj_activar_pregunta(uuid, uuid) from public;
grant execute on function public.gestionesjj_activar_pregunta(uuid, uuid) to authenticated;

-- ============================================================
-- RPC PUBLICA (reemplazo): estado del participante, ahora con datos de quiz
-- (temporizador, puntos de la pregunta, y su resultado tras responder).
-- El tipo de retorno cambia respecto a 009, por lo que hay que borrar la
-- version anterior antes de recrearla.
-- ============================================================
drop function if exists public.gestionesjj_public_estado_participante(uuid);

create or replace function public.gestionesjj_public_estado_participante(p_participante_id uuid)
returns table (
  estado text,
  sesion_titulo text,
  recurso_tipo text,
  pregunta_id uuid,
  pregunta_tipo text,
  pregunta_texto text,
  pregunta_opciones jsonb,
  pregunta_escala_min integer,
  pregunta_escala_max integer,
  pregunta_iniciada_at timestamptz,
  pregunta_tiempo_limite integer,
  pregunta_puntos integer,
  ya_respondio boolean,
  mi_es_correcta boolean,
  mi_puntos_obtenidos integer,
  mi_puntaje_total integer,
  participantes_count integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  part record;
  ses record;
  preg record;
  resp record;
begin
  select * into part from public.gestionesjj_recurso_participantes where id = p_participante_id;
  if part is null then
    estado := 'invalido';
    return next;
    return;
  end if;

  select * into ses from public.gestionesjj_recurso_sesiones where id = part.sesion_id;
  if ses is null or ses.estado = 'cerrada' then
    estado := 'cerrada';
    return next;
    return;
  end if;

  estado := ses.estado;
  mi_puntaje_total := part.puntaje;
  select r.titulo, r.tipo into sesion_titulo, recurso_tipo from public.gestionesjj_recursos r where r.id = ses.recurso_id;

  if ses.pregunta_activa_id is not null then
    select * into preg from public.gestionesjj_recurso_preguntas where id = ses.pregunta_activa_id;
    pregunta_id := preg.id;
    pregunta_tipo := preg.tipo_pregunta;
    pregunta_texto := preg.texto;
    pregunta_opciones := preg.opciones;
    pregunta_escala_min := preg.escala_min;
    pregunta_escala_max := preg.escala_max;
    pregunta_iniciada_at := ses.pregunta_activa_iniciada_at;
    pregunta_tiempo_limite := preg.tiempo_limite;
    pregunta_puntos := preg.puntos;

    select * into resp from public.gestionesjj_recurso_respuestas
    where participante_id = p_participante_id and pregunta_id = preg.id;
    ya_respondio := resp is not null;
    if resp is not null then
      mi_es_correcta := resp.es_correcta;
      mi_puntos_obtenidos := resp.puntos_obtenidos;
    end if;
  end if;

  select count(*)::integer into participantes_count from public.gestionesjj_recurso_participantes where sesion_id = ses.id;

  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_estado_participante(uuid) from public;
grant execute on function public.gestionesjj_public_estado_participante(uuid) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA (reemplazo): responder, ahora calculando correccion y puntos
-- por rapidez cuando el recurso es un quiz. Tiempo y puntos SIEMPRE se
-- derivan en el servidor a partir del reloj de activacion de la pregunta.
-- ============================================================
create or replace function public.gestionesjj_public_responder(
  p_participante_id uuid,
  p_pregunta_id uuid,
  p_valor jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  part record;
  ses record;
  preg record;
  recurso_tipo text;
  v_opcion_id text;
  v_valor_num numeric;
  v_texto text;
  v_es_correcta boolean;
  v_tiempo_ms integer;
  v_limite_ms integer;
  v_puntos integer := 0;
begin
  select * into part from public.gestionesjj_recurso_participantes where id = p_participante_id;
  if part is null then
    raise exception 'Participante no encontrado.';
  end if;

  select * into ses from public.gestionesjj_recurso_sesiones where id = part.sesion_id for update;
  if ses is null or ses.estado <> 'activa' or ses.pregunta_activa_id is null or ses.pregunta_activa_id <> p_pregunta_id then
    raise exception 'Esta pregunta ya no está activa.';
  end if;

  select * into preg from public.gestionesjj_recurso_preguntas where id = p_pregunta_id;
  if preg is null then
    raise exception 'La pregunta no existe.';
  end if;

  select r.tipo into recurso_tipo from public.gestionesjj_recursos r where r.id = ses.recurso_id;

  v_tiempo_ms := greatest(0, round(extract(epoch from (now() - ses.pregunta_activa_iniciada_at)) * 1000))::integer;

  if preg.tipo_pregunta = 'opcion_multiple' then
    v_opcion_id := p_valor ->> 'opcion_id';
    if v_opcion_id is null or not exists (
      select 1 from jsonb_array_elements(preg.opciones) op where op ->> 'id' = v_opcion_id
    ) then
      raise exception 'Opción inválida.';
    end if;

    if recurso_tipo = 'quiz' then
      v_es_correcta := exists (
        select 1 from jsonb_array_elements(preg.opciones) op
        where op ->> 'id' = v_opcion_id and coalesce((op ->> 'correcta')::boolean, false)
      );
      v_limite_ms := coalesce(preg.tiempo_limite, 20) * 1000;
      if v_es_correcta and v_tiempo_ms <= v_limite_ms then
        v_puntos := greatest(
          round(preg.puntos * (1 - (v_tiempo_ms::numeric / v_limite_ms) / 2)),
          round(preg.puntos * 0.5)
        )::integer;
      else
        v_puntos := 0;
      end if;
    end if;
  elsif preg.tipo_pregunta = 'escala' then
    begin
      v_valor_num := (p_valor ->> 'valor')::numeric;
    exception when others then
      raise exception 'Valor de escala inválido.';
    end;
    if v_valor_num is null or v_valor_num < preg.escala_min or v_valor_num > preg.escala_max then
      raise exception 'Valor de escala fuera de rango.';
    end if;
  elsif preg.tipo_pregunta in ('abierta', 'nube_palabras') then
    v_texto := btrim(coalesce(p_valor ->> 'texto', ''));
    if v_texto = '' then
      raise exception 'La respuesta no puede estar vacía.';
    end if;
    if preg.tipo_pregunta = 'nube_palabras' and length(v_texto) > 40 then
      raise exception 'La respuesta es demasiado larga (máximo 40 caracteres).';
    end if;
    if preg.tipo_pregunta = 'abierta' and length(v_texto) > 500 then
      raise exception 'La respuesta es demasiado larga (máximo 500 caracteres).';
    end if;
  end if;

  begin
    insert into public.gestionesjj_recurso_respuestas
      (sesion_id, pregunta_id, participante_id, valor, es_correcta, puntos_obtenidos, tiempo_ms)
    values
      (ses.id, p_pregunta_id, p_participante_id, p_valor, v_es_correcta, v_puntos, v_tiempo_ms);
  exception when unique_violation then
    raise exception 'Ya respondiste esta pregunta.';
  end;

  if v_puntos > 0 then
    update public.gestionesjj_recurso_participantes
    set puntaje = puntaje + v_puntos
    where id = p_participante_id;
  end if;

  return true;
end;
$$;

revoke execute on function public.gestionesjj_public_responder(uuid, uuid, jsonb) from public;
grant execute on function public.gestionesjj_public_responder(uuid, uuid, jsonb) to anon, authenticated;
