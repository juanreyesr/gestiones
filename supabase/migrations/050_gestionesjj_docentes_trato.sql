-- Trato personalizado del docente para los mensajes de WhatsApp del control de
-- revision ("querida Elly", "estimada Lcda. Corado"): va despues del saludo
-- ("¡Buenos días, querida Elly!"). Null = se usa su primer nombre.
--
-- Solo agrega una columna nueva a una tabla gestionesjj_.

alter table public.gestionesjj_docentes
  add column if not exists trato text check (trato is null or length(btrim(trato)) between 1 and 60);
