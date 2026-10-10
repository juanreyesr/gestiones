-- Fecha de nacimiento del docente (Control de docentes): alimenta la alerta de
-- cumpleaños en Coordinacion (desde 7 dias antes) y el aviso de Telegram del
-- dia del cumpleaños con el boton de WhatsApp para felicitarlo. Null = sin
-- registrar.
--
-- Solo agrega una columna nueva a una tabla gestionesjj_.

alter table public.gestionesjj_docentes
  add column if not exists fecha_nacimiento date
    check (fecha_nacimiento is null or fecha_nacimiento >= date '1900-01-01');
