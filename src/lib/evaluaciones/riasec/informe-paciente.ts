/** Test vocacional: informe para quien respondió (lenguaje sencillo). Solo panel. */
import type { InformePaciente, OpcionesInforme, ResultadoPaciente, TonoResultado } from "../informe-paciente";
import { calificarRiasec, RIASEC_INFO, type RiasecDatos } from "./calificacion";
import { RIASEC_TITULO_PACIENTE, TIPOS_RIASEC, type TipoRiasec } from "./escalas";

export const AREAS_RIASEC = TIPOS_RIASEC.map((t) => ({ id: t, nombre: `${t} · ${RIASEC_INFO[t].nombre}` }));

// Para intereses no hay niveles «malos»: solo verdes y azules.
const TONO: Record<string, TonoResultado> = { muyalto: "bien", alto: "bien", medio: "leve", bajo: "leve" };
const NIVEL_PACIENTE: Record<string, string> = { muyalto: "Interés muy alto", alto: "Interés alto", medio: "Interés medio", bajo: "Interés bajo" };
const POSICION = ["Tu interés principal", "Tu segundo interés", "Tu tercer interés", "Otro interés", "Otro interés", "Otro interés"];

export function opcionesPorDefectoRiasec(): OpcionesInforme {
  return { incluir: Object.fromEntries(TIPOS_RIASEC.map((t) => [t, true])), mostrarPuntuaciones: false, incluirAyuda: false };
}

export function informePacienteRiasec(
  datos: RiasecDatos,
  opciones: OpcionesInforme,
  extra: { paciente: string; fechaAplicacion: string; notas: string; profesional: string }
): InformePaciente {
  const c = calificarRiasec(datos);
  const porTipo = Object.fromEntries(c.tipos.map((t) => [t.tipo, t])) as Record<TipoRiasec, (typeof c.tipos)[number]>;
  const top = c.orden.slice(0, 3);
  const resultados: ResultadoPaciente[] = c.orden
    .filter((t) => opciones.incluir[t] !== false)
    .map((t) => {
      const pos = c.orden.indexOf(t);
      const info = RIASEC_INFO[t];
      const nivel = porTipo[t].nivel.k;
      return {
        area: `${info.nombre} (${t}) · ${info.corto}`,
        periodo: POSICION[pos],
        nivel: NIVEL_PACIENTE[nivel],
        tono: TONO[nivel],
        texto:
          pos < 3
            ? `${info.descripcion}\n\nAmbientes donde suele sentirse a gusto: ${info.ambientes}\n\nCarreras y campos para explorar:\n${info.carreras.map((c) => `• ${c}`).join("\n")}`
            : info.descripcion,
        puntuacion: opciones.mostrarPuntuaciones ? `${porTipo[t].suma} de 24` : undefined,
      };
    });
  const nombres = top.map((t) => RIASEC_INFO[t].nombre);
  return {
    v: 1,
    titulo: `Resultados · ${RIASEC_TITULO_PACIENTE}`,
    paciente: extra.paciente,
    fechaAplicacion: extra.fechaAplicacion,
    emitido: new Date().toISOString(),
    profesional: extra.profesional,
    intro:
      "Este informe resume tus intereses según el modelo RIASEC, que agrupa las actividades en seis tipos: Realista, Investigador, Artístico, Social, Emprendedor y Convencional. Muestra qué te gusta hacer, no lo que puedes o no puedes lograr. Úsalo como punto de partida para explorar opciones; lo conversaremos en sesión.",
    destacado: {
      titulo: `Tu código de intereses: ${c.codigo}`,
      texto:
        c.diferenciacion.k === "baja"
          ? `Tus intereses más altos son ${nombres.join(", ")}, aunque todavía están muy parejos entre sí. Es normal: explorar actividades nuevas te ayudará a definirlos.`
          : `Tus tres intereses más fuertes son ${nombres[0]}, ${nombres[1]} y ${nombres[2]}. Las carreras que combinan estos intereses suelen ser las que más te pueden motivar.`,
    },
    resultados,
    notas: extra.notas.trim(),
    ayuda: null,
    aviso:
      "Este cuestionario es una guía para explorar opciones y no decide por ti. Tus aptitudes, valores, oportunidades de estudio y metas también cuentan; por eso lo conversaremos en sesión.",
  };
}
