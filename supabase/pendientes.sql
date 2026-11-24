-- Migraciones pendientes (ver supabase/PENDIENTES.md). Pegar todo en Supabase → SQL Editor → Run.

-- ===== 068_gestionesjj_cas_aspirantes.sql =====
-- CAS (Centro de Asistencia Social, Universidad Panamericana): estudiantes aspirantes a hacer
-- su práctica en el centro. Primera fase: solo la base de datos de aspirantes; los horarios,
-- asignaciones y expedientes de práctica vendrán en tablas propias cuando se definan.
-- Solo el propietario (gestionesjj_is_owner) lee y escribe: son datos personales de estudiantes.

create table if not exists public.gestionesjj_cas_aspirantes (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null check (char_length(btrim(nombre_completo)) between 3 and 160),
  carne text not null check (char_length(btrim(carne)) between 1 and 40),
  practica text not null check (practica in ('consejeria_cuarto', 'profesional_quinto')),
  telefono text check (telefono is null or char_length(telefono) <= 40),
  correo_institucional text check (correo_institucional is null or correo_institucional ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  correo_personal text check (correo_personal is null or correo_personal ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  estado text not null default 'aspirante'
    check (estado in ('aspirante', 'contactado', 'en_proceso', 'aceptado', 'en_espera', 'no_continua')),
  notas text check (notas is null or char_length(notas) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- El carné (ID UPANA) no se repite: evita registrar dos veces al mismo estudiante.
create unique index if not exists gestionesjj_cas_aspirantes_carne_uidx
  on public.gestionesjj_cas_aspirantes (lower(btrim(carne)));
create index if not exists gestionesjj_cas_aspirantes_practica_idx
  on public.gestionesjj_cas_aspirantes (practica, estado);

create or replace function public.gestionesjj_cas_aspirantes_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists gestionesjj_cas_aspirantes_touch on public.gestionesjj_cas_aspirantes;
create trigger gestionesjj_cas_aspirantes_touch
  before update on public.gestionesjj_cas_aspirantes
  for each row execute function public.gestionesjj_cas_aspirantes_touch();

alter table public.gestionesjj_cas_aspirantes enable row level security;

drop policy if exists "cas_aspirantes_select_owner" on public.gestionesjj_cas_aspirantes;
drop policy if exists "cas_aspirantes_insert_owner" on public.gestionesjj_cas_aspirantes;
drop policy if exists "cas_aspirantes_update_owner" on public.gestionesjj_cas_aspirantes;
drop policy if exists "cas_aspirantes_delete_owner" on public.gestionesjj_cas_aspirantes;
create policy "cas_aspirantes_select_owner" on public.gestionesjj_cas_aspirantes for select to authenticated using (public.gestionesjj_is_owner());
create policy "cas_aspirantes_insert_owner" on public.gestionesjj_cas_aspirantes for insert to authenticated with check (public.gestionesjj_is_owner());
create policy "cas_aspirantes_update_owner" on public.gestionesjj_cas_aspirantes for update to authenticated using (public.gestionesjj_is_owner()) with check (public.gestionesjj_is_owner());
create policy "cas_aspirantes_delete_owner" on public.gestionesjj_cas_aspirantes for delete to authenticated using (public.gestionesjj_is_owner());

revoke all on public.gestionesjj_cas_aspirantes from anon;
