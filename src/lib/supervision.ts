// Programacion de supervisiones docentes del trimestre.
//
// La propuesta se calcula (no se guarda): es una funcion determinista de los
// cursos del periodo, las evaluaciones hechas ANTES del inicio del plan y el
// rango de fechas. Por eso no se reacomoda sola cada vez que se registra una
// supervision: las evaluaciones posteriores al inicio solo marcan el avance.

import type { Trimestre } from "@/data/evaluacion";
import { fechaISO, parseFecha } from "@/lib/fechas";

const DIAS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export type HorarioParseado = { dia: number; inicio: string; fin: string | null };

const sinAcentos = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "Sábado 07:00 a 09:00 horas" -> { dia: 6, inicio: "07:00", fin: "09:00" }. */
export function parseHorario(horario: string | null | undefined): HorarioParseado | null {
  if (!horario) return null;
  const texto = sinAcentos(horario);
  const dia = Object.entries(DIAS).find(([nombre]) => texto.includes(nombre));
  const [inicio, fin] = texto.match(/(\d{1,2}):(\d{2})/g) ?? [];
  if (!dia || !inicio) return null;
  const pad = (valor: string) => valor.padStart(5, "0");
  return { dia: dia[1], inicio: pad(inicio), fin: fin ? pad(fin) : null };
}

/** "Sáb 07:00–09:00"; si no se puede leer, devuelve el texto tal cual. */
export function horarioCorto(horario: string | null | undefined) {
  const parseado = parseHorario(horario);
  if (!parseado) return horario?.trim() || "Sin horario";
  return `${DIAS_CORTOS[parseado.dia]} ${parseado.inicio}${parseado.fin ? `–${parseado.fin}` : ""}`;
}

/** Fecha de cierre de clases por defecto: el 3er trimestre termina el 21 de noviembre. */
export function finPorDefecto(anio: number, trimestre: Trimestre) {
  if (trimestre === 3) return `${anio}-11-21`;
  if (trimestre === 2) return `${anio}-08-15`;
  return `${anio}-04-25`;
}

/** Sabado de la semana de la fecha (la semana va de domingo a sabado). */
export function sabadoDeSemana(fecha: string) {
  const dia = parseFecha(fecha);
  if (!dia) return fecha;
  dia.setDate(dia.getDate() + (6 - dia.getDay()));
  return fechaISO(dia);
}

/** El mismo sabado si la fecha ya es sabado; si no, el siguiente. */
export function sabadoEnOPosterior(fecha: string) {
  return sabadoDeSemana(fecha);
}

