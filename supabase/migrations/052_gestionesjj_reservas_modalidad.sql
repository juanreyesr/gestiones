-- Modalidad (presencial / virtual) de las reservas de Calendly, deducida del
-- evento de Google Calendar (enlace de Meet o Zoom, campo de ubicacion,
-- nombre del tipo de evento). Se muestra en el aviso de Telegram y en el
-- panel, y la cita creada al resolver la reserva toma esa modalidad.
-- Solo toca objetos del modulo Clinica.

alter table public.gestionesjj_google_reservas
  add column if not exists modalidad text,
  add column if not exists ubicacion text;

alter table public.gestionesjj_google_reservas
  drop constraint if exists gestionesjj_google_reservas_modalidad_check;
alter table public.gestionesjj_google_reservas
  add constraint gestionesjj_google_reservas_modalidad_check
  check (modalidad is null or modalidad in ('presencial', 'virtual'));
