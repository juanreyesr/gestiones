-- Adjuntos en el chat privado docente-estudiante: un mensaje puede llevar
-- un archivo (con o sin texto). Solo agrega columnas nuevas a una tabla
-- existente del modulo Cursos, relaja su constraint de contenido no vacio
-- para permitir mensajes solo-archivo, agrega un bucket privado nuevo y
-- reemplaza una RPC (drop+create, cambia su tipo de retorno) que ya es
-- exclusiva de este modulo: no toca nada de las demas apps de la BD
-- compartida.

alter table public.gestionesjj_estudiante_mensajes
  add column if not exists archivo_path text,
  add column if not exists archivo_nombre text,
  add column if not exists archivo_mime text;

alter table public.gestionesjj_estudiante_mensajes
  drop constraint if exists gestionesjj_estudiante_mensajes_contenido_check;

alter table public.gestionesjj_estudiante_mensajes
  alter column contenido drop not null;

alter table public.gestionesjj_estudiante_mensajes
  add constraint gestionesjj_estudiante_mensajes_contenido_check
  check (contenido is null or char_length(contenido) <= 4000);

alter table public.gestionesjj_estudiante_mensajes
  add constraint gestionesjj_estudiante_mensajes_contenido_o_archivo_check
  check (
    (contenido is not null and char_length(btrim(contenido)) > 0)
    or archivo_path is not null
  );

-- ============================================================
-- BUCKET PRIVADO PARA ADJUNTOS DEL CHAT
-- ============================================================
insert into storage.buckets (id, name, public)
values ('gestionesjj-mensajes-adjuntos', 'gestionesjj-mensajes-adjuntos', false)
on conflict (id) do nothing;

drop policy if exists "gestionesjj_mensajes_adjuntos_storage_select_owner" on storage.objects;
create policy "gestionesjj_mensajes_adjuntos_storage_select_owner"
on storage.objects
for select
to authenticated
using (bucket_id = 'gestionesjj-mensajes-adjuntos' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_mensajes_adjuntos_storage_insert_owner" on storage.objects;
create policy "gestionesjj_mensajes_adjuntos_storage_insert_owner"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'gestionesjj-mensajes-adjuntos' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_mensajes_adjuntos_storage_update_owner" on storage.objects;
create policy "gestionesjj_mensajes_adjuntos_storage_update_owner"
on storage.objects
for update
to authenticated
using (bucket_id = 'gestionesjj-mensajes-adjuntos' and public.gestionesjj_is_owner())
with check (bucket_id = 'gestionesjj-mensajes-adjuntos' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_mensajes_adjuntos_storage_delete_owner" on storage.objects;
create policy "gestionesjj_mensajes_adjuntos_storage_delete_owner"
on storage.objects
for delete
to authenticated
using (bucket_id = 'gestionesjj-mensajes-adjuntos' and public.gestionesjj_is_owner());

-- ============================================================
-- RPC de lectura del estudiante: agrega los campos del adjunto
-- ============================================================
drop function if exists public.gestionesjj_estudiante_mis_mensajes();
create function public.gestionesjj_estudiante_mis_mensajes()
returns table (
  id uuid,
  remitente text,
  contenido text,
  archivo_nombre text,
  tiene_archivo boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.remitente, m.contenido, m.archivo_nombre, (m.archivo_path is not null), m.created_at
  from public.gestionesjj_estudiante_mensajes m
  join public.gestionesjj_estudiantes e on e.id = m.estudiante_id
  where e.auth_user_id = auth.uid()
    and e.activo
  order by m.created_at;
$$;

revoke all on function public.gestionesjj_estudiante_mis_mensajes() from public;
revoke all on function public.gestionesjj_estudiante_mis_mensajes() from anon;
grant execute on function public.gestionesjj_estudiante_mis_mensajes() to authenticated;

-- ============================================================
-- Trigger de notificacion de mensaje: el extracto ahora contempla los
-- mensajes solo-archivo (contenido null), que antes no existian.
-- ============================================================
create or replace function public.gestionesjj_notificar_mensaje_docente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.remitente = 'docente' then
    insert into public.gestionesjj_estudiante_notificaciones (estudiante_id, tipo, meta)
    values (
      new.estudiante_id,
      'mensaje',
      jsonb_build_object('extracto', coalesce(left(new.contenido, 140), new.archivo_nombre, 'Archivo adjunto'))
    );
  end if;
  return new;
end;
$$;
