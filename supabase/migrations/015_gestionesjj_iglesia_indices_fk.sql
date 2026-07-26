-- Indices para dos llaves foraneas del area Iglesia que el linter de Supabase
-- marco sin cubrir. Ambas se recorren en operaciones de borrado, no de lectura:
--
--   items.grupo_id  -> al borrar un grupo, Postgres busca las filas a eliminar
--                      en cascada. El indice compuesto (tablero_id, grupo_id,
--                      orden) no sirve para eso porque su columna principal es
--                      tablero_id.
--   items.evento_id -> al borrar un evento, Postgres busca los pendientes que
--                      lo referencian para dejarlos en null.
--
-- No se indexa created_by en ninguna tabla del area, aunque el linter tambien
-- lo sugiera: la app tiene un solo duenio, asi que esa columna tiene un unico
-- valor y un indice sobre ella nunca se usaria — solo costaria escrituras. Es
-- el mismo criterio que sigue el resto del proyecto.

create index if not exists gestionesjj_iglesia_items_grupo_idx
  on public.gestionesjj_iglesia_items (grupo_id);

create index if not exists gestionesjj_iglesia_items_evento_idx
  on public.gestionesjj_iglesia_items (evento_id)
  where evento_id is not null;
