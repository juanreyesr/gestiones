/**
 * Informe de resultados para la persona (plataforma de tests): reutiliza los mismos
 * informes para el paciente del panel clínico (lenguaje sencillo, sin códigos
 * diagnósticos ni la pregunta de seguridad), con la aplicación anterior para comparar.
 */
import { MODULOS_EAPI, validarEapi } from "@/lib/evaluaciones/eapi/codigo";
import { informePacienteEapi, opcionesPorDefectoEapi } from "@/lib/evaluaciones/eapi/informe-paciente";
import type { InformePaciente } from "@/lib/evaluaciones/informe-paciente";
import { datosJjrGuardados } from "@/lib/evaluaciones/jjr/codigo";
import { informePacienteJjr, opcionesPorDefectoJjr } from "@/lib/evaluaciones/jjr/informe-paciente";
import { datosMceaGuardados } from "@/lib/evaluaciones/mcea/codigo";
import { informePacienteMcea, opcionesPorDefectoMcea } from "@/lib/evaluaciones/mcea/informe-paciente";
import { calificarRiasec } from "@/lib/evaluaciones/riasec/calificacion";
import { validarRiasec } from "@/lib/evaluaciones/riasec/codigo";
import { informePacienteRiasec, opcionesPorDefectoRiasec } from "@/lib/evaluaciones/riasec/informe-paciente";
import { validarTemperamentos } from "@/lib/evaluaciones/temperamentos/codigo";
import { informePacienteTemperamentos, opcionesPorDefectoTemperamentos } from "@/lib/evaluaciones/temperamentos/informe-paciente";
import { validarValores } from "@/lib/evaluaciones/valores/codigo";
import { informePacienteValores, opcionesPorDefectoValores } from "@/lib/evaluaciones/valores/informe-paciente";

export const PROFESIONAL_TESTS = "M. A. Juan José Reyes · Psicólogo";

export type AplicacionInforme = { instrumento: string; datos: Record<string, unknown> | null; fecha: string };

const NOTA =
  "Este informe se generó automáticamente a partir de sus respuestas. Es una orientación general, no un diagnóstico. Si desea conversar sus resultados con un profesional, puede agendar una consulta.";

function datosEapi(d: Record<string, unknown> | null) {
  const modulos = MODULOS_EAPI.filter((m) => Array.isArray(d?.[m]));
  if (!d || !modulos.length) return null;
  const v = validarEapi(d, modulos);
  return v.ok ? v.datos : null;
}
const ok = <T,>(v: { ok: true; datos: T } | { ok: false }) => (v.ok ? v.datos : null);

/**
 * Informe de una aplicación. `anterior`: la última aplicación completada del mismo test;
 * `riasec`: datos del último RIASEC (para cruzarlo con valores laborales).
 */
export function informeDeAplicacion(
  actual: AplicacionInforme,
  extra: { nombre: string; anterior: AplicacionInforme | null; riasec: Record<string, unknown> | null }
): InformePaciente | null {
  const base = { paciente: extra.nombre, fechaAplicacion: actual.fecha, notas: NOTA, profesional: PROFESIONAL_TESTS };
  switch (actual.instrumento) {
    case "eapi": {
      const d = datosEapi(actual.datos);
      if (!d) return null;
      const a = extra.anterior ? datosEapi(extra.anterior.datos) : null;
      return informePacienteEapi(d, opcionesPorDefectoEapi(d), {
        ...base,
        anterior: a ? { datos: a, fecha: extra.anterior!.fecha } : null,
        historial: a ? [{ datos: a, fecha: extra.anterior!.fecha }] : [],
      });
    }
    case "mcea": {
      const d = datosMceaGuardados(actual.datos);
      if (!d) return null;
      const a = extra.anterior ? datosMceaGuardados(extra.anterior.datos) : null;
      return informePacienteMcea(d, opcionesPorDefectoMcea(), { ...base, anterior: a ? { datos: a, fecha: extra.anterior!.fecha } : null });
    }
    case "riasec": {
      const d = ok(validarRiasec(actual.datos));
      return d ? informePacienteRiasec(d, opcionesPorDefectoRiasec(), base) : null;
    }
    case "temperamentos": {
      const d = ok(validarTemperamentos(actual.datos));
      return d ? informePacienteTemperamentos(d, opcionesPorDefectoTemperamentos(), base) : null;
    }
    case "valores": {
      const d = ok(validarValores(actual.datos));
      if (!d) return null;
      const r = extra.riasec ? ok(validarRiasec(extra.riasec)) : null;
      return informePacienteValores(d, opcionesPorDefectoValores(), { ...base, codigoRiasec: r ? calificarRiasec(r).codigo : null });
    }
    case "jjr84": {
      const d = datosJjrGuardados(actual.datos);
      return d ? informePacienteJjr(d, opcionesPorDefectoJjr(false), base) : null;
    }
    default:
      return null;
  }
}
