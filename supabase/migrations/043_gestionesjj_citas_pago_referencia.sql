-- Pago automatico con PayPal: el webhook (/api/paypal/webhook) marca como
-- pagada la cita del paciente y guarda aqui el ID de la captura de PayPal,
-- para no aplicar dos veces el mismo pago y para revertirlo si se reembolsa.

alter table public.gestionesjj_citas
  add column if not exists pago_referencia text;

create index if not exists gestionesjj_citas_pago_referencia_idx
  on public.gestionesjj_citas (pago_referencia)
  where pago_referencia is not null;
