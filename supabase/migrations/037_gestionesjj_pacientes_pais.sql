-- Pais y zona horaria del paciente (hay pacientes fuera de Guatemala).
--
-- Ambas columnas son opcionales a proposito: si "pais" esta vacio la app lo
-- deduce del "+codigo" del telefono y, si el numero no lo trae, asume
-- Guatemala; si "zona_horaria" esta vacia usa la del pais. Asi todos los
-- expedientes existentes siguen funcionando igual sin reescribir sus
-- telefonos. Se usan para armar el enlace de WhatsApp con el codigo correcto
-- y para escribir la hora de la cita en la hora del paciente.
-- Solo agrega columnas a una tabla del modulo Clinica.

alter table public.gestionesjj_pacientes
  add column if not exists pais text,
  add column if not exists zona_horaria text;

alter table public.gestionesjj_pacientes
  drop constraint if exists gestionesjj_pacientes_pais_check;
alter table public.gestionesjj_pacientes
  add constraint gestionesjj_pacientes_pais_check check (pais is null or pais ~ '^[A-Z]{2}$');

alter table public.gestionesjj_pacientes
  drop constraint if exists gestionesjj_pacientes_zona_horaria_check;
alter table public.gestionesjj_pacientes
  add constraint gestionesjj_pacientes_zona_horaria_check
  check (zona_horaria is null or (length(zona_horaria) <= 64 and zona_horaria ~ '^[A-Za-z_]+(/[A-Za-z_+-]+)+$'));
