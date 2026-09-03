-- Enlace publico de solo lectura del "Resumen general" de Coordinacion, para
-- compartir con jefatura: ven todos los trimestres y todos los anios, pero no
-- pueden crear, editar ni borrar nada (no hay ninguna escritura expuesta).
--
-- Diseno: mismo patron que /encuesta/[token] y /datos/[token] — una tabla de
-- enlaces con token uuid, RLS owner-lock, anon sin grants de tabla, y una sola
-- RPC SECURITY DEFINER que entrega los datos ya despersonalizados.
--
-- Privacidad: por defecto el enlace NO expone el nombre del docente (igual que
-- el "Comparativo por curso" en pantalla, que se diseno sin nombres justamente
-- para poder compartirse). Cada enlace puede habilitarlo con `mostrar_docentes`
-- si la jefatura si debe verlos. Tampoco viaja el correo del docente ni las
-- observaciones escritas de cada observacion de clase.

-- ============================================================
-- ENLACES COMPARTIDOS
-- ============================================================
create table if not exists public.gestionesjj_coordinacion_resumen_enlaces (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  etiqueta text not null check (length(btrim(etiqueta)) between 1 and 120),
  token uuid not null unique default gen_random_uuid(),
  activo boolean not null default true,
  mostrar_docentes boolean not null default false,
  vistas integer not null default 0,
  ultima_vista_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gestionesjj_coordinacion_resumen_enlaces_created_by_idx
  on public.gestionesjj_coordinacion_resumen_enlaces (created_by);

-- ============================================================
-- RLS Y GRANTS
-- ============================================================
alter table public.gestionesjj_coordinacion_resumen_enlaces enable row level security;

revoke all on public.gestionesjj_coordinacion_resumen_enlaces from anon;
grant select, insert, update, delete on public.gestionesjj_coordinacion_resumen_enlaces to authenticated;

drop policy if exists "coordinacion_resumen_enlaces_select_owner" on public.gestionesjj_coordinacion_resumen_enlaces;
create policy "coordinacion_resumen_enlaces_select_owner"
on public.gestionesjj_coordinacion_resumen_enlaces
for select to authenticated
using (public.gestionesjj_is_owner());

drop policy if exists "coordinacion_resumen_enlaces_insert_owner" on public.gestionesjj_coordinacion_resumen_enlaces;
create policy "coordinacion_resumen_enlaces_insert_owner"
on public.gestionesjj_coordinacion_resumen_enlaces
for insert to authenticated
with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);

drop policy if exists "coordinacion_resumen_enlaces_update_owner" on public.gestionesjj_coordinacion_resumen_enlaces;
create policy "coordinacion_resumen_enlaces_update_owner"
on public.gestionesjj_coordinacion_resumen_enlaces
for update to authenticated
using (public.gestionesjj_is_owner())
with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);

drop policy if exists "coordinacion_resumen_enlaces_delete_owner" on public.gestionesjj_coordinacion_resumen_enlaces;
create policy "coordinacion_resumen_enlaces_delete_owner"
on public.gestionesjj_coordinacion_resumen_enlaces
for delete to authenticated
using (public.gestionesjj_is_owner());

-- ============================================================
-- RPC PUBLICA: leer el resumen completo (todos los trimestres y anios)
-- Devuelve una sola fila con el estado del enlace y las evaluaciones ya
-- despersonalizadas; el filtro por trimestre/anio se hace en el navegador,
-- para que quien abre el enlace pueda moverse por todo el historial.
-- ============================================================
create or replace function public.gestionesjj_public_resumen_coordinacion(p_token uuid)
returns table (
  estado text,
  etiqueta text,
  mostrar_docentes boolean,
  evaluaciones jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  enlace public.gestionesjj_coordinacion_resumen_enlaces;
begin
  select * into enlace
  from public.gestionesjj_coordinacion_resumen_enlaces e
  where e.token = p_token;

  if not found then
    return query select 'invalido'::text, null::text, false, '[]'::jsonb;
    return;
  end if;

  if not enlace.activo then
    return query select 'inactivo'::text, enlace.etiqueta, enlace.mostrar_docentes, '[]'::jsonb;
    return;
  end if;

  update public.gestionesjj_coordinacion_resumen_enlaces
     set vistas = vistas + 1,
         ultima_vista_at = now()
   where id = enlace.id;

  return query
  select
    'ok'::text,
    enlace.etiqueta,
    enlace.mostrar_docentes,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ev.id,
            'docente_id', ev.docente_id,
            'docente_nombre', case when enlace.mostrar_docentes then ev.docente_nombre else '' end,
            'curso_id', ev.curso_id,
            'curso_nombre', ev.curso_nombre,
            'curso_grupo', ev.curso_grupo,
            'anio', ev.anio,
            'trimestre', ev.trimestre,
            'fecha_observacion', ev.fecha_observacion,
            'puntaje_total', ev.puntaje_total,
            'puntaje_maximo', ev.puntaje_maximo,
            'porcentaje', ev.porcentaje,
            'scores', ev.scores,
            'entrevistas', ev.entrevistas,
            'fortalezas', ev.fortalezas
          )
          order by ev.fecha_observacion desc
        )
        from public.evaluaciones_docentes ev
        where ev.created_by = enlace.created_by
      ),
      '[]'::jsonb
    );
end;
$$;

revoke execute on function public.gestionesjj_public_resumen_coordinacion(uuid) from public;
grant execute on function public.gestionesjj_public_resumen_coordinacion(uuid) to anon, authenticated;
