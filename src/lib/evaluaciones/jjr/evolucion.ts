/**
 * Perfiles de Intereses Vocacionales JJR en el tiempo (panel de evolución).
 * Solo se agrupan aplicaciones del MISMO protocolo, versión y forma: sin
 * estudio de enlace no se comparan versiones ni formas. Descriptivo: sin
 * error de medida estimado, ningún cambio se califica como real ni como
 * mejora o empeoramiento (más interés no es «mejor»).
 */
import type { EvaluacionRespuestaRow } from "../evaluaciones";
import { CAMPOS_PRINCIPALES, NOMBRES_CAMPOS, type CampoPrincipal } from "./banco";
import { calificarJjr, type EstadoCampo } from "./calificacion";
import { datosJjrGuardados } from "./codigo";

export type AplicacionPerfil = { fecha: string; respuestaId: string; perfilCompleto: boolean };
export type PerfilJjrEnElTiempo = {
  clave: string;
  titulo: string;
  /** Todas las aplicaciones del protocolo (de la más antigua a la más reciente). */
  total: number;
  /** Las últimas (hasta `maximo`), de la más antigua a la más reciente. */
  aplicaciones: AplicacionPerfil[];
  campos: { campo: CampoPrincipal; nombre: string; puntos: { media: number | null; estado: EstadoCampo }[] }[];
};

const fechaDe = (r: EvaluacionRespuestaRow) => r.fecha ?? r.createdAt.slice(0, 10);

export function perfilesJjr(respuestas: EvaluacionRespuestaRow[], maximo = 3): PerfilJjrEnElTiempo[] {
  const grupos = new Map<string, { titulo: string; filas: { r: EvaluacionRespuestaRow; c: ReturnType<typeof calificarJjr> }[] }>();
  const orden = [...respuestas].sort((a, b) => (fechaDe(a) + a.createdAt).localeCompare(fechaDe(b) + b.createdAt));
  for (const r of orden) {
    if (r.instrumento !== "jjr84" && r.instrumento !== "jjr176") continue;
    const d = datosJjrGuardados(r.datos);
    if (!d) continue;
    const clave = `${d.instrumento}|${d.version}|${d.forma ?? ""}`;
    const titulo = `${d.instrumento}${d.forma ? ` · forma ${d.forma}` : ""} (v${d.version})`;
    if (!grupos.has(clave)) grupos.set(clave, { titulo, filas: [] });
    grupos.get(clave)!.filas.push({ r, c: calificarJjr(d) });
  }
  return [...grupos.entries()].map(([clave, g]) => {
    const ult = g.filas.slice(-maximo);
    return {
      clave,
      titulo: g.titulo,
      total: g.filas.length,
      aplicaciones: ult.map(({ r, c }) => ({ fecha: fechaDe(r), respuestaId: r.id, perfilCompleto: c.perfilCompleto })),
      campos: CAMPOS_PRINCIPALES.map((campo, i) => ({
        campo,
        nombre: NOMBRES_CAMPOS[campo].nombre,
        puntos: ult.map(({ c }) => ({ media: c.campos[i].media, estado: c.campos[i].estado })),
      })),
    };
  });
}
