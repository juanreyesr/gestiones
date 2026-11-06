# Migraciones pendientes de aplicar

El conector de Supabase pide confirmación en cada cambio y en el móvil no aparece,
así que las migraciones se acumulan aquí y se aplican **juntas desde la computadora**.

## Cómo aplicarlas
- **Opción A (más rápida):** Supabase → SQL Editor → nueva consulta → pegar todo
  `supabase/pendientes.sql` → Run. Después avisar a Claude para verificar y vaciar la lista.
- **Opción B:** pedirle a Claude «aplica las migraciones pendientes» con la computadora
  abierta y aprobar cada ventana de Supabase.

## Pendientes
| Migración | Qué habilita | Sin ella |
| --- | --- | --- |
| `063_gestionesjj_evaluacion_seguimientos.sql` | Seguimiento programado de evaluaciones (avisos por Telegram con WhatsApp listo) | Al programar un seguimiento aparece un aviso de que falta la migración; lo demás funciona igual. |
