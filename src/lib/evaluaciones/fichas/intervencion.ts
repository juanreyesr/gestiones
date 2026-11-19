/**
 * «Intervención guiada» (v1.1, B): lógica pura de la sección del expediente. Solo panel
 * (usa lo clínico: sugeridas por resultados, expediente, registro guiado del MCEA).
 *
 *  - Estado de cada ficha a partir de las respuestas y los enlaces del paciente:
 *    sin usar / enviada / respondida por el paciente / llenada por el terapeuta.
 *  - Sugerencias (misma lógica de `sugeridas.ts`) y «siguiente en la ruta».
 *  - `prellenado`: respuestas iniciales para «Llenarla yo», con el origen legible de cada campo.
 *  - Datos listos para guardar (respuesta del terapeuta) o para enviar como borrador inicial del enlace.
 * Sin migraciones: usa la tabla de respuestas (origen «codigo», `datos.autor = "terapeuta"`) y la
 * columna `borrador` del enlace.
 */
import { datosMceaGuardados } from "../mcea/codigo";
import { camposDeFicha, ETAPAS_FICHAS, FICHAS, FICHA_IDS, fichaPorId, esFichaId, type FichaId } from "./catalogo";
import { esFichaDelTerapeuta, limpiarBorradorFicha, avanceFicha, respuestasVacias, campoTieneContenido, validarFicha, type FichaRespuesta, type RespuestasFicha } from "./codigo";
import { fichasSugeridas, type FilaRespuesta } from "./sugeridas";

export type RespuestaFila = FilaRespuesta & { id?: string };
export type EnlaceFila = {
  id?: string;
  instrumento: string;
  estado: string;
  opciones: Record<string, unknown> | null | undefined;
  createdAt: string;
  borrador?: Record<string, unknown> | null;
};

export type EstadoClave = "sin-usar" | "enviada" | "respondida" | "terapeuta";

export const ETIQUETA_ESTADO: Record<EstadoClave, string> = {
  "sin-usar": "Sin usar",
  enviada: "Enviada al paciente",
  respondida: "Respondida por el paciente",
  terapeuta: "Llenada por el terapeuta",
};

export type EstadoFicha = {
  ficha: FichaId;
  estado: EstadoClave;
  etiqueta: string;
  /** Fecha (AAAA-MM-DD) de lo que define el estado; null si está sin usar. */
  fecha: string | null;
  /** ¿Tiene alguna respuesta (del paciente o del terapeuta)? Cuenta como «hecha» para la ruta. */
  hecha: boolean;
  /** La respuesta más reciente de cualquier autor. */
  respuestaId: string | null;
  /** La versión más reciente llenada por el terapeuta (su punto de partida para enviarla). */
  terapeutaId: string | null;
  /** Enlace abierto (sin responder) de esta ficha. */
  enlaceId: string | null;
};

const cuando = (r: FilaRespuesta) => r.fecha ?? r.createdAt;
const masReciente = (a: FilaRespuesta, b: FilaRespuesta) => (cuando(b) < cuando(a) ? -1 : cuando(b) > cuando(a) ? 1 : b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0);
const dia = (iso: string) => iso.slice(0, 10);

const fichaDeRespuesta = (r: RespuestaFila): FichaId | null => {
  if (r.instrumento !== "ficha") return null;
  const f = (r.datos as { ficha?: unknown } | null)?.ficha;
  return esFichaId(f) ? f : null;
};
const fichaDeEnlace = (e: EnlaceFila): FichaId | null => {
  if (e.instrumento !== "ficha") return null;
  const f = e.opciones?.ficha;
  return esFichaId(f) ? f : null;
};

