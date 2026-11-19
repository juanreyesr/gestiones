# Fichas terapéuticas JJR — especificación (v1, lote 1)

Autor clínico: M. A. Juan J. Reyes. Biblioteca propia de fichas de trabajo de terapia cognitivo-conductual, organizada por etapas del tratamiento. Contenido ORIGINAL: no copiar ni parafrasear de cerca materiales comerciales (Ruta TCC, PsychAtlas u otros) ni manuales con derechos; se redacta desde los principios de la TCC con respaldo empírico.

## Etapas (biblioteca completa; este lote implementa la 1 y la 2)
1. Evaluación y formulación · 2. Psicoeducación · 3. Técnicas cognitivas · 4. Técnicas conductuales · 5. Prevención de recaídas.
Numeración «etapa.n» (1.1, 1.2…, 2.1…), visible en todas partes.

## Lote 1 (8 fichas)
| Nº | Título | Para qué | Base |
| --- | --- | --- | --- |
| 1.1 | Mi motivo de consulta y mis metas | Definir el problema en palabras propias y metas concretas, medibles y alcanzables, con un 0–10 de cuánto le afecta hoy | Formulación de metas en TCC (metas SMART adaptadas) |
| 1.2 | Línea de vida del problema | Cuándo empezó, momentos en que mejoró o empeoró, qué pasaba entonces, qué lo mantiene hoy | Formulación longitudinal (factores predisponentes, precipitantes, de mantenimiento y protectores) |
| 1.3 | Mi ciclo: situación, pensamiento, emoción, cuerpo y conducta | Registrar 2 o 3 momentos recientes y ver el ciclo | Modelo cognitivo (Beck); «cinco áreas» (Padesky y Greenberger) |
| 1.4 | Lo que me importa: mis valores | Identificar valores por áreas (familia, pareja, trabajo/estudio, salud, amistades, ocio, espiritualidad) y una acción pequeña por valor | Clarificación de valores (terapia de aceptación y compromiso, Hayes) |
| 2.1 | La ansiedad y la respuesta de alarma | Qué es, para qué sirve, por qué se siente así en el cuerpo, por qué es molesta pero no peligrosa; marcar sus propias señales | Psicoeducación de ansiedad (Barlow; Craske) |
| 2.2 | El círculo del desánimo | Cómo el ánimo bajo lleva a hacer menos y hacer menos baja el ánimo; registrar su propio círculo y una salida pequeña | Activación conductual (Martell, Dimidjian y Herman-Dunn) |
| 2.3 | Pensamientos que vuelven: por qué pasan | Diferencia entre resolver y darle vueltas; preguntas «¿por qué?» frente a «¿qué puedo hacer?»; registrar cuándo aparecen | Rumiación (Watkins); terapia metacognitiva (Wells) |
| 2.4 | La trampa de la evitación | Alivio a corto plazo, más miedo a largo plazo; listar lo que evita y qué le cuesta | Modelo de evitación y exposición (Barlow; Craske) |

## Estructura de cada ficha
Cada ficha tiene dos partes:
- **Para el terapeuta** (solo panel): objetivo; cuándo usarla y cuándo no; cómo presentarla en sesión (3–5 pasos); errores frecuentes; cómo revisarla en la siguiente sesión.
- **Para el paciente** (formulario público e impreso):
  - Explicación breve y sencilla (2–4 párrafos cortos, de usted, sin tecnicismos, con un ejemplo cotidiano).
  - Secciones de trabajo con campos.
  - Cierre: «Qué haremos con esto en la próxima sesión».

Tipos de campo:
- `texto` (corto)
- `parrafo` (largo)
- `escala` (0–10, con etiquetas de extremos)
- `lista` (varias entradas de texto: mínimo y máximo de filas)
- `casillas` (opciones múltiples con «Otra»)
- `tabla` (filas × columnas de texto, p. ej. el ciclo de 1.3: situación | pensamiento | emoción e intensidad 0–100 | cuerpo | lo que hice)

Cada campo puede llevar `ayuda` (indicación) y `ejemplo` (texto de muestra en gris). Ningún campo es obligatorio salvo los marcados con `requerido`; se puede enviar con campos vacíos, avisando antes de enviar.

## Integración en el sistema (sin migraciones)
1. **Un solo instrumento** del registro, id `ficha`, con opciones `{ ficha: "1.3" }` (la ficha elegida). Usa todo lo que ya existe: enlace por paciente, guardado automático, consentimiento, envío, aviso por Telegram, respuesta en el expediente, PDF del expediente, «Nueva aplicación» (repetir la ficha).
2. **Al asignar**: selector por etapa con número, título y «para qué» de cada ficha.
3. **En el expediente** (informe de la ficha):
   - La guía «Para el terapeuta», plegable.
   - Las respuestas del paciente bien presentadas (tablas como tablas).
   - Botones «Descargar ficha en blanco (PDF A4)» para imprimirla en consulta y «Descargar respuestas (PDF)».
   - Sin calificación ni alarmas, salvo que el texto libre contenga palabras de riesgo (morir, matarme, suicid…, hacerme daño): en ese caso se marca alarma, como en las demás evaluaciones.
4. **Compromiso**: al asignar una ficha, si el paciente tiene una sesión (en curso o la última), se agrega en esa sesión una tarea «Ficha 1.3 · Mi ciclo… (enviada por enlace)». Si no hay sesión, no se crea y no pasa nada.
5. **Sugeridas**: en el panel de asignar se marcan como «Sugerida por sus resultados» las fichas que corresponden a lo que salió alto en el último EAPI o MCEA:
   - Preocupación y ansiedad o tensión y palpitaciones → 2.1 y 2.4.
   - Ánimo, o tristeza y desgano → 2.2.
   - Pensamientos que vuelven → 2.3.
   - Siempre: 1.1 y 1.3 si el paciente no las ha respondido.
6. Nombre visible para el paciente: «Ficha 1.3 · Mi ciclo: situación, pensamiento, emoción, cuerpo y conducta». Nombre del instrumento en el panel: «Fichas terapéuticas JJR (TCC)».

## Reglas de redacción
De usted; frases cortas; sin siglas ni etiquetas diagnósticas; sin género cuando se pueda; normalizar sin minimizar; sin promesas («suele ayudar», no «va a curarse»); sin indicaciones médicas; nada de exposición por cuenta propia (en 2.4 solo se observa y se lista; la exposición se planifica con el terapeuta).
