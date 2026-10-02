/**
 * Interpreta una fecha y hora escritas en español, como las que se le mandan
 * al bot de Telegram al programar un mensaje: "mañana 7:00", "hoy 6 pm",
 * "viernes a las 9", "15/10 14:30", "15 de octubre 3:30 p. m.", "en 2 horas".
 * Todo en hora de Guatemala (UTC-6 todo el año, sin horario de verano).
 *
 * Reglas para no adivinar de mas:
 *  - La hora es obligatoria (salvo "en N minutos/horas").
 *  - "a las 3" sin a. m./p. m.: de 1 a 6 se toma como de la tarde (nadie
 *    programa un WhatsApp a las 3 de la madrugada); de 7 a 11, de la mañana.
 *    El resumen que se confirma muestra siempre "a. m." o "p. m.".
 *  - Sin dia: hoy si la hora todavia no pasa; si ya paso, mañana.
 *  - Un dia de la semana es el proximo (hoy si la hora todavia no pasa).
 */

const DESFASE = "-06:00";
const ZONA = "America/Guatemala";
const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MAX_ADELANTO_MS = 366 * 86_400_000;

export type ResultadoFechaHora = { ok: true; iso: string } | { ok: false; motivo: string };

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** YYYY-MM-DD en Guatemala del instante dado. */
export function ymdLocal(instante: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(instante));
}

function sumarDias(ymd: string, dias: number) {
  return ymdLocal(Date.parse(`${ymd}T12:00:00${DESFASE}`) + dias * 86_400_000);
}

function diaSemana(ymd: string) {
  return new Date(`${ymd}T12:00:00${DESFASE}`).getUTCDay();
}

function fechaValida(anio: number, mes: number, dia: number) {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const ymd = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  // 31/02 se desborda a marzo: se rechaza comparando de vuelta.
  return ymdLocal(Date.parse(`${ymd}T12:00:00${DESFASE}`)) === ymd ? ymd : null;
}

export function instanteLocal(ymd: string, hora: number, minuto: number) {
  return Date.parse(`${ymd}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00${DESFASE}`);
}

