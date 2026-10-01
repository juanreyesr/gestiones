-- Propuestas de la IA (tecnicas, terapias y evaluaciones) guardadas en el
-- historial de cada sesion: [{ tipo, nombre, justificacion }]. Solo se
-- guardan las que el psicologo deja marcadas al cerrar la sesion.

alter table public.gestionesjj_sesiones
  add column if not exists propuestas_ia jsonb not null default '[]'::jsonb;
