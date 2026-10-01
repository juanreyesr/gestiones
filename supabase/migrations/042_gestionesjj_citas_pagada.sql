-- Control de pago por cita: casilla "Pagada" en cada cita.
-- Una cita completada (atendida) con pagada = false cuenta como pendiente de pago.
--
-- Solo agrega columnas a gestionesjj_citas (las politicas RLS existentes ya
-- permiten al propietario actualizarlas).

alter table public.gestionesjj_citas
  add column if not exists pagada boolean not null default false,
  add column if not exists pagada_at timestamptz;

-- Busqueda rapida de citas atendidas sin pagar (tablero e historial del paciente).
create index if not exists gestionesjj_citas_sin_pagar_idx
  on public.gestionesjj_citas (paciente_id, inicio)
  where estado = 'completada' and pagada = false;
