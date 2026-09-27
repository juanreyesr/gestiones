import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarioComoTexto } from "@/lib/iglesia/predicas-texto";
import {
  type AsignacionPredicaRow,
  CIERRE_SIN_ASIGNAR,
  HORARIO_LABEL,
  HORARIOS_DOMINGO,
  type HorarioPredica,
  type MesPredicasRow,
  type PersonaRow,
} from "@/lib/iglesia/types";
import { type BotonInline, appUrl, comparaSeguro, enviarMensaje, esc, fechaLocal } from "./telegram";

/**
 * Predicas del mes (area Iglesia) desde Telegram:
 *  - "quiero las predicas de octubre" / /predicas octubre: el mismo texto que
 *    arma el boton "Texto para enviar" del panel, con boton para mandarlo por
 *    WhatsApp y aviso si el mes no existe o esta incompleto.
 *  - "quien predica hoy / el domingo / este fin de semana / el martes":
 *    predicador y cierre de cada celebracion de ese dia.
 */

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function base() {
  return appUrl() ?? "https://www.juanjreyes.org";
}

// ============================================================
// Fechas (siempre en Guatemala, sin horario de verano)
// ============================================================

function sumarDias(ymd: string, dias: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(
    new Date(Date.parse(`${ymd}T12:00:00-06:00`) + dias * 86_400_000),
  );
}

function diaSemana(ymd: string) {
  return new Date(`${ymd}T12:00:00-06:00`).getUTCDay();
}

function proximo(ymdDesde: string, dow: number) {
  return sumarDias(ymdDesde, (dow - diaSemana(ymdDesde) + 7) % 7);
}

function fechaLarga(ymd: string) {
  const [anio, mes, dia] = ymd.split("-").map(Number);
  return `${DIAS[diaSemana(ymd)]} ${dia} de ${MESES[mes - 1]}${anio !== Number(fechaLocal().slice(0, 4)) ? ` de ${anio}` : ""}`;
}

// ============================================================
// Datos
// ============================================================

type DatosMes = {
  mes: MesPredicasRow;
  asignaciones: AsignacionPredicaRow[];
  predicadores: PersonaRow[];
  cierres: PersonaRow[];
};

async function cargarMes(admin: SupabaseClient, anio: number, mes: number): Promise<DatosMes | null> {
  const { data: fila } = await admin
    .from("gestionesjj_iglesia_predicas_meses")
    .select("*")
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();
  if (!fila) return null;

  const [{ data: asignaciones }, { data: predicadores }, { data: cierres }] = await Promise.all([
    admin.from("gestionesjj_iglesia_predicas_asignaciones").select("*").eq("mes_id", fila.id),
    admin.from("gestionesjj_iglesia_predicadores").select("*"),
    admin.from("gestionesjj_iglesia_cierres_personas").select("*"),
  ]);
  return {
    mes: fila as MesPredicasRow,
    asignaciones: (asignaciones ?? []) as AsignacionPredicaRow[],
    predicadores: (predicadores ?? []) as PersonaRow[],
    cierres: (cierres ?? []) as PersonaRow[],
  };
}

function nombres(datos: DatosMes) {
  const predicador = new Map(datos.predicadores.map((p) => [p.id, p.nombre]));
  const cierre = new Map(datos.cierres.map((p) => [p.id, p.nombre]));
  return {
    predica: (a: AsignacionPredicaRow) =>
      a.predicador_texto?.trim() || (a.predicador_id ? predicador.get(a.predicador_id) ?? null : null),
    cierra: (a: AsignacionPredicaRow) =>
      a.cierre_texto?.trim() || (a.cierre_persona_id ? cierre.get(a.cierre_persona_id) ?? null : null),
  };
}

/** Celebraciones que deberia tener el mes: 3 por domingo y 1 por martes. */
function celebracionesEsperadas(anio: number, mes: number) {
  const esperadas: { fecha: string; horario: HorarioPredica }[] = [];
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  for (let dia = 1; dia <= dias; dia++) {
    const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const dow = diaSemana(fecha);
    if (dow === 0) HORARIOS_DOMINGO.forEach((horario) => esperadas.push({ fecha, horario }));
    if (dow === 2) esperadas.push({ fecha, horario: "19:00" });
  }
  return esperadas;
}

/** Lo que falta para que el mes este completo (vacio si esta completo). */
function faltantes(datos: DatosMes) {
  const { predica, cierra } = nombres(datos);
  const porClave = new Map(datos.asignaciones.map((a) => [`${a.fecha}|${a.horario}`, a]));
  const lista: string[] = [];
  for (const { fecha, horario } of celebracionesEsperadas(datos.mes.anio, datos.mes.mes)) {
    const asignacion = porClave.get(`${fecha}|${horario}`);
    const etiqueta = `${DIAS[diaSemana(fecha)]} ${Number(fecha.slice(8))} (${HORARIO_LABEL[horario]})`;
    if (!asignacion || !predica(asignacion)) lista.push(`${etiqueta}: falta quién predica`);
    // El cierre del martes siempre se designa; el del domingo casi nunca.
    else if (horario === "19:00" && !cierra(asignacion)) lista.push(`${etiqueta}: falta quién cierra`);
  }
  if (!datos.mes.tema?.trim()) lista.push("falta el tema del mes");
  return lista;
}

