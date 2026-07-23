-- Modulo Recursos (fase 3): preguntas del publico (Q&A estilo Slido).
--
-- A diferencia de encuestas (009) y quiz (010), aqui el CONTENIDO lo crean los
-- participantes: escriben preguntas en vivo y las votan; las mas votadas suben.
-- Reutiliza sesiones/participantes/PIN/QR del motor compartido, con tablas
-- propias porque las preguntas ya no pertenecen al owner.
--
-- Moderacion: abierta (las preguntas aparecen de inmediato para todos). El
-- owner modera despues marcando 'respondida'/'oculta' o destacando una.
-- Anonimato: configurable por recurso via gestionesjj_recursos.qa_anonimo.
--
-- Seguridad: igual que 009/010, anon nunca toca las tablas directamente; todo
-- el flujo publico (enviar pregunta, votar, listar) pasa por RPCs
-- SECURITY DEFINER con limites anti-abuso.

alter table public.gestionesjj_recursos
  add column if not exists qa_anonimo boolean not null default false;

create table if not exists public.gestionesjj_recurso_qa_preguntas (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.gestionesjj_recurso_sesiones(id) on delete cascade,
  participante_id uuid not null references public.gestionesjj_recurso_participantes(id) on delete cascade,
  texto text not null,
  estado text not null default 'visible' check (estado in ('visible', 'respondida', 'oculta')),
  destacada boolean not null default false,
  votos integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.gestionesjj_recurso_qa_votos (
  id uuid primary key default gen_random_uuid(),
  pregunta_qa_id uuid not null references public.gestionesjj_recurso_qa_preguntas(id) on delete cascade,
  participante_id uuid not null references public.gestionesjj_recurso_participantes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (pregunta_qa_id, participante_id)
);

create index if not exists gestionesjj_recurso_qa_preguntas_sesion_idx
  on public.gestionesjj_recurso_qa_preguntas (sesion_id, votos desc, created_at);
create index if not exists gestionesjj_recurso_qa_votos_pregunta_idx
  on public.gestionesjj_recurso_qa_votos (pregunta_qa_id);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_recurso_qa_preguntas enable row level security;
alter table public.gestionesjj_recurso_qa_votos enable row level security;

revoke all on public.gestionesjj_recurso_qa_preguntas from anon;
revoke all on public.gestionesjj_recurso_qa_votos from anon;

-- El owner nunca inserta preguntas/votos directamente (llegan via RPC anon).
grant select, update, delete on public.gestionesjj_recurso_qa_preguntas to authenticated;
grant select, delete on public.gestionesjj_recurso_qa_votos to authenticated;

create policy "recurso_qa_preguntas_select_owner" on public.gestionesjj_recurso_qa_preguntas for select to authenticated using (public.gestionesjj_is_owner());
create policy "recurso_qa_preguntas_update_owner" on public.gestionesjj_recurso_qa_preguntas for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "recurso_qa_preguntas_delete_owner" on public.gestionesjj_recurso_qa_preguntas for delete to authenticated using (public.gestionesjj_is_owner());

create policy "recurso_qa_votos_select_owner" on public.gestionesjj_recurso_qa_votos for select to authenticated using (public.gestionesjj_is_owner());
create policy "recurso_qa_votos_delete_owner" on public.gestionesjj_recurso_qa_votos for delete to authenticated using (public.gestionesjj_is_owner());

-- ============================================================
-- REALTIME: el presentador escucha preguntas y votos en vivo.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gestionesjj_recurso_qa_preguntas'
  ) then
    alter publication supabase_realtime add table public.gestionesjj_recurso_qa_preguntas;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gestionesjj_recurso_qa_votos'
  ) then
    alter publication supabase_realtime add table public.gestionesjj_recurso_qa_votos;
  end if;
end $$;

