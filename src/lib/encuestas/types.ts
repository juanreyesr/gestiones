// Tipos compartidos del modulo Encuesta estudiantil.

export type OrigenRespuesta = "en_linea" | "retroactiva";

export type CampanaRow = {
  id: string;
  created_by: string;
  titulo: string;
  anio: number;
  carrera_id: string | null;
  token: string;
  activa: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

export type CampanaConCarrera = CampanaRow & {
  gestionesjj_carreras: { nombre: string } | null;
};

export type CampanaConConteo = CampanaConCarrera & { respuestasCount: number };

export type RespuestaEncuestaPayload = {
  edad_rango: string | null;
  genero: string | null;
  trabaja: boolean | null;
  primera_generacion: boolean | null;
  fuente_conocimiento: string;
  razones_universidad: string[];
  razones_universidad_otro: string | null;
  razones_carrera: string[];
  razones_carrera_otro: string | null;
  primera_opcion: boolean;
  quien_influyo: string;
  expectativas_carrera: string[];
  expectativa_universidad: string[];
  expectativa_abierta: string | null;
  satisfaccion_eleccion: number;
  probabilidad_recomendar: number;
  comentario: string | null;
};

export type RespuestaEncuestaRow = RespuestaEncuestaPayload & {
  id: string;
  campana_id: string;
  origen: OrigenRespuesta;
  created_at: string;
};

export function respuestaVacia(): RespuestaEncuestaPayload {
  return {
    edad_rango: null,
    genero: null,
    trabaja: null,
    primera_generacion: null,
    fuente_conocimiento: "",
    razones_universidad: [],
    razones_universidad_otro: null,
    razones_carrera: [],
    razones_carrera_otro: null,
    primera_opcion: true,
    quien_influyo: "",
    expectativas_carrera: [],
    expectativa_universidad: [],
    expectativa_abierta: null,
    satisfaccion_eleccion: 3,
    probabilidad_recomendar: 5,
    comentario: null,
  };
}