// ============================================================
// Enlace firmado para WhatsApp
// ============================================================

/**
 * El texto del mes es largo para meterlo entero en el boton de Telegram, asi
 * que el boton apunta a /api/iglesia/predicas-whatsapp, que arma el texto y
 * redirige a WhatsApp. El enlace va firmado (HMAC) para que nadie pueda
 * pedir calendarios cambiando la URL.
 */
export function firmaPredicas(periodo: string) {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  return createHmac("sha256", secreto).update(`predicas:${periodo}`).digest("hex").slice(0, 32);
}

export function firmaValida(periodo: string, firma: string) {
  return Boolean(process.env.TELEGRAM_WEBHOOK_SECRET) && comparaSeguro(firmaPredicas(periodo), firma);
}

export async function textoPredicasMes(admin: SupabaseClient, anio: number, mes: number) {
  const datos = await cargarMes(admin, anio, mes);
  return datos ? calendarioComoTexto(datos) : null;
}

// ============================================================
// "quiero las predicas de octubre"
// ============================================================

/** Mes pedido: nombre del mes (con año opcional), "este mes", "proximo mes"; por defecto el actual. */
export function mesPedido(texto: string) {
  const t = normalizar(texto);
  const hoy = fechaLocal();
  const anioActual = Number(hoy.slice(0, 4));
  const mesActual = Number(hoy.slice(5, 7));

  if (/(proximo|siguiente|otro) mes|mes (que viene|entrante)/.test(t)) {
    return mesActual === 12 ? { anio: anioActual + 1, mes: 1 } : { anio: anioActual, mes: mesActual + 1 };
  }
  if (/mes (pasado|anterior)/.test(t)) {
    return mesActual === 1 ? { anio: anioActual - 1, mes: 12 } : { anio: anioActual, mes: mesActual - 1 };
  }
  const indice = MESES.findIndex((nombre) => new RegExp(`\\b${nombre}\\b`).test(t) || (nombre === "septiembre" && /\bsetiembre\b/.test(t)));
  if (indice >= 0) {
    const anioEscrito = t.match(/\b(20\d{2})\b/);
    let anio = anioEscrito ? Number(anioEscrito[1]) : anioActual;
    // Sin año: un mes que quedo muy atras se entiende del año que viene (en noviembre, "enero" es el proximo).
    if (!anioEscrito && indice + 1 < mesActual - 3) anio += 1;
    return { anio, mes: indice + 1 };
  }
  return { anio: anioActual, mes: mesActual };
}

