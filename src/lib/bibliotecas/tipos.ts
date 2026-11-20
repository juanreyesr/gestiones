/**
 * Bibliotecas JJR: colecciones de fichas clínicas de referencia (contenido propio, en el código).
 *  - El terapeuta las ve todas en el panel (y las relacionadas con los resultados de cada paciente).
 *  - En el Aula virtual, cada biblioteca se activa por curso; el estudiante ve solo las de sus cursos.
 *  - Los pacientes NUNCA ven estas fichas (las de psicoeducación para pacientes son las Fichas terapéuticas).
 * Redacción propia: del DSM-5-TR y la CIE-11 solo se citan códigos y se resumen ideas con palabras propias.
 */
import type { FichaId } from "../evaluaciones/fichas/catalogo";

export type EtapaTcc = 1 | 2 | 3 | 4 | 5;

export type PasoPlan = {
  etapa: EtapaTcc;
  /** Qué se trabaja en esta etapa con este cuadro (1–3 frases). */
  texto: string;
  /** Fichas terapéuticas JJR que ya existen y sirven aquí (solo ids existentes). */
  fichas: FichaId[];
};

export type FichaClinica = {
  /** Id estable (minúsculas y guiones): «ansiedad-generalizada». */
  id: string;
  nombre: string;
  /** Códigos (solo códigos, sin texto de los manuales). */
  codigos: { dsm: string; cie: string };
  /** 2–3 frases: qué es y cómo se ve en consulta. */
  enPocasPalabras: string;
  /** 5–8 síntomas o rasgos clave, con palabras propias. */
  sintomasClave: string[];
  /** Duración y umbral, resumidos con palabras propias (1–2 frases). */
  duracion: string;
  /** 3–5 diagnósticos parecidos y cómo distinguirlos. */
  noConfundir: { con: string; diferencia: string }[];
  /** 6–8 preguntas abiertas para la entrevista, de usted. */
  preguntas: string[];
  /** 3–5 señales de alerta o riesgo y qué hacer. */
  alertas: string[];
  /** Plan TCC por etapas (1 a 5), enlazado a las fichas terapéuticas existentes. */
  plan: PasoPlan[];
  /** SOLO terapeuta: cómo lo detecta el sistema (escala y punto de corte de EAPI o MCEA). */
  deteccion: string[];
  /** SOLO estudiantes: caso breve (4–6 frases, ficticio, contexto guatemalteco). */
  caso: string;
  /** SOLO estudiantes: clave para recordar (1 frase). */
  clave: string;
  /** Referencias (autor, año, obra), 2–4. */
  referencias: string[];
};

export type Biblioteca = {
  id: string;
  titulo: string;
  descripcion: string;
  fichas: FichaClinica[];
};

/** Quién la lee: cambia qué partes se muestran. */
export type VistaFicha = "terapeuta" | "estudiante";
