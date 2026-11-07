# Migraciones pendientes de aplicar

El conector de Supabase pide confirmación en cada cambio y en el teléfono no aparece (en tablet o computadora sí),
así que las migraciones se acumulan aquí y se aplican **juntas desde la computadora**.

## Cómo aplicarlas
- **Opción A (más rápida):** Supabase → SQL Editor → nueva consulta → pegar todo
  `supabase/pendientes.sql` → Run. Después avisar a Claude para verificar y vaciar la lista.
- **Opción B:** pedirle a Claude «aplica las migraciones pendientes» desde la tablet o la
  computadora y aprobar cada ventana de Supabase.

## Pendientes
| Migración | Qué habilita | Sin ella |
| --- | --- | --- |
| `064_gestionesjj_paciente_documentos.sql` | Documentos del expediente: fotografías, cartas, materiales, tareas, PDF y Word (bucket privado `gestionesjj-pacientes` + tabla de documentos) | La sección «Documentos y archivos» del expediente muestra que falta esta migración; lo demás funciona igual. |

## Aplicadas
| Migración | Fecha | Verificación |
| --- | --- | --- |
| `063_gestionesjj_evaluacion_seguimientos.sql` | 2026-11-06 | Tabla con 18 columnas, RLS activo con 4 políticas, tarea pg_cron «7 * * * *» activa y secreto del cron presente. |
