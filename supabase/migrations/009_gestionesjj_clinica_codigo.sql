-- Codigo de acceso del area Clinica: una segunda barrera despues del inicio
-- de sesion, para que nadie mas pueda abrir los expedientes clinicos en un
-- dispositivo que quedo con la sesion abierta.
--
-- La columna se crea vacia a proposito. El valor real se define desde la
-- aplicacion ("Codigo de Clinica" en el menu principal) y no se versiona en
-- este repositorio, que es publico. Mientras la columna este vacia el area
-- no pide codigo, de modo que nadie queda fuera por accidente.
alter table public.gestionesjj_config
  add column if not exists clinica_codigo text;
