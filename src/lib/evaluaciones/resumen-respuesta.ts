/**
 * Resumen en una línea de una respuesta (para el PDF del expediente y
 * listados). Solo panel del psicólogo (usa la calificación). El PDF pasa los
 * textos por textoPdf (solo Latin-1).
 */
import { calificarBBreve } from "./b-breve/calificacion";
import { validarBBreve } from "./b-breve/codigo";
import { calificarEapi } from "./eapi/calificacion";
import { MODULOS_EAPI, validarEapi } from "./eapi/codigo";
import type { EvaluacionRespuestaRow } from "./evaluaciones";
import { instrumentoPorId } from "./instrumentos";
import { calificarRiasec, RIASEC_INFO } from "./riasec/calificacion";
import { validarRiasec } from "./riasec/codigo";
import { calificarValores, VALORES_INFO } from "./valores/calificacion";
import { validarValores } from "./valores/codigo";

export type ResumenRespuesta = { instrumento: string; puntuaciones: string[]; alertas: string[] };

export function resumenRespuesta(r: EvaluacionRespuestaRow): ResumenRespuesta {
  const nombre = (instrumentoPorId(r.instrumento)?.nombre ?? r.instrumento).split(" · ")[0];
  const vacio = { instrumento: nombre, puntuaciones: ["(registro no válido para calificar)"], alertas: [] };
  if (r.instrumento === "eapi") {
    const d = (r.datos ?? {}) as Record<string, unknown>;
    const modulos = MODULOS_EAPI.filter((m) => Array.isArray(d[m]));
    const v = modulos.length ? validarEapi(r.datos, modulos) : null;
    if (!v?.ok) return vacio;
    const c = calificarEapi(v.datos);
    const p: string[] = [];
    if (c.gad) p.push(`GAD-7: ${c.gad.total}/21 (${c.gad.band.label})`);
    if (c.dass) {
      p.push(`DASS-21 Depresión: ${c.dass.dep.x2}/42 (${c.dass.dep.band.label})`);
      p.push(`DASS-21 Ansiedad: ${c.dass.anx.x2}/42 (${c.dass.anx.band.label})`);
      p.push(`DASS-21 Estrés: ${c.dass.str.x2}/42 (${c.dass.str.band.label})`);
    }
    if (c.ptq) p.push(`PTQ: ${c.ptq.total}/60 (${c.ptq.band.label})`);
    if (c.docs) p.push(`DOCS: ${c.docs.total}/80 (${c.docs.band.label})`);
    p.push(`Pregunta de seguridad: ${v.datos.safety}`);
    return { instrumento: nombre, puntuaciones: p, alertas: c.flags.filter((f) => f.lvl === "alert").map((f) => f.t) };
  }
  if (r.instrumento === "b-breve") {
    const v = validarBBreve(r.datos);
    if (!v.ok) return vacio;
    const c = calificarBBreve(v.datos);
    return {
      instrumento: nombre,
      puntuaciones: [`Total: ${c.total}/48 (${c.banda.etiqueta})`, ...c.areas.filter((a) => a.prioritaria).map((a) => `Área prioritaria: ${a.nombre} (${a.pct} %)`)],
      alertas: c.senales.filter((s) => s.nivel === "alarma").map((s) => s.texto),
    };
  }
  if (r.instrumento === "riasec") {
    const v = validarRiasec(r.datos);
    if (!v.ok) return vacio;
    const c = calificarRiasec(v.datos);
    return {
      instrumento: nombre,
      puntuaciones: [`Código Holland: ${c.codigo} (${c.orden.slice(0, 3).map((t) => RIASEC_INFO[t].nombre).join(", ")})`, `Diferenciación: ${c.diferenciacion.k}; consistencia: ${c.consistencia.k}`],
      alertas: [],
    };
  }
  if (r.instrumento === "valores") {
    const v = validarValores(r.datos);
    if (!v.ok) return vacio;
    const c = calificarValores(v.datos);
    return {
      instrumento: nombre,
      puntuaciones: [
        `Valores principales: ${c.principales.map((x) => VALORES_INFO[x].nombre).join(", ")}`,
        `Elegidos por la persona: ${v.datos.elegidos.map((x) => VALORES_INFO[x].nombre).join(", ")} (concordancia ${c.concordancia.n}/3)`,
      ],
      alertas: [],
    };
  }
  return vacio;
}
