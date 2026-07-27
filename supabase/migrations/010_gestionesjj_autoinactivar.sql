-- Inactivación automática de pacientes sin actividad en 3 meses.
-- Un proceso diario (pg_cron) marca como 'inactivo' a los pacientes activos cuya
-- última sesión finalizada sea de hace más de 3 meses (sin sesión en curso ni citas
-- futuras) y deja registrada una sesión con fecha de hoy que explica el cambio,
-- resume la última sesión y lista sus compromisos/tareas pendientes.

create extension if not exists pg_cron;

alter table public.gestionesjj_sesiones
  add column if not exists auto_generada boolean not null default false;

create or replace function public.gestionesjj_autoinactivar_pacientes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  ult record;
  v_count int := 0;
  v_pendientes text;
  v_fecha text;
  v_resumen text;
begin
  for r in
    select p.id, p.created_by
    from public.gestionesjj_pacientes p
    where p.estado = 'activo'
      and exists (
        select 1 from public.gestionesjj_sesiones s
        where s.paciente_id = p.id and s.estado = 'finalizada'
      )
      and (
        select max(coalesce(s.finalizada_at, s.iniciada_at))
        from public.gestionesjj_sesiones s
        where s.paciente_id = p.id and s.estado = 'finalizada'
      ) < now() - interval '3 months'
      and not exists (
        select 1 from public.gestionesjj_sesiones s
        where s.paciente_id = p.id and s.estado = 'en_curso'
      )
      and not exists (
        select 1 from public.gestionesjj_citas c
        where c.paciente_id = p.id and c.inicio > now()
          and c.estado in ('pendiente', 'confirmada')
      )
  loop
    -- última sesión real (no autogenerada) para el resumen
    select * into ult
    from public.gestionesjj_sesiones s
    where s.paciente_id = r.id and s.estado = 'finalizada' and s.auto_generada = false
    order by coalesce(s.finalizada_at, s.iniciada_at) desc
    limit 1;

    if ult.id is null then
      select * into ult
      from public.gestionesjj_sesiones s
      where s.paciente_id = r.id and s.estado = 'finalizada'
      order by coalesce(s.finalizada_at, s.iniciada_at) desc
      limit 1;
    end if;

    select string_agg(
             '• ' || (case when c.tipo = 'compromiso' then 'Compromiso: ' else 'Tarea: ' end) || c.descripcion,
             E'\n' order by c.orden)
      into v_pendientes
    from public.gestionesjj_compromisos c
    where c.sesion_id = ult.id and c.cumplido = false;

    v_fecha := to_char(coalesce(ult.finalizada_at, ult.iniciada_at) at time zone 'America/Guatemala', 'DD/MM/YYYY');

    v_resumen :=
      'El estado del paciente cambió automáticamente a INACTIVO por inactividad: ' ||
      'han pasado más de 3 meses desde su última sesión (' || v_fecha || ').' ||
      E'\n\nResumen de la última sesión:\n' ||
      coalesce(nullif(btrim(ult.resumen), ''), 'No se registró un resumen en la última sesión.') ||
      coalesce(E'\n\nAspectos de seguimiento de la última sesión:\n' || nullif(btrim(ult.seguimiento), ''), '') ||
      coalesce(
        E'\n\nCompromisos y tareas pendientes de la última sesión:\n' || v_pendientes,
        E'\n\nLa última sesión no dejó compromisos ni tareas pendientes.'
      );

    insert into public.gestionesjj_sesiones
      (paciente_id, estado, modalidad, tema, notas, resumen, seguimiento, resumen_origen,
       iniciada_at, finalizada_at, auto_generada, created_by)
    values
      (r.id, 'finalizada', null, null, null, v_resumen, null, 'manual',
       now(), now(), true, r.created_by);

    update public.gestionesjj_pacientes set estado = 'inactivo' where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.gestionesjj_autoinactivar_pacientes() from public;
grant execute on function public.gestionesjj_autoinactivar_pacientes() to authenticated;

-- Ejecución diaria a las 07:00 UTC (01:00 en America/Guatemala).
-- cron.schedule hace upsert por nombre, así que es seguro re-ejecutarlo.
select cron.schedule(
  'gestionesjj_autoinactivar_diario',
  '0 7 * * *',
  $$select public.gestionesjj_autoinactivar_pacientes();$$
);
