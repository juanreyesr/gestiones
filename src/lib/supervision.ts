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

/**
 * El coordinador tambien imparte cursos (p. ej. Tesis), pero no se supervisa
 * a si mismo: sus cursos quedan fuera del plan y de la cobertura.
 */
export function esCursoDelCoordinador(docenteNombre: string | null | undefined) {
  return !!docenteNombre && sinAcentos(docenteNombre).replace(/\s+/g, " ").trim().startsWith("juan jose reyes");
}

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

/** Semana 1 del trimestre: 13 sabados de clase que terminan en `fin`. */
export const SEMANAS_TRIMESTRE = 13;

export function inicioClasesPorDefecto(fin: string) {
  const fecha = parseFecha(sabadoDeSemana(fin));
  if (!fecha) return fin;
  fecha.setDate(fecha.getDate() - (SEMANAS_TRIMESTRE - 1) * 7);
  return fechaISO(fecha);
}

const ORDINALES = [
  "Primer", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo",
  "Undécimo", "Duodécimo", "Decimotercer", "Decimocuarto", "Decimoquinto",
];

/** "Tercer trimestre psicología clínica y consejería social" (año 1, T3). */
export function rotuloTrimestreCarrera(anioCarrera: number, trimestre: number, carrera: string) {
  const numero = (anioCarrera - 1) * 3 + trimestre;
  const ordinal = ORDINALES[numero - 1] ?? `${numero}.º`;
  return `${ordinal} trimestre ${carrera.toLocaleLowerCase("es")}`.trim();
}

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function mesDeFecha(fecha: string) {
  return MESES[Number(fecha.slice(5, 7)) - 1] ?? "";
}

/** "9:30–11:30" a partir del horario del curso. */
export function horasDeHorario(horario: string | null | undefined) {
  const parseado = parseHorario(horario);
  if (!parseado) return horario?.trim() ?? "";
  const sinCero = (hora: string) => hora.replace(/^0/, "");
  return `${sinCero(parseado.inicio)}${parseado.fin ? `–${sinCero(parseado.fin)}` : ""}`;
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
  docenteCorreo?: string | null;
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
  docenteCorreo: string | null;
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
  /** Semanas sin supervisiones (p. ej. la de parciales). */
  semanasExcluidas?: Set<string>;
}): PlanSupervision {
  const sabados = sabadosEntre(params.inicio, params.fin).filter((s) => !params.semanasExcluidas?.has(s));
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
      docenteCorreo: c.docenteCorreo ?? null,
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
  numero: number;
  realizadas: number;
  programadas: number;
  /** 0-100: 1 supervision = logro esperado (100%). */
  pctEsperado: number;
  /** 0-100: 2 supervisiones = logro optimo (100%). */
  pctOptimo: number;
  nivel: "optimo" | "esperado" | "sin-logro" | "futura" | "parcial";
};

/**
 * Logro de TODAS las semanas del trimestre, desde la semana 1: cuenta cualquier
 * evaluacion registrada esa semana, este o no en el plan (retroactivo y fuera
 * de calendario incluidos). La semana de parciales no tiene meta.
 */
export function logroSemanal(params: {
  semanas: string[];
  programadasPorSemana: Map<string, number>;
  evaluaciones: EvaluacionMinima[];
  hoy: string;
  parcial: string | null;
}): LogroSemana[] {
  const semanaHoy = sabadoDeSemana(params.hoy);
  return params.semanas.map((semana, indice) => {
    const realizadas = params.evaluaciones.filter((e) => sabadoDeSemana(e.fecha_observacion) === semana).length;
    const futura = semana > semanaHoy || (semana === semanaHoy && realizadas === 0);
    const nivel: LogroSemana["nivel"] =
      semana === params.parcial && realizadas === 0
        ? "parcial"
        : realizadas >= 2
          ? "optimo"
          : realizadas === 1
            ? "esperado"
            : futura
              ? "futura"
              : "sin-logro";
    return {
      semana,
      numero: indice + 1,
      realizadas,
      programadas: params.programadasPorSemana.get(semana) ?? 0,
      pctEsperado: Math.min(realizadas, 1) * 100,
      pctOptimo: Math.round((Math.min(realizadas, 2) / 2) * 100),
      nivel,
    };
  });
}

/** Marca de una celda del formato: X realizada, P programada, NR programada y no realizada. */
export type MarcaCelda = "X" | "P" | "NR" | "";

