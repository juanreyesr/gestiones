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
