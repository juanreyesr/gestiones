# MCEA — Informe para el paciente v2: orientado a la oportunidad de cambio

Autor clínico: M. A. Juan J. Reyes. Mismo criterio que el informe del EAPI v2 (`EAPI_informe_paciente_v2_especificacion.md`, incluidas su adenda y la v2.1): léelo primero; aquí solo va lo propio del MCEA. No cambia la calificación, los ítems, el motor ni el informe profesional. `mcea/contenido.ts` se genera desde el artefacto: NO se edita; el contenido nuevo va en `mcea/contenido-paciente.ts`.

## Principio y reglas de redacción
Los del EAPI v2: indicador → por qué pasa → oportunidad de cambio → primeros pasos → lo que haremos juntos; de usted, sin etiquetas ni siglas, sin prometer resultados, sin indicaciones médicas, pasos pequeños y seguros. Nunca se cita el ítem 9 del PHQ-9 ni la pantalla de riesgo; si corresponde, se mantienen las líneas de ayuda.

## Estructura
1. Recuadro inicial: solo el título «Lo más importante», sin texto.
2. NO hay tarjeta genérica de «lo que está a su favor».
3. Tarjetas por área, de mayor a menor necesidad, con insignias por prioridad de trabajo («Para trabajar primero», «Para trabajar», «Para cuidar», «A su favor»; sin rojo). Cada tarjeta de nivel leve o superior lleva los subtítulos: «Lo que muestran sus respuestas:», «Lo que más marcó:» (hasta 3 respuestas altas no sensibles, dichas como indicador), «Por qué pasa:», «Su oportunidad de cambio:», «Para empezar esta semana:» y «Lo que trabajaremos juntos:». Nivel bajo: 2–3 frases.
4. Carga alta (3 o más áreas en «Para trabajar primero»): tarjeta «Cómo se conectan sus resultados» (id `conexion`), pasos solo en las dos áreas más altas y máximo 2 próximos pasos. Con riesgo marcado (ítem 9 ≥ 1) y el ánimo alto, «Ánimo» va primero.
5. «Sus próximos pasos» (id `pasos`): máximo 3 (2 en carga alta), el primero el más sencillo.

## Áreas y base terapéutica
Los ids actuales se conservan (`estado`, `mente`, `formas`, `frenando`, `pareja`, `mapa`, `recursos`, `avance`); un id puede producir más de una tarjeta.
- **`estado` → dos tarjetas**: «Ánimo» (PHQ-9) y «Preocupación y ansiedad» (GAD-7, si se aplicó).
  - Ánimo: activación conductual (Martell, Dimidjian y Herman-Dunn): actuar según un plan y no según el ánimo, actividades pequeñas de gusto o logro, contacto con personas, sueño y movimiento, trato amable consigo mismo. Pares «indicador → oportunidad» para los ítems 1–8 del PHQ-9 (el 9 nunca).
  - Preocupación y ansiedad: REUTILIZAR el contenido del EAPI (`eapi/contenido-paciente.ts`, área `gad`: mismos ítems y niveles) para que ambos informes digan lo mismo.
- **`mente` → hasta dos tarjetas**: «Pensamientos que vuelven» (PTQ: reutilizar el contenido `ptq` del EAPI) y «Pensamientos negativos automáticos» (PAN): terapia cognitiva (Beck): un pensamiento es una interpretación, no un hecho; notarlo, anotarlo y preguntarse qué pruebas hay a favor y en contra y qué le diría a alguien querido; se entrena con registros breves. Usar las subescalas del PAN que salgan altas.
- **`formas`** «Formas de pensar que aparecieron» (distorsiones marcadas ≥ 3 y las que reconoció en su registro): para CADA una de las 10 distorsiones del instrumento, una explicación breve y su pregunta o alternativa correctora (reestructuración cognitiva: Beck; Burns). Tono: todas las personas las usan; reconocerlas es el primer paso.
- **`frenando`** «Lo que puede estar frenándole» (subescalas altas de autosabotaje): para CADA subescala del instrumento, por qué se aprende (casi siempre protege de algo) y su salida: postergar y evitar → dividir en pasos de 5–10 minutos y planes «si… entonces…» (Gollwitzer), empezar antes de sentirse con ganas; autocrítica y perfeccionismo → autocompasión (Neff; Gilbert) y estándares flexibles (Shafran, Egan y Wade); las demás, según su contenido real en `INS.AS`.
- **`pareja`** «En su relación de pareja» (subescalas altas): comunicación (Gottman: iniciar con suavidad, hablar de lo propio, pausas cuando sube la tensión; evitar crítica, desprecio, defensiva y evasión) y aceptación y cambio (Jacobson y Christensen). Los pasos son SOLO sobre lo que la persona puede observar o hacer por su parte; nunca «aguantar» ni «ceder». Cierra con: «Si en su relación hay miedo, amenazas o agresiones, coménteselo a su psicólogo: eso se atiende de otra manera».
- **`mapa`** «Su mapa de un momento difícil» (registro guiado): se conserva (situación, pensamiento, emoción, conducta) y añade «Dónde está el margen de cambio:» (entre lo que pasó y lo que sintió hubo un pensamiento; ahí se puede trabajar) enlazando con las formas de pensar que la persona reconoció.
- **`recursos`** «Sus recursos»: SOLO con datos reales (ítems de recursos ≥ 3 y lo que reconoció por su cuenta). Sin frases genéricas de relleno; si no hay datos, la tarjeta no aparece.
- **`avance`** «Lo que ha cambiado»: se conserva, con la misma redacción del informe de avance: lo que mejoró primero; lo que aumentó se presenta como «Áreas para prestar especial atención en nuestra próxima sesión»; sin la palabra «empeoró».

## Límites técnicos
Cada tarjeta < 4000 caracteres; informe < 60 000 bytes; hasta 30 tarjetas; debe pasar `leerInformePaciente` sin recortes.
