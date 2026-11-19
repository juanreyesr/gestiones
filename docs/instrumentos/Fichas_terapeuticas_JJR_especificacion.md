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

## v1.1 — Instrucciones guiadas y «Intervención guiada» (decisión del autor)

### A. Instrucciones guiadas para el paciente (todas las fichas, el registro guiado/mapa del MCEA y las fichas futuras)
Problema: títulos como «Mis momentos», «Fila 1», «Situación» no le dicen a la persona qué hacer.
Reglas (trato de **usted** siempre):
1. Cada sección abre con una **invitación concreta en segunda persona**, que dice qué recordar o hacer y para qué. Ej. (1.3): «Comencemos recordando un momento reciente que le haya causado ansiedad o malestar. Piense dónde estaba y qué estaba pasando; con eso iremos identificando, paso a paso, lo que pasó por su mente y su cuerpo.»
2. Cada campo es una **pregunta directa** (no una etiqueta), con su ejemplo debajo: «¿Qué pasó? Cuéntelo en una o dos frases.», «En ese momento, ¿qué pensó? Escriba la frase tal como le cruzó por la mente.», «¿Qué sintió y qué tan fuerte fue, de 0 a 100?»…
3. En tablas, las filas se llaman según su sentido, no «Fila n»: «Primer momento», «Otro momento (opcional)», «Un tercer momento (opcional)»; la primera fila se presenta como la principal y las demás como opcionales. Cada tabla tiene `etiquetaFila` (p. ej. «momento», «meta», «etapa») y `filaOpcionalDesde`.
4. Orden de lo concreto a lo reflexivo; una sola tarea por pregunta; nada de jerga.
5. El contador superior dice «N de M preguntas respondidas».
6. Se aplica igual a la versión impresa (PDF en blanco).
7. MCEA: revisar el registro guiado del formulario (pantallas del mapa: situación, pensamiento, emoción, conducta) y aplicar las mismas reglas SOLO a los textos de presentación de esas pantallas, sin cambiar qué se guarda ni el motor (contenido.ts es generado: si los textos viven ahí, hacer la sustitución en el formulario o en una capa de textos propia, sin editar el archivo generado).

### B. «Intervención guiada» (sección nueva del expediente)
Objetivo: que el terapeuta use las fichas también llenándolas él (en sesión o después), con datos del expediente ya puestos, y que esto se integre con el resto.
1. **Ubicación**: sección plegable «Intervención guiada» en el expediente (cerca de Evaluaciones), con:
   - **Sugerencias**: las fichas sugeridas por resultados (misma lógica de `sugeridas.ts`) y las que siguen en la ruta (la primera de la etapa siguiente cuando las de la etapa actual ya están hechas).
   - **Biblioteca** por etapas (todas las fichas) con, en cada una: «Llenarla yo», «Enviar al paciente» y el estado (sin usar / enviada / respondida por el paciente / llenada por el terapeuta, con fecha).
2. **«Llenarla yo»**: abre la ficha en el panel (mismo renderizado de campos que el formulario público, en tema del panel) con la guía del terapeuta plegable al lado o arriba. Los campos llegan **prellenados** con lo que el expediente ya tiene; cada campo prellenado muestra de dónde salió («Del motivo de consulta de la ficha clínica»). Fuentes mínimas:
   - 1.1 motivo de consulta (ficha clínica o el motivo de la última solicitud/cita), metas (si existe un campo de metas u objetivos en el expediente).
   - 1.2 historia del problema / antecedentes de la ficha clínica.
   - 1.3 la situación, pensamiento, emociones y conductas del último registro guiado del MCEA si existe.
   - Cualquier ficha: lo que la misma ficha ya tenga de una respuesta previa del paciente o del terapeuta (la más reciente).
   Al guardar, se crea una respuesta del instrumento `ficha` (tabla de respuestas existente, `origen: 'codigo'`, sin enlace) con `datos.autor = "terapeuta"` y aparece en el expediente marcada «Llenada por el terapeuta»; no dispara avisos de Telegram ni alarma por riesgo hacia el paciente (sí se marca la alarma si hay frases de riesgo, para el terapeuta). Editar = guardar una versión nueva (las respuestas no se actualizan: se inserta la nueva y se borra la anterior del terapeuta para esa misma ficha, si se confirma).
3. **«Enviar al paciente» con lo ya escrito**: si el terapeuta ya llenó o prellenó la ficha, puede enviarla con esas respuestas como punto de partida (el enlace se crea con su `borrador` inicial); el paciente ve lo escrito y lo completa o corrige. Sin eso, se envía vacía como hoy. Sigue agregando la tarea a la sesión.
4. **Integración**: las fichas llenadas por el terapeuta salen en el PDF del expediente y en «Antes de la próxima sesión» solo como dato informativo (no como pendiente). Sin migraciones: usar tablas y políticas existentes (comprobar que el owner puede insertar y borrar respuestas y fijar `borrador` al crear el enlace; si algo no lo permite, detenerse y explicarlo en el informe en vez de crear migraciones).

## v1.2 — Ficha 1.1 integrada con el motivo de consulta del expediente (decisión del autor)
Contexto verificado en el código: la hoja de datos generales (`/datos/<token>`) NO pregunta el motivo de consulta. El «motivo inicial» del expediente (`PacienteRow.motivoConsulta`) sale de lo que la persona escribió al agendar («¿Qué te gustaría abordar?») o de lo que el terapeuta escribió en la ficha clínica.

1. **La 1.1 siempre parte del motivo inicial.** Al enviarla al paciente (también «vacía») y al «Llenarla yo», el campo `motivo` llega prellenado con el motivo inicial si existe, y la respuesta guarda una copia fija del punto de partida: `datos.base = { motivo, fuente: "agendar" | "ficha clínica", fecha }` (fecha de cuando se tomó). En el formulario del paciente, sobre ese campo, una nota: «Esto es lo que nos contó al inicio. Puede dejarlo, ampliarlo o corregirlo.»
2. **Comparativa en el expediente** (informe de la ficha 1.1 y bloque nuevo en la ficha clínica, ver 3): «Motivo inicial (fuente, fecha)» frente a «Motivo en la ficha 1.1 (fecha)», lado a lado en pantalla ancha y uno sobre otro en el teléfono, con la marca «Sin cambios» o «Actualizado». Si cambió, resaltar las palabras agregadas (verde) y quitadas (tachado) con una comparación simple por palabras. Además: desde cuándo, cuánto le afecta hoy (0–10) y metas.
3. **Integración en el perfil**: en la sección de la ficha clínica del expediente, bajo el motivo de consulta, un bloque «Motivo y metas (actualizado en la ficha 1.1 del …)» con la comparativa y los demás datos de la 1.1 más reciente. Botón «Usar esta versión como motivo de consulta del expediente» (actualiza `motivo_consulta` del paciente con la función de actualización existente, con confirmación); el original no se pierde porque queda en `datos.base` de la ficha. Si hay varias 1.1, se compara la más reciente con su propia base y se puede ver el historial.
4. Si no hay motivo inicial, la 1.1 se envía vacía como hoy y la comparativa dice «No había un motivo de consulta registrado antes de esta ficha».
5. Sin migraciones; trato de usted en lo que ve el paciente.
