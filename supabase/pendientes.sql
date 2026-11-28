-- Migraciones pendientes (ver supabase/PENDIENTES.md). Pegar todo en Supabase → SQL Editor → Run.

-- ===== 074_gestionesjj_cas_orden_inscripcion.sql =====
-- CAS UPANA: número de orden de inscripción, automático y fijo.
-- Sirve para desempatar: si dos aspirantes quieren el mismo día y horario, tiene prioridad
-- el que se inscribió primero (número menor).
-- * Las inscripciones que ya existen se numeran según su fecha y hora de registro
--   (created_at, la hora del servidor al guardar), de la más antigua a la más reciente.
-- * Las nuevas toman el siguiente número de una secuencia al guardarse.
-- * El número no cambia aunque se borre a otro aspirante (puede quedar un hueco), y no se
--   puede editar desde /admin: el código nunca lo envía.

create sequence if not exists public.gestionesjj_cas_aspirantes_orden_seq;

alter table public.gestionesjj_cas_aspirantes
  add column if not exists orden_inscripcion bigint;

-- Numerar las existentes por fecha y hora de registro (el id solo desempata un empate exacto).
with numeradas as (
  select id,
         coalesce((select max(orden_inscripcion) from public.gestionesjj_cas_aspirantes), 0)
           + row_number() over (order by created_at, id) as n
  from public.gestionesjj_cas_aspirantes
  where orden_inscripcion is null
)
update public.gestionesjj_cas_aspirantes a
set orden_inscripcion = numeradas.n
from numeradas
where a.id = numeradas.id;

-- La secuencia sigue después del mayor número asignado.
select setval(
  'public.gestionesjj_cas_aspirantes_orden_seq',
  coalesce((select max(orden_inscripcion) from public.gestionesjj_cas_aspirantes), 0) + 1,
  false
);

alter sequence public.gestionesjj_cas_aspirantes_orden_seq
  owned by public.gestionesjj_cas_aspirantes.orden_inscripcion;

alter table public.gestionesjj_cas_aspirantes
  alter column orden_inscripcion set default nextval('public.gestionesjj_cas_aspirantes_orden_seq'),
  alter column orden_inscripcion set not null;

create unique index if not exists gestionesjj_cas_aspirantes_orden_uidx
  on public.gestionesjj_cas_aspirantes (orden_inscripcion);

-- El propietario inserta desde /admin con su sesión: necesita usar la secuencia.
-- (La RPC pública es SECURITY DEFINER y no lo necesita; anon no recibe nada.)
grant usage on sequence public.gestionesjj_cas_aspirantes_orden_seq to authenticated;
revoke all on sequence public.gestionesjj_cas_aspirantes_orden_seq from anon;
