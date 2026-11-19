/**
 * MCEA: textos de presentación del registro guiado («un momento reciente»: situación,
 * pensamiento, emoción y conducta). Capa propia de textos: NO se guarda nada de aquí ni
 * interviene en el motor, y no toca `contenido.ts` (archivo generado). Reglas de redacción
 * de las fichas (v1.1, A): invitación concreta al inicio, preguntas directas de usted y un
 * ejemplo debajo. Sin imports.
 */
export const TEXTOS_REGISTRO = {
  titulo: "Un momento reciente que le molestó",
  intro:
    "Comencemos recordando un momento reciente en que se sintió mal. Piense dónde estaba y qué estaba pasando; con eso iremos viendo, paso a paso, cómo se conectan lo que pasó y lo que usted pensó, sintió e hizo.",
  nota: "Esta parte es opcional y no tiene puntuación: sirve para que usted y su psicólogo vean ese ciclo.",
  sit: { pregunta: "¿Qué pasó? Cuéntelo en una o dos frases.", ejemplo: "Mi jefe me escribió: «Mañana hablamos»." },
  emo: { pregunta: "¿Qué sintió en ese momento?", ayuda: "Marque todas las que sintió." },
  int: { pregunta: "¿Qué tan fuerte fue, de 0 a 100?" },
  pen: { pregunta: "En ese momento, ¿qué pensó? Escriba la frase tal como le cruzó por la mente.", ejemplo: "Seguro me va a regañar." },
  f1: { pregunta: "Si eso fuera cierto, ¿qué significaría para usted?", ejemplo: "Que no hago bien mi trabajo." },
  f2: { pregunta: "Y si eso también fuera cierto, ¿qué diría de usted, de los demás o de su futuro?", ejemplo: "Que no voy a salir adelante." },
  beh: { pregunta: "¿Qué hizo después?", ayuda: "Marque todas las que hizo." },
  dis: { pregunta: "¿Reconoce alguna de estas formas de pensar en ese momento?", ayuda: "Marque las que se parezcan a lo que pensó; puede no marcar ninguna." },
} as const;
