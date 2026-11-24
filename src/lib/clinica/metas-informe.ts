/**
 * Avance de metas para el informe del paciente: lenguaje sencillo, de usted,
 * sin datos clínicos. Solo metas activas, logradas o pausadas (las descartadas no se muestran).
 */
import type { MetasInformePaciente } from "@/lib/evaluaciones/informe-paciente";
import type { MetaRow } from "./metas";

function frase(m: MetaRow): string {
  const pts = m.avances;
  if (m.estado === "lograda") return "¡Meta lograda! Es un logro suyo: vale la pena reconocer lo que hizo para conseguirlo y cuidar lo que ya avanzó.";
  if (m.estado === "pausada") return "Esta meta está en pausa por ahora; la retomaremos cuando sea el momento.";
  if (!pts.length) return "Aún no hemos registrado su avance en esta meta; lo haremos juntos en sesión.";
  const ultima = pts[pts.length - 1].puntuacion;
  if (pts.length === 1) return `Su punto de partida es ${ultima} de 10. A partir de aquí veremos cómo avanza.`;
  const primera = pts[0].puntuacion;
  if (ultima > primera) return `Ha avanzado de ${primera} a ${ultima} de 10. ¡Va por buen camino: siga así!`;
  if (ultima < primera)
    return `Su avance bajó de ${primera} a ${ultima} de 10. Los altibajos son normales en cualquier proceso; lo conversaremos para ajustar el plan.`;
  return `Se mantiene en ${ultima} de 10. Algunos cambios tardan más en notarse; seguiremos trabajando en ello.`;
}

export function metasParaInforme(metas: MetaRow[]): MetasInformePaciente | undefined {
  const visibles = metas.filter((m) => m.estado !== "descartada");
  if (!visibles.length) return undefined;
  const orden = { lograda: 0, activa: 1, pausada: 2 } as const;
  const items = [...visibles]
    .sort((a, b) => orden[a.estado as keyof typeof orden] - orden[b.estado as keyof typeof orden])
    .slice(0, 10)
    .map((m) => ({
      meta: m.meta,
      indicador: m.indicador ?? "",
      estado: m.estado as "activa" | "lograda" | "pausada",
      puntos: m.avances.slice(-20).map((a) => ({ fecha: a.fecha, valor: a.puntuacion })),
      frase: frase(m),
    }));
  const logradas = items.filter((i) => i.estado === "lograda").length;
  return {
    titulo: "El avance de sus metas",
    intro: `Estas son las metas en las que estamos trabajando juntos. En cada sesión usted califica de 0 a 10 cuánto ha avanzado${
      logradas ? `, y ya ha logrado ${logradas === 1 ? "una" : logradas}` : ""
    }.`,
    items,
  };
}
