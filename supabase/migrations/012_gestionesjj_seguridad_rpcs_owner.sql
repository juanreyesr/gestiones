-- Endurecimiento de seguridad: dos RPCs pensadas solo para el owner
-- (gestionesjj_crear_sesion y gestionesjj_activar_pregunta) resultaron
-- ejecutables tambien por el rol anon, pese a que sus migraciones originales
-- (009/010) ya hacian `revoke execute ... from public`.
--
-- Causa: en este proyecto de Supabase existen privilegios por defecto que
-- otorgan EXECUTE a anon directamente (no via PUBLIC), asi que revocar solo
-- de PUBLIC no alcanza — hay que revocar explicitamente de anon, igual que ya
-- se hizo correctamente para gestionesjj_aprobar_solicitud en 007.
--
-- Ambas funciones ya validan gestionesjj_is_owner() por dentro, asi que no
-- habia una fuga de datos activa; esto es defensa en profundidad para que
-- ademas quede bloqueado a nivel de permisos.

revoke execute on function public.gestionesjj_crear_sesion(uuid) from anon;
revoke execute on function public.gestionesjj_activar_pregunta(uuid, uuid) from anon;
