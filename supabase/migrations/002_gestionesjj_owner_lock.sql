-- Restricts every gestionesjj table to the single authorized coordinator account,
-- without touching Supabase Auth signup settings shared by other apps in this project.
create or replace function public.gestionesjj_is_owner()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() = '9cd61706-a682-4a3f-a063-24022e666436'::uuid;
$$;

grant execute on function public.gestionesjj_is_owner() to authenticated;

drop policy if exists "evaluaciones_select_own" on public.evaluaciones_docentes;
drop policy if exists "evaluaciones_insert_own" on public.evaluaciones_docentes;
drop policy if exists "evaluaciones_update_own" on public.evaluaciones_docentes;
drop policy if exists "evaluaciones_delete_own" on public.evaluaciones_docentes;

create policy "evaluaciones_select_owner"
on public.evaluaciones_docentes
for select
to authenticated
using (public.gestionesjj_is_owner());

create policy "evaluaciones_insert_owner"
on public.evaluaciones_docentes
for insert
to authenticated
with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);

create policy "evaluaciones_update_owner"
on public.evaluaciones_docentes
for update
to authenticated
using (public.gestionesjj_is_owner())
with check (public.gestionesjj_is_owner() and (select auth.uid()) = created_by);

create policy "evaluaciones_delete_owner"
on public.evaluaciones_docentes
for delete
to authenticated
using (public.gestionesjj_is_owner());
