-- Migraciones pendientes (ver supabase/PENDIENTES.md). Pegar todo en Supabase → SQL Editor → Run.

-- ===== 066_gestionesjj_motivo_paciente.sql =====
-- Hoja de datos generales: «¿Qué le gustaría trabajar?» en palabras del paciente.
-- Columna aparte de motivo_consulta (que es del terapeuta): es el punto de partida de la ficha 1.1.
-- La RPC pública se llama ANTES de gestionesjj_public_datos_save (que cierra el enlace).

alter table public.gestionesjj_pacientes
  add column if not exists motivo_paciente text
  check (motivo_paciente is null or length(motivo_paciente) <= 2000);

create or replace function public.gestionesjj_public_datos_motivo(p_token uuid, p_motivo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if p_token is null then
    return 'invalido';
  end if;
  select id, datos_completados_at into p from public.gestionesjj_pacientes where datos_token = p_token for update;
  if p is null then
    return 'invalido';
  end if;
  if p.datos_completados_at is not null then
    return 'completado';
  end if;
  if v_motivo is not null and length(v_motivo) > 2000 then
    v_motivo := left(v_motivo, 2000);
  end if;
  update public.gestionesjj_pacientes set motivo_paciente = v_motivo where id = p.id;
  return 'guardado';
end;
$$;

revoke execute on function public.gestionesjj_public_datos_motivo(uuid, text) from public;
grant execute on function public.gestionesjj_public_datos_motivo(uuid, text) to anon, authenticated;
