"use client";

import { metasParaInforme } from "@/lib/clinica/metas-informe";
import type { PacienteRow } from "@/lib/clinica/types";
import { fetchInformeAvance, guardarInformeAvance, publicarInformeAvance, retirarInformeAvance } from "@/lib/evaluaciones/evaluaciones";
import { AREAS_INFORME_AVANCE, informeAvancePaciente, opcionesPorDefectoAvance, type CambioArea } from "@/lib/evaluaciones/evolucion-explicada";
import { InformePacientePanel, PROFESIONAL_INFORME, type AlmacenInforme } from "./informe-paciente-panel";
import { useMetas } from "./use-metas";

/**
 * Informe de avance para el paciente (una copia por paciente, migración 065): lo que cambió
 * en sus evaluaciones y el avance de sus metas (0 a 10). Se abre desde «Evolución» o desde
 * «Metas terapéuticas»; es el mismo informe.
 */
export function InformeAvance({ cambios, paciente }: { cambios: CambioArea[]; paciente: PacienteRow }) {
  const { metas } = useMetas(paciente.id);
  const bloqueMetas = metasParaInforme(metas);
  const almacen: AlmacenInforme = {
    cargar: () => fetchInformeAvance(paciente.id),
    guardar: (c) => guardarInformeAvance(paciente.id, c),
    publicar: (contenido, token) => publicarInformeAvance(paciente.id, contenido, token),
    retirar: () => retirarInformeAvance(paciente.id),
  };
  // Solo las partes que tienen contenido.
  const areas = AREAS_INFORME_AVANCE.filter((a) => (a.id === "metas" ? !!bloqueMetas : cambios.length > 0));
  return (
    <InformePacientePanel
      almacen={almacen}
      areas={areas}
      construir={(o, notas) => informeAvancePaciente(cambios, o, { paciente: paciente.nombre, notas, profesional: PROFESIONAL_INFORME, metas: bloqueMetas })}
      descripcion="Versión simplificada para el paciente: el avance de sus metas (su propia calificación de 0 a 10) y, si hay evaluaciones que comparar, lo que mejoró, lo que aumentó y lo que se mantiene. No incluye puntajes de las pruebas (salvo que los actives), preguntas sensibles (ítem 9 del PHQ-9, desesperanza del DASS-21), alertas, hipótesis ni notas privadas."
      opcionesPorDefecto={opcionesPorDefectoAvance(cambios)}
      paciente={paciente}
      placeholderNotas="Por ejemplo: qué ha hecho bien, qué vamos a reforzar y qué veremos en la próxima sesión."
      respuestaId={`avance-${paciente.id}`}
      titulo="Informe de avance para el paciente"
    />
  );
}