export function parsearFechaHora(texto: string, ahora = Date.now()): ResultadoFechaHora {
  let t = normalizar(texto)
    // "9am", "9 am", "9 a. m.", "9 a.m." → " am "
    .replace(/(?<=\d|\b)p\.?\s?m\b\.?/g, " pm ")
    .replace(/(?<=\d|\b)a\.?\s?m\b\.?/g, " am ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return { ok: false, motivo: "No escribiste la fecha ni la hora." };

  // Relativo: "en 30 minutos", "en 2 horas", "en una hora", "en media hora".
  const relativo = t.match(/^(?:dentro de|en) (\d{1,3}|una|un|media) ?(m|min|mins|minutos?|h|hr|hrs|horas?)$/);
  if (relativo) {
    const cantidad = relativo[1] === "media" ? 0.5 : /^un/.test(relativo[1]) ? 1 : Number(relativo[1]);
    const minutos = relativo[2].startsWith("h") ? cantidad * 60 : cantidad;
    if (!minutos) return { ok: false, motivo: "Indica cuántos minutos u horas." };
    return validar(ahora + Math.round(minutos) * 60_000, ahora);
  }

  // Parte del dia: "de la mañana" no es "mañana" (el dia).
  let periodo: "am" | "pm" | null = null;
  if (/\b(de|en) la manana\b/.test(t)) {
    periodo = "am";
    t = t.replace(/\b(de|en) la manana\b/, " ");
  } else if (/\b(de|en) la (tarde|noche)\b/.test(t)) {
    periodo = "pm";
    t = t.replace(/\b(de|en) la (tarde|noche)\b/, " ");
  }
  if (/\bpm\b/.test(t)) periodo = "pm";
  else if (/\bam\b/.test(t)) periodo = periodo ?? "am";

  const hoy = ymdLocal(ahora);
  let ymd: string | null = null;
  let diaExplicito = false;
  let semana = false;

  const numerica = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  const conMes = t.match(new RegExp(`\\b(\\d{1,2}) de (${MESES.join("|")})(?: (?:de )?(\\d{4}))?\\b`));
  if (/\bpasado manana\b/.test(t)) {
    ymd = sumarDias(hoy, 2);
    t = t.replace(/\bpasado manana\b/, " ");
  } else if (/\bmanana\b/.test(t)) {
    ymd = sumarDias(hoy, 1);
    t = t.replace(/\bmanana\b/, " ");
  } else if (/\bhoy\b/.test(t)) {
    ymd = hoy;
    t = t.replace(/\bhoy\b/, " ");
  } else if (numerica || conMes) {
    const [completo, d, m, a] = numerica ?? conMes!;
    const mes = numerica ? Number(m) : MESES.indexOf(m) + 1;
    const anioActual = Number(hoy.slice(0, 4));
    let anio = a ? Number(a.length === 2 ? `20${a}` : a) : anioActual;
    let candidato = fechaValida(anio, mes, Number(d));
    if (!candidato) return { ok: false, motivo: `La fecha "${completo}" no existe.` };
    if (!a && candidato < hoy) {
      // Una fecha de las ultimas semanas es un error, no el año que viene.
      if (Date.parse(`${hoy}T12:00:00${DESFASE}`) - Date.parse(`${candidato}T12:00:00${DESFASE}`) < 45 * 86_400_000) {
        return { ok: false, motivo: `El ${completo} ya pasó.` };
      }
      anio += 1;
      candidato = fechaValida(anio, mes, Number(d));
      if (!candidato) return { ok: false, motivo: `La fecha "${completo}" no existe.` };
    }
    ymd = candidato;
    t = t.replace(completo, " ");
  } else {
    const indice = DIAS.findIndex((nombre) => new RegExp(`\\b${nombre}\\b`).test(t));
    if (indice >= 0) {
      ymd = sumarDias(hoy, (indice - diaSemana(hoy) + 7) % 7);
      semana = true;
      t = t.replace(new RegExp(`\\b(el |este |proximo )?${DIAS[indice]}\\b`), " ");
    }
  }
  if (ymd) diaExplicito = true;

  // Hora: "14:30", "2:30 pm", "7.15", "9 am", "a las 7", "mediodia".
  let hora: number | null = null;
  let minuto = 0;
  const conMinutos = t.match(/\b(\d{1,2})[:.h](\d{2})\b/);
  const soloHora = t.match(/\b(?:a las |a la |las )?(\d{1,2})\b/);
  if (/\bmedio ?dia\b/.test(t)) {
    hora = 12;
    periodo = null;
  } else if (/\bmedia ?noche\b/.test(t)) {
    hora = 0;
    periodo = null;
  } else if (conMinutos) {
    hora = Number(conMinutos[1]);
    minuto = Number(conMinutos[2]);
  } else if (soloHora) {
    hora = Number(soloHora[1]);
  }

  if (hora === null) {
    return {
      ok: false,
      motivo: diaExplicito ? "Falta la hora." : "No reconocí la fecha ni la hora.",
    };
  }
  if (minuto > 59) return { ok: false, motivo: "Los minutos van de 00 a 59." };
  if (periodo) {
    if (hora < 1 || hora > 12) return { ok: false, motivo: "Con a. m./p. m. la hora va de 1 a 12." };
    if (periodo === "pm" && hora < 12) hora += 12;
    if (periodo === "am" && hora === 12) hora = 0;
  } else if (hora >= 1 && hora <= 6 && !conMinutos?.[1]?.startsWith("0")) {
    // "a las 3" = 3 de la tarde; "03:00" escrito con cero se respeta.
    hora += 12;
  }
  if (hora > 23) return { ok: false, motivo: "La hora va de 0 a 23." };

  if (!ymd) {
    ymd = hoy;
    if (instanteLocal(hoy, hora, minuto) <= ahora) ymd = sumarDias(hoy, 1);
  } else if (semana && instanteLocal(ymd, hora, minuto) <= ahora) {
    ymd = sumarDias(ymd, 7);
  }

  return validar(instanteLocal(ymd, hora, minuto), ahora);
}

function validar(instante: number, ahora: number): ResultadoFechaHora {
  if (Number.isNaN(instante)) return { ok: false, motivo: "No reconocí la fecha ni la hora." };
  if (instante <= ahora) return { ok: false, motivo: "Esa fecha y hora ya pasaron." };
  if (instante - ahora > MAX_ADELANTO_MS) return { ok: false, motivo: "Solo se puede programar hasta un año adelante." };
  return { ok: true, iso: new Date(instante).toISOString() };
}

/** "viernes 3 de octubre de 2026, 7:00 a. m." en hora de Guatemala. */
export function fechaHoraLarga(iso: string) {
  const fecha = new Date(iso);
  const dia = new Intl.DateTimeFormat("es-GT", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
  const hora = new Intl.DateTimeFormat("es-GT", { timeZone: ZONA, hour: "numeric", minute: "2-digit" }).format(fecha);
  return `${dia}, ${hora}`;
}
