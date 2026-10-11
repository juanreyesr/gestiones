-- Portada editable del sitio publico (GestionesJJ -> "Editar pagina").
--
-- Dos filas: 'borrador' (lo que se edita, con autoguardado) y 'publicado' (lo
-- que ven los visitantes en /es y /en). El contenido es un JSON con los textos
-- en espanol e ingles, las imagenes del carrusel y la foto de la biografia;
-- lo que falte se completa con los textos por defecto de sitio-web/plantilla.mjs.
--
-- Seguridad: solo la cuenta duena (gestionesjj_is_owner) lee y escribe desde
-- el navegador. La portada publica lee 'publicado' en el servidor con service
-- role, y publicar pasa por /api/sitio/portada/publicar.

create table if not exists public.gestionesjj_sitio_portada (
  id text primary key check (id in ('borrador', 'publicado')),
  contenido jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.gestionesjj_sitio_portada enable row level security;

drop policy if exists gestionesjj_sitio_portada_select_owner on public.gestionesjj_sitio_portada;
create policy gestionesjj_sitio_portada_select_owner
  on public.gestionesjj_sitio_portada
  for select to authenticated
  using (public.gestionesjj_is_owner());

drop policy if exists gestionesjj_sitio_portada_insert_owner on public.gestionesjj_sitio_portada;
create policy gestionesjj_sitio_portada_insert_owner
  on public.gestionesjj_sitio_portada
  for insert to authenticated
  with check (public.gestionesjj_is_owner() and id = 'borrador');

drop policy if exists gestionesjj_sitio_portada_update_owner on public.gestionesjj_sitio_portada;
create policy gestionesjj_sitio_portada_update_owner
  on public.gestionesjj_sitio_portada
  for update to authenticated
  using (public.gestionesjj_is_owner() and id = 'borrador')
  with check (public.gestionesjj_is_owner() and id = 'borrador');

revoke all on table public.gestionesjj_sitio_portada from anon;

-- ============================================================
-- STORAGE: bucket PUBLICO para las imagenes de la portada (se muestran a
-- cualquier visitante). Solo la cuenta duena sube o borra; maximo 8 MB y
-- solo imagenes.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gestionesjj-sitio', 'gestionesjj-sitio', true, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura por la API (listar/borrar); las URL publicas no la necesitan.
drop policy if exists "gestionesjj_sitio_storage_select_owner" on storage.objects;
create policy "gestionesjj_sitio_storage_select_owner"
on storage.objects
for select
to authenticated
using (bucket_id = 'gestionesjj-sitio' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_sitio_storage_insert_owner" on storage.objects;
create policy "gestionesjj_sitio_storage_insert_owner"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'gestionesjj-sitio' and public.gestionesjj_is_owner());

drop policy if exists "gestionesjj_sitio_storage_delete_owner" on storage.objects;
create policy "gestionesjj_sitio_storage_delete_owner"
on storage.objects
for delete
to authenticated
using (bucket_id = 'gestionesjj-sitio' and public.gestionesjj_is_owner());
