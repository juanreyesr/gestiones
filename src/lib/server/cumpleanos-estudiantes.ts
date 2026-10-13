import type { SupabaseClient } from "@supabase/supabase-js";
import { esc, fechaLocal } from "./telegram";

// Aviso semanal de cumpleaños de estudiantes por Telegram: los lunes, en el
// cron de las 7:00 a. m. (ver /api/telegram/resumen-diario), lista a los
// estudiantes activos de cursos activos que cumplen años de lunes a domingo
// de esa semana. La fecha de nacimiento la llena cada estudiante en "Mi perfil".

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** 0 = domingo ... 6 = sábado, para una fecha YYYY-MM-DD. */
export function diaSemana(fechaYmd: string) {
  return new Date(`${fechaYmd}T12:00:00Z`).getUTCDay();
}

type Inscripcion = {
  estudiante_id: string | null;
  gestionesjj_cursos_impartidos: { nombre: string; estado: string } | null;
};

export async function avisoCumpleanosEstudiantesSemana(admin: SupabaseClient): Promise<{ texto: string } | null> {
  const { data: inscripciones } = await admin
    .from("gestionesjj_curso_estudiantes")
    .select("estudiante_id, gestionesjj_cursos_impartidos!inner(nombre, estado)")
    .eq("estado", "activo")
    .eq("gestionesjj_cursos_impartidos.estado", "activo")
    .not("estudiante_id", "is", null);

  const cursosPorEstudiante = new Map<string, Set<string>>();
  for (const fila of (inscripciones ?? []) as unknown as Inscripcion[]) {
    if (!fila.estudiante_id || !fila.gestionesjj_cursos_impartidos) continue;
    const cursos = cursosPorEstudiante.get(fila.estudiante_id) ?? new Set<string>();
    cursos.add(fila.gestionesjj_cursos_impartidos.nombre);
    cursosPorEstudiante.set(fila.estudiante_id, cursos);
  }
  if (!cursosPorEstudiante.size) return null;

  const { data: estudiantes } = await admin
    .from("gestionesjj_estudiantes")
    .select("id, nombre, fecha_nacimiento")
    .in("id", [...cursosPorEstudiante.keys()])
    .eq("activo", true)
    .not("fecha_nacimiento", "is", null);

  // Días de la semana actual, de lunes a domingo (el cron corre el lunes).
  const hoy = fechaLocal();
  const desdeLunes = (diaSemana(hoy) + 6) % 7;
  const semana = Array.from({ length: 7 }, (_, i) => fechaLocal(i - desdeLunes));

  const lineas: string[] = [];
  for (const dia of semana) {
    const mesDia = dia.slice(5);
    const delDia = ((estudiantes ?? []) as Array<{ id: string; nombre: string; fecha_nacimiento: string }>)
      .filter((e) => e.fecha_nacimiento.slice(5) === mesDia)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    for (const estudiante of delDia) {
      const edad = Number(dia.slice(0, 4)) - Number(estudiante.fecha_nacimiento.slice(0, 4));
      const [, mes, numero] = dia.split("-").map(Number);
      const cursos = [...(cursosPorEstudiante.get(estudiante.id) ?? [])].join(", ");
      lineas.push(
        `• <b>${DIAS[diaSemana(dia)]} ${numero} de ${MESES[mes - 1]}</b>: ${esc(estudiante.nombre)}${edad > 0 && edad < 120 ? ` (${edad} años)` : ""} — ${esc(cursos)}`,
      );
    }
  }
  if (!lineas.length) return null;

  return {
    texto: [
      `🎂 <b>Cumpleaños de estudiantes esta semana</b>`,
      "",
      ...lineas,
      "",
      "Puedes felicitarlos desde el chat del curso (Cursos → Estudiantes).",
    ].join("\n"),
  };
}
