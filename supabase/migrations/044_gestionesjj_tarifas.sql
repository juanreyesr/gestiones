-- Tarifa por paciente (cada persona paga distinto) y monto de cada cita.
--
-- La tarifa se define en el expediente (editable). Al atender una cita
-- (estado completada) o marcarla pagada, si aun no tiene monto se copia la
-- tarifa vigente del paciente: cambiar la tarifa despues no altera las citas
-- ya cobradas. Solo agrega columnas y un trigger con prefijo gestionesjj_.

alter table public.gestionesjj_pacientes
  add column if not exists tarifa numeric(10, 2) check (tarifa is null or tarifa >= 0),
  add column if not exists tarifa_moneda text not null default 'GTQ' check (tarifa_moneda in ('GTQ', 'USD'));

alter table public.gestionesjj_citas
  add column if not exists monto numeric(10, 2) check (monto is null or monto >= 0),
  add column if not exists moneda text check (moneda is null or moneda in ('GTQ', 'USD'));

create or replace function public.gestionesjj_citas_fijar_monto()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.monto is null and new.paciente_id is not null and (new.estado = 'completada' or new.pagada) then
    select p.tarifa, p.tarifa_moneda into new.monto, new.moneda
    from public.gestionesjj_pacientes p
    where p.id = new.paciente_id;
  end if;
  if new.monto is not null and new.moneda is null then
    new.moneda := 'GTQ';
  end if;
  return new;
end;
$$;

create or replace trigger gestionesjj_citas_fijar_monto
  before insert or update on public.gestionesjj_citas
  for each row execute function public.gestionesjj_citas_fijar_monto();
