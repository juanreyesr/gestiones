-- Encuesta estudiantil de primer ingreso (fase 1 de un modulo de encuestas
-- institucionales medibles ano contra ano). Mide por que el estudiante eligio
-- la universidad y la carrera, y que espera de ambas.
--
-- Diseno: cada "campana" tiene un anio asignable (permite captura retroactiva
-- de anios anteriores) y un token publico para compartir por QR/enlace. Las
-- respuestas usan columnas tipadas (no jsonb libre) para poder graficarlas
-- con un simple GROUP BY / conteo de arreglos, y los catalogos de opciones
-- quedan fijados con CHECK (contenido) para que el dashboard y el formulario
-- compartan exactamente los mismos valores (ver src/lib/encuestas/catalogos.ts).
--
-- Seguridad: mismo patron que 006/009 — RLS owner-lock, anon sin grants de
-- tabla, el flujo publico (consultar campana, responder) solo via RPCs
-- SECURITY DEFINER.

-- ============================================================
-- CAMPANAS (una encuesta lanzada para un anio/carrera especifico)
-- ============================================================
create table if not exists public.gestionesjj_encuestas_campanas (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null,
  anio integer not null check (anio between 2000 and 2100),
  carrera_id uuid references public.gestionesjj_carreras(id) on delete set null,
  token uuid not null unique default gen_random_uuid(),
  activa boolean not null default true,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RESPUESTAS (una fila por estudiante encuestado)
-- Catalogos cerrados via CHECK; ver src/lib/encuestas/catalogos.ts para las
-- mismas listas usadas en el formulario y el dashboard.
-- ============================================================
create table if not exists public.gestionesjj_encuestas_respuestas (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.gestionesjj_encuestas_campanas(id) on delete cascade,
  origen text not null default 'en_linea' check (origen in ('en_linea', 'retroactiva')),

  -- Perfil opcional y anonimo
  edad_rango text check (edad_rango in ('16-18', '19-21', '22-25', '26-30', '31+')),
  genero text check (genero in ('femenino', 'masculino', 'otro', 'prefiero_no_decir')),
  trabaja boolean,
  primera_generacion boolean,

  -- Como conocio la universidad
  fuente_conocimiento text not null check (fuente_conocimiento in (
    'redes_sociales', 'recomendacion_familiar', 'recomendacion_amigo', 'egresado',
    'feria_o_visita_colegio', 'publicidad', 'busqueda_internet', 'otro'
  )),

  -- Por que esta universidad
  razones_universidad text[] not null check (
    array_length(razones_universidad, 1) > 0
    and razones_universidad <@ array[
      'prestigio', 'costo_accesible', 'beca', 'ubicacion', 'horarios_flexibles',
      'modalidad_virtual', 'recomendacion', 'unica_con_la_carrera', 'ambiente_valores',
      'calidad_docente', 'instalaciones', 'otro'
    ]::text[]
  ),
  razones_universidad_otro text check (length(razones_universidad_otro) <= 200),

  -- Por que esta carrera
  razones_carrera text[] not null check (
    array_length(razones_carrera, 1) > 0
    and razones_carrera <@ array[
      'vocacion', 'empleabilidad', 'ingresos_esperados', 'influencia_familiar',
      'experiencia_personal', 'ayudar_a_otros', 'continuacion_estudios',
      'prestigio_profesion', 'descarte_otras', 'otro'
    ]::text[]
  ),
  razones_carrera_otro text check (length(razones_carrera_otro) <= 200),
  primera_opcion boolean not null,
  quien_influyo text not null check (quien_influyo in (
    'decision_propia', 'padres', 'familia', 'amigos', 'orientador', 'docente', 'otro'
  )),

  -- Expectativas
  expectativas_carrera text[] not null check (
    array_length(expectativas_carrera, 1) > 0
    and expectativas_carrera <@ array[
      'empleo_rapido', 'buen_salario', 'crecimiento_personal', 'conocimiento_practico',
      'emprender', 'servir_comunidad', 'estabilidad', 'otro'
    ]::text[]
  ),
  expectativa_universidad text[] not null check (
    array_length(expectativa_universidad, 1) > 0
    and expectativa_universidad <@ array[
      'buena_docencia', 'acompanamiento', 'practicas_reales', 'flexibilidad',
      'tecnologia', 'bolsa_trabajo', 'vida_estudiantil', 'otro'
    ]::text[]
  ),
  expectativa_abierta text check (length(expectativa_abierta) <= 500),

  -- Medibles ano contra ano
  satisfaccion_eleccion smallint not null check (satisfaccion_eleccion between 1 and 5),
  probabilidad_recomendar smallint not null check (probabilidad_recomendar between 0 and 10),
  comentario text check (length(comentario) <= 500),

  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_encuestas_respuestas_campana_idx on public.gestionesjj_encuestas_respuestas (campana_id);
create index if not exists gestionesjj_encuestas_campanas_anio_idx on public.gestionesjj_encuestas_campanas (anio desc);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_encuestas_campanas enable row level security;
alter table public.gestionesjj_encuestas_respuestas enable row level security;

revoke all on public.gestionesjj_encuestas_campanas from anon;
revoke all on public.gestionesjj_encuestas_respuestas from anon;

grant select, insert, update, delete on public.gestionesjj_encuestas_campanas to authenticated;
-- No se otorga "update": las respuestas no se editan una vez enviadas (ni por
-- el owner ni por el participante); solo se leen o se borran.
grant select, insert, delete on public.gestionesjj_encuestas_respuestas to authenticated;

create policy "encuestas_campanas_select_owner" on public.gestionesjj_encuestas_campanas for select to authenticated using (public.gestionesjj_is_owner());
create policy "encuestas_campanas_insert_owner" on public.gestionesjj_encuestas_campanas for insert to authenticated with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "encuestas_campanas_update_owner" on public.gestionesjj_encuestas_campanas for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);
create policy "encuestas_campanas_delete_owner" on public.gestionesjj_encuestas_campanas for delete to authenticated using (public.gestionesjj_is_owner());

-- select: para el dashboard. insert: para la captura retroactiva (el owner
-- transcribe encuestas en papel directamente, sin pasar por el RPC publico).
create policy "encuestas_respuestas_select_owner" on public.gestionesjj_encuestas_respuestas for select to authenticated using (public.gestionesjj_is_owner());
create policy "encuestas_respuestas_insert_owner" on public.gestionesjj_encuestas_respuestas for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "encuestas_respuestas_delete_owner" on public.gestionesjj_encuestas_respuestas for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
drop trigger if exists gestionesjj_encuestas_campanas_set_updated_at on public.gestionesjj_encuestas_campanas;
create trigger gestionesjj_encuestas_campanas_set_updated_at before update on public.gestionesjj_encuestas_campanas for each row execute function public.gestionesjj_set_updated_at();

-- ============================================================
-- RPC PUBLICA 1: consultar una campana por token (pantalla de ingreso)
-- ============================================================
create or replace function public.gestionesjj_public_encuesta_info(p_token uuid)
returns table (campana_id uuid, titulo text, anio integer, activa boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.titulo, c.anio, c.activa
  from public.gestionesjj_encuestas_campanas c
  where c.token = p_token;
$$;

revoke execute on function public.gestionesjj_public_encuesta_info(uuid) from public;
grant execute on function public.gestionesjj_public_encuesta_info(uuid) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA 2: enviar una respuesta anonima
-- ============================================================
create or replace function public.gestionesjj_public_encuesta_responder(
  p_token uuid,
  p_edad_rango text,
  p_genero text,
  p_trabaja boolean,
  p_primera_generacion boolean,
  p_fuente_conocimiento text,
  p_razones_universidad text[],
  p_razones_universidad_otro text,
  p_razones_carrera text[],
  p_razones_carrera_otro text,
  p_primera_opcion boolean,
  p_quien_influyo text,
  p_expectativas_carrera text[],
  p_expectativa_universidad text[],
  p_expectativa_abierta text,
  p_satisfaccion_eleccion smallint,
  p_probabilidad_recomendar smallint,
  p_comentario text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  campana record;
  v_id uuid;
begin
  select * into campana from public.gestionesjj_encuestas_campanas where token = p_token;
  if campana is null or not campana.activa then
    raise exception 'Esta encuesta ya no está disponible.';
  end if;

  insert into public.gestionesjj_encuestas_respuestas (
    campana_id, origen, edad_rango, genero, trabaja, primera_generacion,
    fuente_conocimiento, razones_universidad, razones_universidad_otro,
    razones_carrera, razones_carrera_otro, primera_opcion, quien_influyo,
    expectativas_carrera, expectativa_universidad, expectativa_abierta,
    satisfaccion_eleccion, probabilidad_recomendar, comentario
  ) values (
    campana.id, 'en_linea', p_edad_rango, p_genero, p_trabaja, p_primera_generacion,
    p_fuente_conocimiento, p_razones_universidad, nullif(btrim(coalesce(p_razones_universidad_otro, '')), ''),
    p_razones_carrera, nullif(btrim(coalesce(p_razones_carrera_otro, '')), ''), p_primera_opcion, p_quien_influyo,
    p_expectativas_carrera, p_expectativa_universidad, nullif(btrim(coalesce(p_expectativa_abierta, '')), ''),
    p_satisfaccion_eleccion, p_probabilidad_recomendar, nullif(btrim(coalesce(p_comentario, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.gestionesjj_public_encuesta_responder(
  uuid, text, text, boolean, boolean, text, text[], text, text[], text, boolean, text, text[], text[], text, smallint, smallint, text
) from public;
grant execute on function public.gestionesjj_public_encuesta_responder(
  uuid, text, text, boolean, boolean, text, text[], text, text[], text, boolean, text, text[], text[], text, smallint, smallint, text
) to anon, authenticated;
