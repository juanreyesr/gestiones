# Migraciones pendientes de aplicar

El conector de Supabase pide confirmación en cada cambio y en el teléfono no aparece (en tablet o computadora sí),
así que las migraciones se acumulan aquí y se aplican **juntas desde la computadora**.

## Cómo aplicarlas
- **Opción A (más rápida):** Supabase → SQL Editor → nueva consulta → pegar todo
  `supabase/pendientes.sql` → Run. Después avisar a Claude para verificar y vaciar la lista.
- **Opción B:** pedirle a Claude «aplica las migraciones pendientes» desde la tablet o la
  computadora y aprobar cada ventana de Supabase.

## Pendientes
Ninguna por ahora.

## Aplicadas
| Migración | Fecha | Verificación |
| --- | --- | --- |
| `063_gestionesjj_evaluacion_seguimientos.sql` | 2026-11-06 | Tabla con 18 columnas, RLS activo con 4 políticas, tarea pg_cron «7 * * * *» activa y secreto del cron presente. |
| `064_gestionesjj_paciente_documentos.sql` | 2026-11-07 | Bucket privado (20 MB, 9 tipos permitidos) con 4 políticas de Storage; tabla con 14 columnas, RLS activo con 4 políticas y sin acceso anónimo. |
| `065_gestionesjj_informes_avance.sql` | 2026-11-10 | Tabla con 8 columnas, RLS activo con 4 políticas y sin acceso anónimo; RPC pública por token responde «invalido» con un token inexistente (aviso del asesor por SECURITY DEFINER con `anon`: intencional, igual que `gestionesjj_public_informe_get`). |
| `066_gestionesjj_motivo_paciente.sql` | 2026-11-20 | Aplicada por el propietario en el SQL Editor. Verificada por la API pública: la RPC `gestionesjj_public_datos_motivo` responde «invalido» con un token inexistente (ejecutable por `anon`); la columna `motivo_paciente` existe (consultarla como `anon` da «permiso denegado», mientras que una columna inexistente da «does not exist»). |
| `067_gestionesjj_curso_bibliotecas.sql` | 2026-11-20 | Tabla con 4 columnas, RLS activo con 3 políticas del propietario (select, insert, delete), clave primaria (curso, biblioteca), FK a cursos con borrado en cascada y CHECK del id; RPC `gestionesjj_estudiante_bibliotecas_curso` SECURITY DEFINER con `search_path` vacío, ejecutable por `authenticated` y no por `anon`. |
| `068_gestionesjj_cas_aspirantes.sql` | 2026-11-24 | Aplicada por Claude con aprobación del propietario. Tabla con 12 columnas (15 tras la 069), RLS activo con 4 políticas del propietario, índice único del carné; `anon` no puede leer ni insertar. |
| `069_gestionesjj_cas_preinscripcion.sql` | 2026-11-24 | Aplicada por Claude con aprobación del propietario. RPC `gestionesjj_public_cas_preinscripcion` ejecutable por `anon`: responde «invalido» sin consentimiento o sin práctica, «duplicado» con un carné repetido y «ok» al insertar (prueba de punta a punta con 2 registros de prueba, borrados después). |
| `071_gestionesjj_metas.sql` | 2026-11-24 | Aplicada por Claude con aprobación del propietario. `gestionesjj_metas` (12 columnas) y `gestionesjj_meta_avances` (9 columnas), ambas con RLS activo y 4 políticas del propietario; `anon` sin lectura ni inserción; índice único (meta, sesión); el asesor de seguridad no reporta avisos sobre ellas. |
| `070_gestionesjj_cas_formulario_abierto.sql` | 2026-11-24 | Aplicada por Claude con aprobación del propietario. `gestionesjj_cas_config` con RLS activo y 3 políticas del propietario, 1 fila (formulario abierto); `anon` no lee la tabla; la RPC `gestionesjj_public_cas_formulario_estado` es ejecutable por `anon` y responde abierto; la RPC de preinscripción incluye la respuesta «cerrado». |
| `072_tests_plataforma.sql` | 2026-11-24 | Aplicada por Claude con aprobación del propietario. `tests_usuarios`, `tests_compras` y `tests_aplicaciones` con RLS activo y solo una política de lectura del propietario cada una; `anon` sin acceso; `authenticated` sin insertar y sin ver `password_hash`. No modifica tablas ni políticas de otros proyectos. |
| `070_gestionesjj_cas_formulario_abierto.sql` | 2026-11-24 | Aplicada por el propietario. Verificada: tabla `gestionesjj_cas_config` con la fila de configuración (formulario abierto). |
| `073_gestionesjj_cas_campus.sql` | 2026-11-24 | Aplicada por Claude con aprobación del propietario (junto con el borrado del registro de prueba «ZZ-PRUEBA-CAMPUS»). Columna `campus` creada; solo queda la RPC con `p_campus` (9 parámetros), ejecutable por `anon`, que responde «invalido» sin campus; 0 aspirantes, formulario abierto. |