/** Estado de las 8 fichas (en el orden del catálogo). */
export function estadosFichas(respuestas: RespuestaFila[], enlaces: EnlaceFila[]): EstadoFicha[] {
  return FICHA_IDS.map((id) => {
    const resp = respuestas.filter((r) => fichaDeRespuesta(r) === id).sort(masReciente);
    const ultima = resp[0] ?? null;
    const terapeuta = resp.find((r) => esFichaDelTerapeuta(r.datos)) ?? null;
    const abierta = enlaces
      .filter((e) => e.estado === "abierta" && fichaDeEnlace(e) === id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    const base = { ficha: id, hecha: Boolean(ultima), respuestaId: ultima?.id ?? null, terapeutaId: terapeuta?.id ?? null, enlaceId: abierta?.id ?? null };
    // Un enlace enviado después de la última respuesta (p. ej. para repetirla) manda sobre ella.
    if (abierta && (!ultima || abierta.createdAt > ultima.createdAt)) return { ...base, estado: "enviada", etiqueta: ETIQUETA_ESTADO.enviada, fecha: dia(abierta.createdAt) };
    if (ultima) {
      const estado: EstadoClave = esFichaDelTerapeuta(ultima.datos) ? "terapeuta" : "respondida";
      return { ...base, estado, etiqueta: ETIQUETA_ESTADO[estado], fecha: dia(cuando(ultima)) };
    }
    return { ...base, estado: "sin-usar", etiqueta: ETIQUETA_ESTADO["sin-usar"], fecha: null };
  });
}

export type SugerenciaIntervencion = { ficha: FichaId; motivos: string[]; enRuta: boolean };

/**
 * «Siguiente en la ruta»: etapa actual = la más avanzada en la que hay alguna ficha hecha (la 1 si no
 * hay ninguna). Si en ella quedan fichas por hacer, la primera de ellas; si ya están todas hechas, la
 * primera por hacer de la etapa siguiente. Lista vacía cuando no queda nada por recorrer.
 */
export function siguientesEnRuta(estados: EstadoFicha[]): FichaId[] {
  const hecha = new Set(estados.filter((e) => e.hecha).map((e) => e.ficha));
  const etapas = [...new Set(FICHAS.map((f) => f.etapa))].sort((a, b) => a - b);
  const actual = [...etapas].reverse().find((n) => FICHAS.some((f) => f.etapa === n && hecha.has(f.id))) ?? etapas[0];
  const pendientes = (n: number) => FICHAS.filter((f) => f.etapa === n && !hecha.has(f.id)).map((f) => f.id);
  const enActual = pendientes(actual);
  if (enActual.length) return [enActual[0]];
  const siguiente = etapas.find((n) => n > actual && pendientes(n).length);
  return siguiente === undefined ? [] : [pendientes(siguiente)[0]];
}

/**
 * Sugerencias del panel: las de `fichasSugeridas` (resultados del EAPI/MCEA y 1.1/1.3 sin hacer) más
 * las que siguen en la ruta, en el orden del catálogo. Se omiten las ya hechas o ya enviadas (no hay
 * nada que hacer con ellas).
 */
export function sugerenciasIntervencion(respuestas: RespuestaFila[], enlaces: EnlaceFila[]): SugerenciaIntervencion[] {
  const estados = estadosFichas(respuestas, enlaces);
  const ocupada = (f: FichaId) => {
    const e = estados.find((x) => x.ficha === f)!;
    return e.hecha || e.estado === "enviada";
  };
  const mapa = new Map<FichaId, SugerenciaIntervencion>();
  for (const s of fichasSugeridas(respuestas)) if (!ocupada(s.ficha)) mapa.set(s.ficha, { ficha: s.ficha, motivos: [...s.motivos], enRuta: false });
  for (const f of siguientesEnRuta(estados)) {
    if (ocupada(f)) continue;
    const ficha = fichaPorId(f)!;
    const motivo = `Sigue en la ruta (etapa ${ficha.etapa} · ${ETAPAS_FICHAS[ficha.etapa]})`;
    const previa = mapa.get(f);
    mapa.set(f, { ficha: f, motivos: [...(previa?.motivos ?? []), motivo], enRuta: true });
  }
  return FICHA_IDS.filter((f) => mapa.has(f)).map((f) => mapa.get(f)!);
}

/* ------------------------------ prellenado ------------------------------ */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** «2026-11-02» → «2 nov 2026». */
export function fechaLegible(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1]} ${m[1]}` : iso;
}

export type FuentesPrellenado = {
  /** Ficha clínica del paciente. */
  paciente?: { motivoConsulta?: string | null; antecedentesPsicologicos?: string | null } | null;
  /** Motivo de la última solicitud o cita (si la ficha clínica no tiene motivo de consulta). */
  motivoCita?: string | null;
  /** Respuestas del paciente (MCEA con registro guiado, respuestas previas de la misma ficha). */
  respuestas?: RespuestaFila[];
};

export type Prellenado = {
  /** Respuestas completas (todos los campos de la ficha), listas para el editor. */
  respuestas: RespuestasFicha;
  /** Origen legible de cada campo prellenado (por id de campo); los vacíos no aparecen. */
  origen: Record<string, string>;
};

const texto = (v: string | null | undefined) => (typeof v === "string" ? v.trim() : "");

/** Último registro guiado (situación, pensamiento, emoción y conducta) del MCEA, con su fecha. */
function ultimoRegistroMcea(respuestas: RespuestaFila[]) {
  for (const r of respuestas.filter((x) => x.instrumento === "mcea").sort(masReciente)) {
    const tr = datosMceaGuardados(r.datos)?.tr;
    if (tr && !("skip" in tr) && (tr.sit.trim() || tr.pen.trim() || tr.emo.length || tr.beh.length)) return { tr, fecha: dia(cuando(r)) };
  }
  return null;
}

/**
 * Respuestas iniciales de «Llenarla yo» y de dónde salió cada campo prellenado. Primero lo que ya hay
 * en el expediente (según la ficha) y, encima, lo que la misma ficha ya tenga de su respuesta más
 * reciente (del paciente o del terapeuta), que es lo más específico.
 *  - 1.1 motivo ← motivo de consulta de la ficha clínica (o el de la última cita o solicitud). El
 *    expediente no tiene un campo de metas, así que las metas no se prellenan.
 *  - 1.2 «¿había vivido algo parecido?» ← antecedentes psicológicos de la ficha clínica.
 *  - 1.3 primer momento del ciclo ← último registro guiado del MCEA (situación, pensamiento,
 *    emoción con su intensidad y conducta; el cuerpo no se registra allí). Las celdas admiten 500
 *    caracteres: lo más largo se recorta.
 */
export function prellenado(fichaId: FichaId, fuentes: FuentesPrellenado): Prellenado {
  const ficha = fichaPorId(fichaId)!;
  const base = respuestasVacias(ficha);
  const origen: Record<string, string> = {};
  const poner = (campo: string, valor: RespuestasFicha[string], de: string, sobrescribir = false) => {
    const c = camposDeFicha(ficha).find((x) => x.id === campo);
    if (!c || !campoTieneContenido(c, valor)) return;
    if (!sobrescribir && campoTieneContenido(c, base[campo])) return;
    base[campo] = valor;
    origen[campo] = de;
  };
  const respuestas = fuentes.respuestas ?? [];

  if (fichaId === "1.1") {
    const motivo = texto(fuentes.paciente?.motivoConsulta);
    if (motivo) poner("motivo", motivo, "Del motivo de consulta de la ficha clínica");
    else if (texto(fuentes.motivoCita)) poner("motivo", texto(fuentes.motivoCita), "Del motivo de la última cita o solicitud");
  }
  if (fichaId === "1.2") {
    const hist = texto(fuentes.paciente?.antecedentesPsicologicos);
    if (hist) poner("parecido", hist, "De los antecedentes psicológicos de la ficha clínica");
  }
  if (fichaId === "1.3") {
    const reg = ultimoRegistroMcea(respuestas);
    if (reg) {
      const { tr } = reg;
      const emocion = tr.emo.length ? `${tr.emo.join(", ")}, ${tr.int}` : "";
      const fila = [tr.sit.trim(), tr.pen.trim(), emocion, "", tr.beh.join(", ")];
      poner("ciclo", [fila, ["", "", "", "", ""], ["", "", "", "", ""]], `Del registro guiado del MCEA del ${fechaLegible(reg.fecha)} (situación, pensamiento, emoción y conducta; el cuerpo queda por completar)`);
    }
  }

  // Lo que la misma ficha ya tiene de su respuesta más reciente (del paciente o del terapeuta).
  const previa = respuestas.filter((r) => fichaDeRespuesta(r) === fichaId).sort(masReciente)[0];
  if (previa) {
    const prev = limpiarBorradorFicha({ ficha: fichaId, respuestas: (previa.datos as { respuestas?: unknown })?.respuestas }, { ficha: fichaId });
    const de = `${esFichaDelTerapeuta(previa.datos) ? "De la versión del terapeuta" : "De la respuesta del paciente"} del ${fechaLegible(dia(cuando(previa)))}`;
    for (const c of camposDeFicha(ficha)) poner(c.id, prev.respuestas[c.id], de, true);
  }

  // Se limpia (longitudes, filas) con las mismas reglas del avance guardado.
  const limpio = limpiarBorradorFicha({ ficha: fichaId, respuestas: base }, { ficha: fichaId }).respuestas;
  return { respuestas: limpio, origen };
}

/* ------------------------------ guardar y enviar ------------------------------ */

/** Bytes máximos de lo que se guarda en un jsonb (el límite de la base es 20 000). */
export const MAX_BYTES_FICHA = 18000;
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;

/** Descripción de la tarea que se agrega a la sesión al enviar la ficha (la misma de siempre). */
export const tareaDeFicha = (id: FichaId) => {
  const f = fichaPorId(id)!;
  return `Ficha ${f.id} · ${f.titulo} (enviada por enlace)`;
};

/** Datos de la respuesta del terapeuta (validados; con `autor: "terapeuta"`). */
export function datosFichaTerapeuta(fichaId: FichaId, respuestas: RespuestasFicha, ahora = new Date()): { ok: true; datos: FichaRespuesta } | { ok: false; error: string } {
  const v = validarFicha({ ficha: fichaId, respuestas, autor: "terapeuta", enviado: ahora.toISOString() }, { ficha: fichaId }, { permitirAutor: true });
  if (!v.ok) return v;
  if (avanceFicha(v.datos).respondidas === 0) return { ok: false, error: "La ficha está vacía: escriba algo antes de guardarla." };
  if (bytes(v.datos) > MAX_BYTES_FICHA) return { ok: false, error: "La ficha es demasiado larga para guardarla. Acorte algunas respuestas." };
  return { ok: true, datos: { ...v.datos, autor: "terapeuta" } };
}

/** Borrador inicial del enlace con lo ya escrito (el paciente lo ve y lo completa o corrige). */
export function borradorInicialFicha(fichaId: FichaId, respuestas: RespuestasFicha): { ok: true; borrador: { ficha: FichaId; respuestas: RespuestasFicha } } | { ok: false; error: string } {
  const borrador = limpiarBorradorFicha({ ficha: fichaId, respuestas }, { ficha: fichaId });
  if (avanceFicha(borrador).respondidas === 0) return { ok: false, error: "No hay nada escrito para enviar. Use «Enviar al paciente» para mandarla vacía." };
  if (bytes(borrador) > MAX_BYTES_FICHA) return { ok: false, error: "Lo escrito es demasiado largo para enviarlo como punto de partida. Acorte algunas respuestas." };
  return { ok: true, borrador };
}

/** Líneas para el PDF del expediente: una por ficha con alguna respuesta (la más reciente de cada una). */
export function resumenIntervencion(respuestas: RespuestaFila[]): string[] {
  return estadosFichas(respuestas, [])
    .filter((e) => e.hecha)
    .map((e) => {
      const f = fichaPorId(e.ficha)!;
      return `Ficha ${f.id} · ${f.titulo}: ${e.etiqueta.toLowerCase()}${e.fecha ? ` (${fechaLegible(e.fecha)})` : ""}`;
    });
}
