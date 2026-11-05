-- Pagos por otro monto: abonos a favor y saldos pendientes entre sesiones.
--
-- - monto_pagado: lo que el paciente entregó realmente en esa cita. null =
--   pagó exactamente lo que correspondía (así quedan todas las citas ya
--   pagadas, sin cambios).
-- - Saldo del paciente = Σ (monto_pagado − monto) de sus citas pagadas con
--   monto_pagado. Positivo: tiene saldo A FAVOR (abonado). Negativo: tiene
--   un PENDIENTE de sesiones anteriores.
-- - A pagar en la siguiente cita = monto de la cita − saldo.
-- - Al marcar "Pagada" sin otro monto, se registra que pagó justo lo que le
--   tocaba (monto − saldo), así el saldo vuelve a cero. Con "Otro monto" se
--   registra lo recibido y la diferencia pasa a la siguiente sesión.
-- - Solo se suman montos en la misma moneda de la cita.

alter table public.gestionesjj_citas
  add column if not exists monto_pagado numeric(10, 2) check (monto_pagado is null or monto_pagado >= 0);

-- Saldo del paciente en una moneda, sin contar una cita (la que se está cobrando).
create or replace function public.gestionesjj_saldo_paciente(
  p_paciente_id uuid,
  p_moneda text default 'GTQ',
  p_excluir_cita uuid default null
)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(c.monto_pagado - c.monto), 0)::numeric(10, 2)
  from public.gestionesjj_citas c
  where c.paciente_id = p_paciente_id
    and c.pagada
    and c.monto_pagado is not null
    and c.monto is not null
    and coalesce(c.moneda, 'GTQ') = coalesce(p_moneda, 'GTQ')
    and (p_excluir_cita is null or c.id <> p_excluir_cita);
$$;

revoke execute on function public.gestionesjj_saldo_paciente(uuid, text, uuid) from public, anon;
grant execute on function public.gestionesjj_saldo_paciente(uuid, text, uuid) to authenticated;

-- Marca o desmarca una cita como pagada. p_monto_recibido = null: pagó lo que
-- le tocaba (incluido el saldo anterior). RLS de gestionesjj_citas aplica
-- (security invoker): solo el psicólogo puede usarla.
create or replace function public.gestionesjj_registrar_pago(
  p_cita_id uuid,
  p_pagada boolean,
  p_monto_recibido numeric default null
)
returns table (monto numeric, monto_pagado numeric, saldo_anterior numeric, saldo_nuevo numeric)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c record;
  v_saldo numeric(10, 2);
  v_pagado numeric(10, 2);
begin
  if p_monto_recibido is not null and (p_monto_recibido < 0 or p_monto_recibido > 99999999) then
    raise exception 'El monto recibido no es válido.';
  end if;

  if not coalesce(p_pagada, false) then
    update public.gestionesjj_citas
    set pagada = false, pagada_at = null, monto_pagado = null
    where id = p_cita_id
    returning * into c;
    if c is null then raise exception 'La cita no existe.'; end if;
    monto := c.monto; monto_pagado := null;
    saldo_anterior := public.gestionesjj_saldo_paciente(c.paciente_id, c.moneda, c.id);
    saldo_nuevo := saldo_anterior;
    return next; return;
  end if;

  -- Marcar pagada (el trigger fija el monto con la tarifa si aún no tiene).
  update public.gestionesjj_citas
  set pagada = true, pagada_at = coalesce(pagada_at, now())
  where id = p_cita_id
  returning * into c;
  if c is null then raise exception 'La cita no existe.'; end if;

  v_saldo := case when c.paciente_id is null then 0
                  else public.gestionesjj_saldo_paciente(c.paciente_id, c.moneda, c.id) end;

  if p_monto_recibido is not null then
    if c.monto is null then
      raise exception 'Define primero el monto de la cita (o la tarifa del paciente) para registrar otro monto.';
    end if;
    v_pagado := p_monto_recibido;
  elsif c.monto is not null and v_saldo <> 0 then
    -- Pagó justo lo que le tocaba: monto menos el saldo (sin bajar de cero).
    v_pagado := greatest(c.monto - v_saldo, 0);
  else
    v_pagado := null;
  end if;

  -- Si lo recibido es exactamente el monto y no había saldo, no hace falta registrarlo.
  if v_pagado is not null and v_saldo = 0 and v_pagado = c.monto then
    v_pagado := null;
  end if;

  update public.gestionesjj_citas set monto_pagado = v_pagado where id = c.id;

  monto := c.monto;
  monto_pagado := v_pagado;
  saldo_anterior := v_saldo;
  saldo_nuevo := v_saldo + coalesce(v_pagado - c.monto, 0);
  return next;
end;
$$;

revoke execute on function public.gestionesjj_registrar_pago(uuid, boolean, numeric) from public, anon;
grant execute on function public.gestionesjj_registrar_pago(uuid, boolean, numeric) to authenticated;