export function marcaCelda(params: {
  cursoId: string;
  semana: string;
  evaluaciones: EvaluacionMinima[];
  item: ItemSupervision | undefined;
  hoy: string;
}): MarcaCelda {
  if (params.evaluaciones.some((e) => e.curso_id === params.cursoId && sabadoDeSemana(e.fecha_observacion) === params.semana)) {
    return "X";
  }
  if (!params.item) return "";
  const estado = estadoItem(params.item, params.evaluaciones, params.hoy);
  if (estado === "vencida") return "NR";
  if (estado === "otra-fecha") return "";
  return "P";
}

// ============================================================
// Plan completo del periodo (lo usan la vista y el recordatorio del servidor)
// ============================================================

/**
 * inicioClases: sabado de la semana 1 (desde ahi se mide el logro).
 * inicio: desde cuando se reparte la propuesta. parcial: numero de semana de
 * parciales, sin supervisiones programadas.
 */
export type RangoSupervision = { inicioClases: string; inicio: string; fin: string; parcial: number | null };

export const SEMANA_PARCIAL_POR_DEFECTO = 8;

export function rangoPorDefecto(anio: number, trimestre: Trimestre, hoy: string): RangoSupervision {
  const fin = finPorDefecto(anio, trimestre);
  return {
    inicioClases: inicioClasesPorDefecto(fin),
    inicio: sabadoEnOPosterior(hoy),
    fin,
    parcial: SEMANA_PARCIAL_POR_DEFECTO,
  };
}

export type CursoBase = {
  id: string;
  nombre: string;
  horario: string | null;
  edificio: string | null;
  virtual: boolean;
  activo: boolean;
  anio: number;
  trimestre: Trimestre;
  docenteId: string | null;
  docenteNombre: string | null;
};

/**
 * Separa los cursos del periodo (supervisables, del coordinador, sin docente
 * activo) y calcula el plan con las evaluaciones anteriores a su inicio.
 */
export function construirPlanSupervision<C extends CursoBase>(params: {
  anio: number;
  trimestre: Trimestre;
  cursos: C[];
  /** id -> nombre de los docentes activos. */
  docentesActivos: Map<string, string>;
  /** id -> correo del docente, para mostrarlo junto a cada supervision. */
  correosDocentes?: Map<string, string | null>;
  evaluaciones: EvaluacionMinima[];
  rango: RangoSupervision;
}) {
  const { rango, docentesActivos } = params;
  const nombreDocente = (c: C) =>
    c.docenteId ? (docentesActivos.get(c.docenteId) ?? c.docenteNombre) : c.docenteNombre;

  const cursosDelPeriodo = params.cursos.filter(
    (c) => c.activo && c.anio === params.anio && c.trimestre === params.trimestre,
  );
  const cursosPropios = cursosDelPeriodo.filter((c) => esCursoDelCoordinador(nombreDocente(c)));
  const cursosPeriodo = cursosDelPeriodo.filter((c) => !esCursoDelCoordinador(nombreDocente(c)));
  const cursosSinDocente = cursosPeriodo.filter((c) => !c.docenteId || !docentesActivos.has(c.docenteId));
  const planificables = new Set(
    cursosPeriodo.filter((c) => c.docenteId && docentesActivos.has(c.docenteId)).map((c) => c.id),
  );

  const semanas = sabadosEntre(rango.inicioClases, rango.fin);
  const semanaParcial = rango.parcial ? (semanas[rango.parcial - 1] ?? null) : null;
  const previas = params.evaluaciones.filter((e) => e.fecha_observacion < rango.inicio);

  const plan = generarPlan({
    cursos: cursosPeriodo
      .filter((c) => planificables.has(c.id))
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        horario: c.horario,
        edificio: c.edificio,
        virtual: c.virtual,
        docenteId: c.docenteId as string,
        docenteNombre: docentesActivos.get(c.docenteId as string) ?? c.docenteNombre ?? "Docente",
        docenteCorreo: params.correosDocentes?.get(c.docenteId as string) ?? null,
      })),
    inicio: rango.inicio,
    fin: rango.fin,
    docentesYaSupervisados: new Set(previas.map((e) => e.docente_id).filter((id): id is string => !!id)),
    cursosYaSupervisados: new Set(previas.map((e) => e.curso_id).filter((id): id is string => !!id)),
    semanasExcluidas: semanaParcial ? new Set([semanaParcial]) : undefined,
  });

  return {
    plan,
    semanas,
    semanaParcial,
    cursosDelPeriodo,
    cursosPropios,
    cursosPeriodo,
    cursosSinDocente,
    planificables,
    nombreDocente,
  };
}
