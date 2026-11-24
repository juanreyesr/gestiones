-- Plataforma pública de tests psicométricos (www.juanjreyes.org/tests).
--
-- AISLADA del resto de proyectos que comparten esta base:
--  * Las cuentas NO usan auth.users (Supabase Auth): las personas que se registran para
--    hacer un test no obtienen sesión de Supabase y no pueden entrar a ninguna otra tabla.
--  * Contraseñas cifradas con scrypt y sesión firmada, todo en el servidor (service_role).
--  * RLS activo sin políticas para anon/authenticated: solo el servidor lee y escribe; el
--    propietario (gestionesjj_is_owner) puede consultar desde /admin.
--  * Prefijo propio tests_: no modifica ninguna tabla, función ni política existente.

create table if not exists public.tests_usuarios (
  id uuid primary key default gen_random_uuid(),
  correo text not null check (correo = lower(btrim(correo)) and char_length(correo) between 5 and 200),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 160),
  fecha_nacimiento date not null,
  pais text check (pais is null or char_length(pais) <= 60),
  telefono text check (telefono is null or char_length(telefono) <= 40),
  genero text check (genero is null or char_length(genero) <= 40),
  ocupacion text check (ocupacion is null or char_length(ocupacion) <= 120),
  password_hash text not null,
  -- Se incrementa al cambiar la contraseña: invalida las sesiones anteriores.
  sesion_version integer not null default 1,
  consentimiento_datos_at timestamptz not null,
  consentimiento_version text not null,
  acepta_contacto boolean not null default false,
  acepta_contacto_at timestamptz,
  intereses text[] not null default '{}',
  created_at timestamptz not null default now(),
  ultimo_ingreso_at timestamptz
);
create unique index if not exists tests_usuarios_correo_uq on public.tests_usuarios (correo);

create table if not exists public.tests_compras (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.tests_usuarios(id) on delete cascade,
  instrumento text not null check (char_length(instrumento) <= 40),
  tipo text not null check (tipo in ('primera', 'reevaluacion')),
  monto numeric(10, 2) not null check (monto >= 0),
  moneda text not null default 'USD',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagada', 'reembolsada', 'cancelada')),
  paypal_order_id text unique,
  paypal_capture_id text unique,
  created_at timestamptz not null default now(),
  pagada_at timestamptz
);
create index if not exists tests_compras_usuario_idx on public.tests_compras (usuario_id, created_at desc);

create table if not exists public.tests_aplicaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.tests_usuarios(id) on delete cascade,
  compra_id uuid not null unique references public.tests_compras(id) on delete cascade,
  instrumento text not null check (char_length(instrumento) <= 40),
  opciones jsonb not null default '{}'::jsonb check (jsonb_typeof(opciones) = 'object' and octet_length(opciones::text) <= 2000),
  borrador jsonb check (borrador is null or octet_length(borrador::text) <= 60000),
  borrador_at timestamptz,
  datos jsonb check (datos is null or octet_length(datos::text) <= 60000),
  consentimiento_at timestamptz,
  consentimiento_version text,
  alerta boolean not null default false,
  created_at timestamptz not null default now(),
  completada_at timestamptz
);
create index if not exists tests_aplicaciones_usuario_idx on public.tests_aplicaciones (usuario_id, instrumento, completada_at);

alter table public.tests_usuarios enable row level security;
alter table public.tests_compras enable row level security;
alter table public.tests_aplicaciones enable row level security;

revoke all on public.tests_usuarios from anon, authenticated;
revoke all on public.tests_compras from anon, authenticated;
revoke all on public.tests_aplicaciones from anon, authenticated;

-- Solo lectura para el propietario (panel /admin → «Tests en línea»). Escribe únicamente el servidor.
-- tests_usuarios: todas las columnas menos password_hash y sesion_version (ni el propietario las ve).
grant select (id, correo, nombre, fecha_nacimiento, pais, telefono, genero, ocupacion, consentimiento_datos_at,
  consentimiento_version, acepta_contacto, acepta_contacto_at, intereses, created_at, ultimo_ingreso_at)
  on public.tests_usuarios to authenticated;
grant select on public.tests_compras to authenticated;
grant select on public.tests_aplicaciones to authenticated;

drop policy if exists "tests_usuarios_select_owner" on public.tests_usuarios;
create policy "tests_usuarios_select_owner" on public.tests_usuarios
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "tests_compras_select_owner" on public.tests_compras;
create policy "tests_compras_select_owner" on public.tests_compras
  for select to authenticated using (public.gestionesjj_is_owner());
drop policy if exists "tests_aplicaciones_select_owner" on public.tests_aplicaciones;
create policy "tests_aplicaciones_select_owner" on public.tests_aplicaciones
  for select to authenticated using (public.gestionesjj_is_owner());