export async function enviarPredicasMes(admin: SupabaseClient, chatId: number, texto: string) {
  const { anio, mes } = mesPedido(texto);
  const titulo = `${MESES_ES[mes - 1]} ${anio}`;
  const datos = await cargarMes(admin, anio, mes);

  if (!datos) {
    await enviarMensaje(
      chatId,
      `📖 El calendario de prédicas de <b>${titulo}</b> todavía no está armado.\nCréalo en Iglesia → Prédicas del mes.`,
    );
    return;
  }

  const pendientes = faltantes(datos);
  const calendario = calendarioComoTexto(datos);
  const periodo = `${anio}-${String(mes).padStart(2, "0")}`;
  const botones: BotonInline[][] = [
    [
      {
        text: "📲 Enviar por WhatsApp",
        url: `${base()}/api/iglesia/predicas-whatsapp?mes=${periodo}&firma=${firmaPredicas(periodo)}`,
      },
    ],
  ];

  const aviso = pendientes.length
    ? [
        `⚠️ <b>El calendario no está completo</b> (${pendientes.length}):`,
        ...pendientes.slice(0, 12).map((p) => `• ${esc(p)}`),
        pendientes.length > 12 ? `• …y ${pendientes.length - 12} más` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "✅ Calendario completo.";

  await enviarMensaje(
    chatId,
    [`📖 <b>Prédicas de ${titulo}</b>`, aviso, "", `<pre>${esc(calendario)}</pre>`, "<i>Mantén presionado el texto para copiarlo, o envíalo con el botón.</i>"].join("\n"),
    { botones },
  );
}

// ============================================================
// "quien predica hoy / el domingo / este fin de semana / el martes"
// ============================================================

/** Dias por los que se pregunta. Sin nada reconocible: la proxima celebracion (hoy si hay). */
export function diasPedidos(texto: string): { dias: string[]; titulo: string } {
  const t = normalizar(texto);
  const hoy = fechaLocal();

  const fecha = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (fecha) {
    const [, d, m, a] = fecha;
    const anio = a ? Number(a.length === 2 ? `20${a}` : a) : Number(hoy.slice(0, 4));
    const ymd = `${anio}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return { dias: [ymd], titulo: `el ${fechaLarga(ymd)}` };
  }
  if (/pasado manana/.test(t)) return { dias: [sumarDias(hoy, 2)], titulo: "pasado mañana" };
  if (/\bhoy\b/.test(t)) return { dias: [hoy], titulo: "hoy" };
  if (/\bmanana\b/.test(t)) return { dias: [sumarDias(hoy, 1)], titulo: "mañana" };
  if (/fin de semana/.test(t)) {
    const domingo = proximo(hoy, 0);
    return { dias: [domingo], titulo: `este fin de semana (${fechaLarga(domingo)})` };
  }
  if (/semana/.test(t)) {
    const domingo = proximo(hoy, 0);
    const martes = proximo(hoy, 2);
    return { dias: [martes, domingo].sort(), titulo: "esta semana" };
  }
  const proximoTambien = /(proximo|siguiente|otro)/.test(t);
  if (/\bdomingo\b/.test(t)) {
    const domingo = proximo(proximoTambien && diaSemana(hoy) === 0 ? sumarDias(hoy, 1) : hoy, 0);
    return { dias: [domingo], titulo: `el ${fechaLarga(domingo)}` };
  }
  if (/\bmartes\b/.test(t)) {
    const martes = proximo(proximoTambien && diaSemana(hoy) === 2 ? sumarDias(hoy, 1) : hoy, 2);
    return { dias: [martes], titulo: `el ${fechaLarga(martes)}` };
  }
  // La proxima celebracion: hoy si es domingo o martes; si no, la que venga primero.
  const siguiente = [proximo(hoy, 0), proximo(hoy, 2)].sort()[0];
  return { dias: [siguiente], titulo: siguiente === hoy ? "hoy" : `el ${fechaLarga(siguiente)}` };
}

export async function lineasPredicanDia(admin: SupabaseClient, ymd: string) {
  const dow = diaSemana(ymd);
  if (dow !== 0 && dow !== 2) return { lineas: [] as string[], estado: "sin_celebracion" as const };

  const datos = await cargarMes(admin, Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)));
  if (!datos) return { lineas: [] as string[], estado: "sin_mes" as const };

  const { predica, cierra } = nombres(datos);
  const horarios: HorarioPredica[] = dow === 0 ? HORARIOS_DOMINGO : ["19:00"];
  const lineas = horarios.map((horario) => {
    const asignacion = datos.asignaciones.find((a) => a.fecha === ymd && a.horario === horario);
    const quien = asignacion ? predica(asignacion) : null;
    const cierre = asignacion ? cierra(asignacion) : null;
    return `• <b>${HORARIO_LABEL[horario]}</b> — ${quien ? esc(quien) : "⚠️ <i>por definir</i>"} · cierra: ${
      cierre ? esc(cierre) : horario === "19:00" ? "⚠️ <i>por definir</i>" : CIERRE_SIN_ASIGNAR
    }`;
  });
  const incompleto = lineas.some((l) => l.includes("por definir"));
  return { lineas, estado: incompleto ? ("incompleto" as const) : ("ok" as const) };
}

export async function enviarQuienPredica(admin: SupabaseClient, chatId: number, texto: string) {
  const { dias, titulo } = diasPedidos(texto);
  const bloques: string[] = [`⛪ <b>¿Quién predica ${esc(titulo)}?</b>`];

  for (const ymd of dias) {
    const { lineas, estado } = await lineasPredicanDia(admin, ymd);
    const encabezado = dias.length > 1 ? `\n<b>${esc(fechaLarga(ymd).replace(/^./, (c) => c.toUpperCase()))}</b>` : "";
    if (estado === "sin_celebracion") {
      const siguiente = [proximo(ymd, 0), proximo(ymd, 2)].sort()[0];
      bloques.push(`${encabezado}\nEse día (${esc(fechaLarga(ymd))}) no hay celebración. La próxima es el ${esc(fechaLarga(siguiente))}: pregúntame "quién predica el ${DIAS[diaSemana(siguiente)]}".`);
      continue;
    }
    if (estado === "sin_mes") {
      bloques.push(
        `${encabezado}\n⚠️ El calendario de prédicas de ${MESES[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)} todavía no está armado.`,
      );
      continue;
    }
    bloques.push(`${encabezado}\n${lineas.join("\n")}`);
    if (estado === "incompleto") bloques.push("⚠️ Hay celebraciones sin asignar en el calendario.");
  }

  await enviarMensaje(chatId, bloques.join("\n"));
}

// ============================================================
// Deteccion en mensajes escritos
// ============================================================

/** "quien predica ..." → dia; "predicas de octubre" → mes; null si no es sobre predicas. */
export function pedidoDePredicas(texto: string): "dia" | "mes" | null {
  const t = normalizar(texto);
  if (!/predic|quien(es)? cierra/.test(t)) return null;
  if (/\bquien(es)?\b|\bhoy\b|\bmanana\b|\bdomingo\b|\bmartes\b|fin de semana|\bsemana\b|\d{1,2}[/-]\d{1,2}/.test(t)) return "dia";
  return "mes";
}
