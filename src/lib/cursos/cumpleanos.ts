// Alerta de cumpleaños para el docente: qué estudiantes activos de un curso
// cumplen años en los próximos 7 días (incluyendo hoy), calculado en hora de
// Guatemala para que "esta semana" signifique lo mismo sin importar en qué
// zona horaria esté el navegador de quien lo mira.

export type EstudianteCumpleanos = { estudianteId: string; nombre: string; fecha: string };

function hoyGuatemala(): Date {
  const formateado = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${formateado}T00:00:00`);
}

/**
 * `fechasNacimientoPorEstudiante` mapea el id global del estudiante
 * (gestionesjj_estudiantes.id) a su fecha de nacimiento (date, "YYYY-MM-DD").
 */
export function estudiantesConCumpleanosEstaSemana(
  estudiantes: Array<{ estudianteId: string; nombre: string }>,
  fechasNacimientoPorEstudiante: Map<string, string | null>,
): EstudianteCumpleanos[] {
  const hoy = hoyGuatemala();
  const resultado: EstudianteCumpleanos[] = [];

  for (let i = 0; i < 7; i++) {
    const dia = new Date(hoy);
    dia.setDate(hoy.getDate() + i);
    const mes = dia.getMonth();
    const numeroDia = dia.getDate();

    for (const estudiante of estudiantes) {
      const fechaNacimiento = fechasNacimientoPorEstudiante.get(estudiante.estudianteId);
      if (!fechaNacimiento) continue;
      const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
      if (Number.isNaN(nacimiento.getTime())) continue;
      if (nacimiento.getMonth() === mes && nacimiento.getDate() === numeroDia) {
        resultado.push({ estudianteId: estudiante.estudianteId, nombre: estudiante.nombre, fecha: dia.toISOString().slice(0, 10) });
      }
    }
  }

  return resultado;
}
