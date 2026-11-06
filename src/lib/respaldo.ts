/**
 * Respaldo completo de los datos de GestionesJJ en un archivo JSON que se
 * descarga en el dispositivo del propietario (con su sesión: lee lo que las
 * reglas de acceso le permiten, sin pasar por terceros).
 *
 * Incluye todas las tablas gestionesjj_* menos las de credenciales y estados
 * técnicos efímeros (tokens de Google, suscripciones push, vinculación de
 * Telegram e hilos de conversación del bot). No incluye los archivos subidos
 * (Storage), solo sus referencias.
 */
import { getSupabaseClient } from "./supabase";

/** Tablas respaldadas, agrupadas para el resumen. */
export const TABLAS_RESPALDO: { grupo: string; tablas: string[] }[] = [
  {
    grupo: "Clínica",
    tablas: [
      "gestionesjj_pacientes",
      "gestionesjj_citas",
      "gestionesjj_sesiones",
      "gestionesjj_compromisos",
      "gestionesjj_consentimientos",
      "gestionesjj_consentimiento_plantillas",
      "gestionesjj_evaluaciones",
      "gestionesjj_evaluacion_respuestas",
      "gestionesjj_evaluacion_informes",
      "gestionesjj_evaluacion_seguimientos",
      "gestionesjj_solicitudes_cita",
      "gestionesjj_disponibilidad",
      "gestionesjj_google_reservas",
      "gestionesjj_whatsapp_mensajes",
      "gestionesjj_mensajes_programados",
    ],
  },
  {
    grupo: "Aula virtual y docencia",
    tablas: [
      "gestionesjj_cursos",
      "gestionesjj_cursos_impartidos",
      "gestionesjj_curso_semanas",
      "gestionesjj_curso_contenidos",
      "gestionesjj_curso_actividades",
      "gestionesjj_curso_planificaciones",
      "gestionesjj_curso_estudiantes",
      "gestionesjj_curso_estudiante_eventos",
      "gestionesjj_curso_entregas",
      "gestionesjj_curso_entrega_archivos",
      "gestionesjj_curso_calificaciones",
      "gestionesjj_curso_asistencias",
      "gestionesjj_curso_solicitudes",
      "gestionesjj_estudiantes",
      "gestionesjj_estudiante_mensajes",
      "gestionesjj_estudiante_notificaciones",
      "gestionesjj_estudiante_telegram",
      "gestionesjj_estudiante_vencimientos_avisados",
      "gestionesjj_estudiantes_avisos_config",
      "gestionesjj_docentes",
      "gestionesjj_reuniones_docentes",
      "gestionesjj_supervision_periodos",
      "gestionesjj_control_revision_periodos",
      "gestionesjj_control_revision_filas",
      "gestionesjj_coordinacion_resumen_enlaces",
      "gestionesjj_universidades",
      "gestionesjj_carreras",
      "gestionesjj_carne_correlativo",
      "gestionesjj_perfil_preguntas",
    ],
  },
  {
    grupo: "Recursos, encuestas e iglesia",
    tablas: [
      "gestionesjj_recursos",
      "gestionesjj_recurso_sesiones",
      "gestionesjj_recurso_preguntas",
      "gestionesjj_recurso_respuestas",
      "gestionesjj_recurso_participantes",
      "gestionesjj_recurso_qa_preguntas",
      "gestionesjj_recurso_qa_votos",
      "gestionesjj_encuestas_campanas",
      "gestionesjj_encuestas_respuestas",
      "gestionesjj_iglesia_eventos",
      "gestionesjj_iglesia_evento_participantes",
      "gestionesjj_iglesia_predicadores",
      "gestionesjj_iglesia_predicas_meses",
      "gestionesjj_iglesia_predicas_asignaciones",
      "gestionesjj_iglesia_predicas_bitacora",
      "gestionesjj_iglesia_temas_anio",
      "gestionesjj_iglesia_protocolos",
      "gestionesjj_iglesia_cierres_personas",
    ],
  },
  {
    grupo: "Pendientes, sitio y configuración",
    tablas: [
      "gestionesjj_pendientes_tableros",
      "gestionesjj_pendientes_grupos",
      "gestionesjj_pendientes_items",
      "gestionesjj_pendientes_actualizaciones",
      "gestionesjj_ofertas",
      "gestionesjj_sitio_portada",
      "gestionesjj_config",
      "gestionesjj_telegram_recordatorios",
      "gestionesjj_telegram_recordatorios_google",
      "gestionesjj_telegram_recordatorios_supervision",
      "gestionesjj_telegram_borrador_mensaje",
    ],
  },
];

const POR_PAGINA = 1000;

export type ResultadoRespaldo = {
  archivo: string;
  filas: number;
  tablas: { tabla: string; filas: number; error?: string }[];
};

/** Lee todas las tablas (por páginas) y descarga el archivo. */
export async function descargarRespaldo(alAvanzar?: (hechas: number, total: number) => void): Promise<ResultadoRespaldo> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Faltan las variables de Supabase.");
  const todas = TABLAS_RESPALDO.flatMap((g) => g.tablas);
  const datos: Record<string, unknown[]> = {};
  const resumen: ResultadoRespaldo["tablas"] = [];
  let hechas = 0;
  for (const tabla of todas) {
    const filas: unknown[] = [];
    let error: string | undefined;
    for (let desde = 0; ; desde += POR_PAGINA) {
      const { data, error: e } = await supabase.from(tabla).select("*").range(desde, desde + POR_PAGINA - 1);
      if (e) {
        error = /does not exist|schema cache/i.test(e.message) ? "La tabla aún no existe (migración pendiente)." : e.message;
        break;
      }
      filas.push(...(data ?? []));
      if (!data || data.length < POR_PAGINA) break;
    }
    datos[tabla] = filas;
    resumen.push({ tabla, filas: filas.length, ...(error ? { error } : {}) });
    alAvanzar?.(++hechas, todas.length);
  }
  const ahora = new Date();
  const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
  const archivo = `respaldo-gestionesjj-${fecha}.json`;
  const contenido = {
    formato: "gestionesjj-respaldo",
    version: 1,
    generado: ahora.toISOString(),
    aviso: "Contiene datos clínicos confidenciales. Guárdelo cifrado y fuera del alcance de terceros.",
    resumen,
    tablas: datos,
  };
  const blob = new Blob([JSON.stringify(contenido)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = archivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return { archivo, filas: resumen.reduce((n, t) => n + t.filas, 0), tablas: resumen };
}
