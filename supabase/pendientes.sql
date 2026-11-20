-- Migraciones pendientes (ver supabase/PENDIENTES.md). Pegar todo en Supabase → SQL Editor → Run.

-- ===== 067_gestionesjj_curso_bibliotecas.sql =====
-- Bibliotecas JJR en el Aula virtual: qué biblioteca está activa en qué curso.
-- El contenido de las bibliotecas vive en el código (src/lib/bibliotecas); aquí solo se guarda la
-- activación por curso. El estudiante no lee la tabla: usa la RPC, que valida inscripción activa,
-- acceso del curso y cuenta activa, igual que las semanas y los contenidos.

create table if not exists public.gestionesjj_curso_bibliotecas (
  curso_id uuid not null references public.gestionesjj_cursos_impartidos(id) on delete cascade,
  biblioteca_id text not null check (biblioteca_id ~ '^[a-z0-9-]{1,60}$'),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  primary key (curso_id, biblioteca_id)
);

alter table public.gestionesjj_curso_bibliotecas enable row level security;

drop policy if exists "curso_bibliotecas_select_owner" on public.gestionesjj_curso_bibliotecas;
drop policy if exists "curso_bibliotecas_insert_owner" on public.gestionesjj_curso_bibliotecas;
drop policy if exists "curso_bibliotecas_delete_owner" on public.gestionesjj_curso_bibliotecas;
create policy "curso_bibliotecas_select_owner" on public.gestionesjj_curso_bibliotecas for select to authenticated using (public.gestionesjj_is_owner());
create policy "curso_bibliotecas_insert_owner" on public.gestionesjj_curso_bibliotecas for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "curso_bibliotecas_delete_owner" on public.gestionesjj_curso_bibliotecas for delete to authenticated using (public.gestionesjj_is_owner());

create or replace function public.gestionesjj_estudiante_bibliotecas_curso(p_curso_id uuid)
returns table (biblioteca_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.biblioteca_id
  from public.gestionesjj_curso_bibliotecas b
  join public.gestionesjj_cursos_impartidos c on c.id = b.curso_id
  join public.gestionesjj_curso_estudiantes ce on ce.curso_id = c.id
  join public.gestionesjj_estudiantes e on e.id = ce.estudiante_id
  where b.curso_id = p_curso_id
    and c.acceso_estudiantes = true
    and ce.estado = 'activo'
    and e.auth_user_id = auth.uid()
    and e.activo
  order by b.created_at;
$$;

revoke all on function public.gestionesjj_estudiante_bibliotecas_curso(uuid) from public;
revoke all on function public.gestionesjj_estudiante_bibliotecas_curso(uuid) from anon;
grant execute on function public.gestionesjj_estudiante_bibliotecas_curso(uuid) to authenticated;
