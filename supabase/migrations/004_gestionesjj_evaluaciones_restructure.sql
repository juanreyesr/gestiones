-- Only 3 trimestres per year and structured (multiple-choice) interviews/strengths.
do $$
declare
  cname text;
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'evaluaciones_docentes'
  ) then
    select conname into cname
    from pg_constraint
    where conrelid = 'public.evaluaciones_docentes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%trimestre%';
    if cname is not null then
      execute format('alter table public.evaluaciones_docentes drop constraint %I', cname);
    end if;
  end if;
end $$;

alter table public.evaluaciones_docentes
  add constraint evaluaciones_docentes_trimestre_check check (trimestre between 1 and 3);

alter table public.evaluaciones_docentes
  add column if not exists docente_id uuid references public.gestionesjj_docentes(id) on delete set null,
  add column if not exists curso_id uuid references public.gestionesjj_cursos(id) on delete set null,
  add column if not exists entrevistas jsonb not null default '[]'::jsonb,
  add column if not exists fortalezas text[] not null default '{}'::text[];

alter table public.evaluaciones_docentes
  drop column if exists entrevista_estudiante_1,
  drop column if exists entrevista_estudiante_2,
  drop column if exists fortaleza_1,
  drop column if exists fortaleza_2;

create index if not exists evaluaciones_docentes_docente_id_idx on public.evaluaciones_docentes (docente_id);
create index if not exists evaluaciones_docentes_curso_id_idx on public.evaluaciones_docentes (curso_id);