-- ============================================================
-- RPC PUBLICA: enviar una pregunta
-- ============================================================
create or replace function public.gestionesjj_public_qa_enviar(p_participante_id uuid, p_texto text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  part record;
  ses record;
  recurso_tipo text;
  v_texto text := btrim(coalesce(p_texto, ''));
  v_id uuid;
begin
  select * into part from public.gestionesjj_recurso_participantes where id = p_participante_id;
  if part is null then
    raise exception 'Participante no encontrado.';
  end if;

  select * into ses from public.gestionesjj_recurso_sesiones where id = part.sesion_id;
  if ses is null or ses.estado = 'cerrada' then
    raise exception 'Esta sesión ya terminó.';
  end if;

  select r.tipo into recurso_tipo from public.gestionesjj_recursos r where r.id = ses.recurso_id;
  if recurso_tipo <> 'qa' then
    raise exception 'Este recurso no acepta preguntas del público.';
  end if;

  if v_texto = '' then
    raise exception 'La pregunta no puede estar vacía.';
  end if;
  if length(v_texto) > 280 then
    raise exception 'La pregunta es demasiado larga (máximo 280 caracteres).';
  end if;

  if (select count(*) from public.gestionesjj_recurso_qa_preguntas where participante_id = p_participante_id) >= 15 then
    raise exception 'Alcanzaste el límite de preguntas en esta sesión.';
  end if;

  insert into public.gestionesjj_recurso_qa_preguntas (sesion_id, participante_id, texto)
  values (ses.id, p_participante_id, v_texto)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.gestionesjj_public_qa_enviar(uuid, text) from public;
grant execute on function public.gestionesjj_public_qa_enviar(uuid, text) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA: votar (toggle) una pregunta
-- ============================================================
create or replace function public.gestionesjj_public_qa_votar(p_participante_id uuid, p_pregunta_qa_id uuid)
returns table (voto boolean, votos integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  part record;
  preg record;
  ses record;
begin
  select * into part from public.gestionesjj_recurso_participantes where id = p_participante_id;
  if part is null then
    raise exception 'Participante no encontrado.';
  end if;

  select * into preg from public.gestionesjj_recurso_qa_preguntas where id = p_pregunta_qa_id for update;
  if preg is null or preg.estado = 'oculta' then
    raise exception 'Esta pregunta ya no está disponible.';
  end if;

  select * into ses from public.gestionesjj_recurso_sesiones where id = preg.sesion_id;
  if ses is null or ses.id <> part.sesion_id or ses.estado = 'cerrada' then
    raise exception 'No puedes votar en esta sesión.';
  end if;

  perform pg_advisory_xact_lock(hashtext('gestionesjj_recurso_qa_votos_' || p_pregunta_qa_id::text));

  if exists (select 1 from public.gestionesjj_recurso_qa_votos where pregunta_qa_id = p_pregunta_qa_id and participante_id = p_participante_id) then
    delete from public.gestionesjj_recurso_qa_votos where pregunta_qa_id = p_pregunta_qa_id and participante_id = p_participante_id;
    update public.gestionesjj_recurso_qa_preguntas set votos = votos - 1 where id = p_pregunta_qa_id returning votos into votos;
    voto := false;
  else
    insert into public.gestionesjj_recurso_qa_votos (pregunta_qa_id, participante_id) values (p_pregunta_qa_id, p_participante_id);
    update public.gestionesjj_recurso_qa_preguntas set votos = votos + 1 where id = p_pregunta_qa_id returning votos into votos;
    voto := true;
  end if;

  return next;
end;
$$;

revoke execute on function public.gestionesjj_public_qa_votar(uuid, uuid) from public;
grant execute on function public.gestionesjj_public_qa_votar(uuid, uuid) to anon, authenticated;

-- ============================================================
-- RPC PUBLICA: listar preguntas visibles de la sesion del participante
-- ============================================================
create or replace function public.gestionesjj_public_qa_lista(p_participante_id uuid)
returns table (
  id uuid,
  texto text,
  autor_apodo text,
  votos integer,
  estado text,
  destacada boolean,
  yo_vote boolean,
  es_mia boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  part record;
  ses record;
  v_anonimo boolean;
begin
  select * into part from public.gestionesjj_recurso_participantes where id = p_participante_id;
  if part is null then
    return;
  end if;

  select * into ses from public.gestionesjj_recurso_sesiones where id = part.sesion_id;
  if ses is null then
    return;
  end if;

  select coalesce(r.qa_anonimo, false) into v_anonimo from public.gestionesjj_recursos r where r.id = ses.recurso_id;

  return query
    select
      p.id,
      p.texto,
      case when v_anonimo then null else par.apodo end,
      p.votos,
      p.estado,
      p.destacada,
      exists(select 1 from public.gestionesjj_recurso_qa_votos v where v.pregunta_qa_id = p.id and v.participante_id = p_participante_id),
      p.participante_id = p_participante_id,
      p.created_at
    from public.gestionesjj_recurso_qa_preguntas p
    join public.gestionesjj_recurso_participantes par on par.id = p.participante_id
    where p.sesion_id = ses.id and p.estado <> 'oculta'
    order by p.destacada desc, p.votos desc, p.created_at asc;
end;
$$;

revoke execute on function public.gestionesjj_public_qa_lista(uuid) from public;
grant execute on function public.gestionesjj_public_qa_lista(uuid) to anon, authenticated;