export function sabadosEntre(inicio: string, fin: string) {
  const resultado: string[] = [];
  const cursor = parseFecha(sabadoEnOPosterior(inicio));
  const limite = parseFecha(fin);
  if (!cursor || !limite) return resultado;
  while (cursor <= limite && resultado.length < 60) {
    resultado.push(fechaISO(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return resultado;
}

export type CursoPlanificable = {
  id: string;
  nombre: string;
  horario: string | null;
  edificio: string | null;
  virtual: boolean;
  docenteId: string;
  docenteNombre: string;
};

export type ItemSupervision = {
  id: string;
  /** Sabado de la semana a la que pertenece. */
  semana: string;
  /** Dia real de la clase (igual a `semana` para cursos de sabado). */
  fecha: string;
  inicio: string;
  fin: string | null;
  cursoId: string;
  cursoNombre: string;
  horario: string | null;
  edificio: string | null;
  virtual: boolean;
  docenteId: string;
  docenteNombre: string;
  /** docente: primera visita al docente; curso: primera al curso; seguimiento: repeticion. */
  motivo: "docente" | "curso" | "seguimiento";
};

export type PlanSupervision = {
  semanas: Array<{ semana: string; items: ItemSupervision[] }>;
  sinHorario: CursoPlanificable[];
  docentesSinCupo: string[];
  cursosSinCupo: Array<CursoPlanificable & { motivo: ItemSupervision["motivo"] }>;
};

type Candidato = CursoPlanificable & { h: HorarioParseado; motivo: ItemSupervision["motivo"] };

export const MINIMO_POR_SABADO = 2;

/**
 * Reparte las supervisiones en los sabados del rango:
 * 1. una visita por docente que aun no fue supervisado en el trimestre;
 * 2. una visita por cada curso restante (el plano ideal);
 * 3. seguimientos para que ningun sabado quede con menos de 2.
 * Nunca pone dos cursos a la misma hora el mismo dia (el coordinador es uno).
 */
export function generarPlan(params: {
  cursos: CursoPlanificable[];
  inicio: string;
  fin: string;
  docentesYaSupervisados: Set<string>;
  cursosYaSupervisados: Set<string>;
}): PlanSupervision {
  const sabados = sabadosEntre(params.inicio, params.fin);
  const sinHorario: CursoPlanificable[] = [];
  const candidatos: Array<CursoPlanificable & { h: HorarioParseado }> = [];

  for (const curso of params.cursos) {
    const h = parseHorario(curso.horario);
    if (h) candidatos.push({ ...curso, h });
    else sinHorario.push(curso);
  }

  const ordenar = <T extends { h: HorarioParseado; docenteNombre: string; nombre: string }>(lista: T[]) =>
    lista.sort(
      (a, b) =>
        a.docenteNombre.localeCompare(b.docenteNombre) ||
        a.h.dia - b.h.dia ||
        a.h.inicio.localeCompare(b.h.inicio) ||
        a.nombre.localeCompare(b.nombre),
    );
  ordenar(candidatos);

  // Cuantos cursos comparten franja: se prefiere visitar a cada docente en la
  // franja menos concurrida, para dejar libres las franjas saturadas.
  const ocupacionFranja = new Map<string, number>();
  const franja = (h: HorarioParseado) => `${h.dia}-${h.inicio}`;
  for (const c of candidatos) ocupacionFranja.set(franja(c.h), (ocupacionFranja.get(franja(c.h)) ?? 0) + 1);

  const colaDocentes: Candidato[] = [];
  const usados = new Set<string>();
  const porDocente = new Map<string, Array<CursoPlanificable & { h: HorarioParseado }>>();
  for (const c of candidatos) porDocente.set(c.docenteId, [...(porDocente.get(c.docenteId) ?? []), c]);

  // Docentes con menos cursos primero: tienen menos opciones de franja.
  const docentesOrdenados = [...porDocente.entries()].sort((a, b) => a[1].length - b[1].length);
  for (const [docenteId, cursos] of docentesOrdenados) {
    if (params.docentesYaSupervisados.has(docenteId)) continue;
    const elegido = [...cursos].sort(
      (a, b) =>
        Number(params.cursosYaSupervisados.has(a.id)) - Number(params.cursosYaSupervisados.has(b.id)) ||
        (ocupacionFranja.get(franja(a.h)) ?? 0) - (ocupacionFranja.get(franja(b.h)) ?? 0),
    )[0];
    colaDocentes.push({ ...elegido, motivo: "docente" });
    usados.add(elegido.id);
  }

  const colaCursos: Candidato[] = candidatos
    .filter((c) => !usados.has(c.id) && !params.cursosYaSupervisados.has(c.id))
    .map((c) => ({ ...c, motivo: "curso" }));

  const cola = [...colaDocentes, ...colaCursos];
  const semanas = sabados.map((semana) => ({ semana, items: [] as ItemSupervision[] }));
  if (!semanas.length) {
    return { semanas, sinHorario, docentesSinCupo: [], cursosSinCupo: [] };
  }

  const franjasSabado = new Set(candidatos.filter((c) => c.h.dia === 6).map((c) => c.h.inicio)).size;
  const capacidad = Math.max(franjasSabado, 1);
  const meta = Math.min(capacidad, Math.max(MINIMO_POR_SABADO, Math.ceil(cola.length / semanas.length)));

  const libre = (semana: (typeof semanas)[number], c: Candidato) =>
    !semana.items.some(
      (item) =>
        item.docenteId === c.docenteId ||
        (item.fecha === fechaDeClase(semana.semana, c.h.dia) && item.inicio === c.h.inicio),
    );

  const colocar = (semana: (typeof semanas)[number], c: Candidato) => {
    semana.items.push({
      id: `${semana.semana}-${c.id}`,
      semana: semana.semana,
      fecha: fechaDeClase(semana.semana, c.h.dia),
      inicio: c.h.inicio,
      fin: c.h.fin,
      cursoId: c.id,
      cursoNombre: c.nombre,
      horario: c.horario,
      edificio: c.edificio,
      virtual: c.virtual,
      docenteId: c.docenteId,
      docenteNombre: c.docenteNombre,
      motivo: c.motivo,
    });
  };

  // Primera pasada: hasta `meta` por sabado, respetando el orden de prioridad.
  for (const semana of semanas) {
    for (let i = 0; i < cola.length && semana.items.length < meta; ) {
      if (libre(semana, cola[i])) {
        colocar(semana, cola[i]);
        cola.splice(i, 1);
      } else {
        i += 1;
      }
    }
  }
  // Segunda pasada: lo que no cupo por choques de horario va a franjas libres.
  for (const semana of semanas) {
    for (let i = 0; i < cola.length && semana.items.length < capacidad; ) {
      if (libre(semana, cola[i])) {
        colocar(semana, cola[i]);
        cola.splice(i, 1);
      } else {
        i += 1;
      }
    }
  }

  // Seguimientos: completar el minimo de 2 por sabado, rotando por los
  // docentes con menos visitas programadas.
  const visitas = new Map<string, number>();
  for (const s of semanas) for (const item of s.items) visitas.set(item.cursoId, (visitas.get(item.cursoId) ?? 0) + 1);
  const visitasDocente = (docenteId: string) =>
    semanas.reduce((n, s) => n + s.items.filter((item) => item.docenteId === docenteId).length, 0);

  for (const semana of semanas) {
    while (semana.items.length < Math.min(MINIMO_POR_SABADO, capacidad)) {
      const siguiente = candidatos
        .map((c): Candidato => ({ ...c, motivo: "seguimiento" }))
        .filter((c) => libre(semana, c))
        .sort(
          (a, b) =>
            visitasDocente(a.docenteId) - visitasDocente(b.docenteId) ||
            (visitas.get(a.id) ?? 0) - (visitas.get(b.id) ?? 0),
        )[0];
      if (!siguiente) break;
      colocar(semana, siguiente);
      visitas.set(siguiente.id, (visitas.get(siguiente.id) ?? 0) + 1);
    }
    semana.items.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio.localeCompare(b.inicio));
  }

  const docentesSinCupo = [...new Set(cola.filter((c) => c.motivo === "docente").map((c) => c.docenteNombre))];
  return { semanas, sinHorario, docentesSinCupo, cursosSinCupo: cola };
}

/** Fecha real de la clase dentro de la semana que termina en `sabado`. */
function fechaDeClase(sabado: string, dia: number) {
  const fecha = parseFecha(sabado);
  if (!fecha) return sabado;
  fecha.setDate(fecha.getDate() - (6 - dia));
  return fechaISO(fecha);
}

export type EvaluacionMinima = {
  id: string;
  docente_id: string | null;
  curso_id: string | null;
  fecha_observacion: string;
};

export type EstadoItem = "realizada" | "otra-fecha" | "hoy" | "vencida" | "pendiente";

export function estadoItem(item: ItemSupervision, evaluaciones: EvaluacionMinima[], hoy: string): EstadoItem {
  const delCurso = evaluaciones.filter((e) => e.curso_id === item.cursoId);
  if (delCurso.some((e) => sabadoDeSemana(e.fecha_observacion) === item.semana)) return "realizada";
  if (item.motivo !== "seguimiento" && delCurso.length) return "otra-fecha";
  if (item.fecha === hoy) return "hoy";
  if (item.semana < hoy) return "vencida";
  return "pendiente";
}

export type LogroSemana = {
  semana: string;
  realizadas: number;
  programadas: number;
  /** 0-100: 1 supervision = logro esperado (100%). */
  pctEsperado: number;
  /** 0-100: 2 supervisiones = logro optimo (100%). */
  pctOptimo: number;
  nivel: "optimo" | "esperado" | "sin-logro" | "futura";
};

export function logroSemanal(
  semanas: PlanSupervision["semanas"],
  evaluaciones: EvaluacionMinima[],
  hoy: string,
): LogroSemana[] {
  return semanas.map(({ semana, items }) => {
    const realizadas = evaluaciones.filter((e) => sabadoDeSemana(e.fecha_observacion) === semana).length;
    const futura = semana > sabadoDeSemana(hoy) || (semana === sabadoDeSemana(hoy) && realizadas === 0);
    return {
      semana,
      realizadas,
      programadas: items.length,
      pctEsperado: Math.min(realizadas, 1) * 100,
      pctOptimo: Math.round((Math.min(realizadas, 2) / 2) * 100),
      nivel: realizadas >= 2 ? "optimo" : realizadas === 1 ? "esperado" : futura ? "futura" : "sin-logro",
    };
  });
}
