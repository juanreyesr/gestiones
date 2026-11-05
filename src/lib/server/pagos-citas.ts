import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarCoincidencia } from "@/lib/clinica/coincidencias";
import { totalPorMoneda } from "@/lib/clinica/dinero";
import type { AvisoPago } from "./paypal";
import { pacientesComparables } from "./reservas-google";
import { type BotonInline, esc, fechaHora, fechaLocal, inicioDiaIso } from "./telegram";

/**
 * Control de pagos de citas desde el servidor: el webhook de PayPal marca
 * como pagada la cita del paciente y el bot de Telegram lista y marca los
 * pendientes de pago.
 *
 * Una cita "pendiente de pago" es una cita completada (atendida) con
 * pagada = false.
 */

type RawCitaPago = {
  id: string;
  inicio: string;
  estado: string;
  paciente_id: string | null;
  contacto_nombre: string | null;
  monto: number | string | null;
  moneda: "GTQ" | "USD" | null;
  gestionesjj_pacientes: { nombre: string } | null;
};

const COLUMNAS = "id,inicio,estado,paciente_id,contacto_nombre,monto,moneda,gestionesjj_pacientes(nombre)";

/** Montos de las citas para sumar (null = cita sin monto). */
function montos(citas: RawCitaPago[]) {
  return citas.map((cita) => ({ monto: cita.monto === null ? null : Number(cita.monto), moneda: cita.moneda }));
}

function nombreDe(cita: RawCitaPago) {
  return cita.gestionesjj_pacientes?.nombre ?? cita.contacto_nombre ?? "Paciente";
}

/** "Deshacer" de un pago aplicado automaticamente (por si el pagador no era quien se creyo). */
export function botonDeshacerPago(citaId: string): BotonInline {
  return { text: "↩️ No era esta cita (desmarcar)", callback_data: `pag:no:${citaId}` };
}

export type ResultadoPago = {
  linea: string;
  botones: BotonInline[][];
  /** Solo cuando el pago se acaba de aplicar a una cita (no en reintentos ni reembolsos). */
  aplicado?: { pacienteId: string; citaInicio: string };
};

/**
 * Aplica un evento de PayPal a las citas:
 *  - Pago completado: identifica al paciente (correo, luego nombre identico)
 *    y marca como pagada su cita atendida sin pagar mas antigua; si no debe
 *    nada, la cita activa mas proxima (pago por adelantado).
 *  - Reembolso: la cita pagada con esa captura vuelve a quedar sin pagar.
 * Devuelve la linea que se agrega al aviso de Telegram.
 */
export async function aplicarPagoPayPal(admin: SupabaseClient, aviso: AvisoPago): Promise<ResultadoPago | null> {
  if (aviso.tipo === "reembolsado") {
    if (!aviso.capturaOriginalId) return null;
    const { data } = await admin
      .from("gestionesjj_citas")
      .update({ pagada: false, pagada_at: null, pago_referencia: null, monto_pagado: null })
      .eq("pago_referencia", aviso.capturaOriginalId)
      .select(COLUMNAS);
    const citas = (data ?? []) as unknown as RawCitaPago[];
    if (citas.length === 0) return null;
    return {
      linea: citas
        .map((cita) => `↩️ La cita de ${esc(nombreDe(cita))} (${esc(fechaHora(cita.inicio))}) volvió a quedar <b>sin pagar</b>.`)
        .join("\n"),
      botones: [],
    };
  }

  // Reintento del mismo webhook: no aplicar dos veces.
  if (aviso.captureId) {
    const { data: previa } = await admin
      .from("gestionesjj_citas")
      .select(COLUMNAS)
      .eq("pago_referencia", aviso.captureId)
      .limit(1)
      .maybeSingle();
    if (previa) {
      const cita = previa as unknown as RawCitaPago;
      return { linea: `✅ Ya estaba aplicado a la cita de ${esc(nombreDe(cita))} (${esc(fechaHora(cita.inicio))}).`, botones: [] };
    }
  }

  const coincidencia = buscarCoincidencia(await pacientesComparables(admin), {
    nombre: aviso.pagador,
    email: aviso.correo,
  });
  if (!coincidencia) {
    return {
      linea: "⚠️ No identifiqué al paciente por su correo ni su nombre: márcala como pagada en la Clínica.",
      botones: [],
    };
  }
  const paciente = coincidencia.paciente;

  const { data: sinPagar } = await admin
    .from("gestionesjj_citas")
    .select(COLUMNAS)
    .eq("paciente_id", paciente.id)
    .eq("estado", "completada")
    .eq("pagada", false)
    .order("inicio")
    .limit(1)
    .maybeSingle();

  let cita = sinPagar as unknown as RawCitaPago | null;
  let adelantado = false;
  if (!cita) {
    const { data: proxima } = await admin
      .from("gestionesjj_citas")
      .select(COLUMNAS)
      .eq("paciente_id", paciente.id)
      .in("estado", ["pendiente", "confirmada"])
      .eq("pagada", false)
      .gte("inicio", inicioDiaIso(fechaLocal()))
      .order("inicio")
      .limit(1)
      .maybeSingle();
    cita = proxima as unknown as RawCitaPago | null;
    adelantado = Boolean(cita);
  }

  if (!cita) {
    return {
      linea: `ℹ️ ${esc(paciente.nombre)} (identificado por ${coincidencia.por}) no tiene citas por pagar: el pago no se aplicó a ninguna cita.`,
      botones: [],
    };
  }

  const { error } = await admin
    .from("gestionesjj_citas")
    .update({ pagada: true, pagada_at: new Date().toISOString(), pago_referencia: aviso.captureId })
    .eq("id", cita.id);
  if (error) {
    return { linea: `⚠️ No pude marcar la cita como pagada: ${esc(error.message)}`, botones: [] };
  }

  // Monto real recibido: si difiere de lo que tocaba, la diferencia queda como
  // abono a favor o pendiente para la siguiente sesión.
  const saldoLinea = await registrarMontoRecibido(admin, cita.id, aviso);

  return {
    linea: `✅ Marcada como pagada: cita de <b>${esc(paciente.nombre)}</b> del ${esc(fechaHora(cita.inicio))}${
      adelantado ? " (pago por adelantado)" : ""
    } — identificado por ${coincidencia.por}.${saldoLinea ? `\n${saldoLinea}` : ""}`,
    botones: [[botonDeshacerPago(cita.id)]],
    aplicado: { pacienteId: paciente.id, citaInicio: cita.inicio },
  };
}

/** Citas atendidas sin pagar, de la mas antigua a la mas reciente. */
export async function citasSinPagar(admin: SupabaseClient, limite = 40) {
  const { data } = await admin
    .from("gestionesjj_citas")
    .select(COLUMNAS)
    .eq("estado", "completada")
    .eq("pagada", false)
    .order("inicio")
    .limit(limite);
  return (data ?? []) as unknown as RawCitaPago[];
}

/** Citas que ya terminaron y siguen pendientes/confirmadas (falta marcar si se atendieron). */
export async function contarCitasSinCerrar(admin: SupabaseClient) {
  const { count } = await admin
    .from("gestionesjj_citas")
    .select("id", { count: "exact", head: true })
    .in("estado", ["pendiente", "confirmada"])
    .lt("fin", new Date().toISOString());
  return count ?? 0;
}

const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-GT", { timeZone: "America/Guatemala", day: "numeric", month: "short" }).format(new Date(iso));

/** Lineas y botones "✅ Pagada" de los pendientes de pago, agrupados por paciente. */
export function bloquePendientesPago(citas: RawCitaPago[], maxBotones = 6) {
  const grupos = new Map<string, { nombre: string; citas: RawCitaPago[] }>();
  for (const cita of citas) {
    const clave = cita.paciente_id ?? `c:${cita.contacto_nombre ?? cita.id}`;
    const grupo = grupos.get(clave) ?? { nombre: nombreDe(cita), citas: [] };
    grupo.citas.push(cita);
    grupos.set(clave, grupo);
  }
  const lineas = Array.from(grupos.values()).map((grupo) => {
    const conMonto = grupo.citas.some((cita) => cita.monto !== null);
    return `• ${esc(grupo.nombre)} — ${grupo.citas.length} cita(s)${conMonto ? `, debe <b>${esc(totalPorMoneda(montos(grupo.citas)))}</b>` : ""}: ${grupo.citas
      .map((cita) => esc(fechaCorta(cita.inicio)))
      .join(", ")}`;
  });
  const botones = citas.slice(0, maxBotones).map((cita) => [
    { text: `✅ Pagada: ${nombreDe(cita).split(" ")[0]} (${fechaCorta(cita.inicio)})`, callback_data: `pag:ok:${cita.id}` },
  ]);
  return { pacientes: grupos.size, lineas, botones, total: totalPorMoneda(montos(citas)) };
}

/**
 * Registra en la cita el monto bruto que pagó el paciente por PayPal (misma
 * función que "Otro monto" en la Clínica). Solo si la moneda del pago es la de
 * la cita; si no, queda como pago exacto y se avisa. Devuelve una línea para
 * Telegram cuando hay abono, pendiente o moneda distinta.
 */
async function registrarMontoRecibido(admin: SupabaseClient, citaId: string, aviso: AvisoPago) {
  if (aviso.montoValor === null || aviso.montoValor === undefined) return "";
  const { data: fila } = await admin.from("gestionesjj_citas").select("monto,moneda").eq("id", citaId).maybeSingle();
  const cita = fila as { monto: number | string | null; moneda: "GTQ" | "USD" | null } | null;
  if (!cita || cita.monto === null) return "";
  const monedaCita = cita.moneda ?? "GTQ";
  if ((aviso.montoMoneda ?? "").toUpperCase() !== monedaCita) {
    return `ℹ️ Pagó en ${esc(aviso.montoMoneda ?? "otra moneda")} y la cita está en ${monedaCita}: se registró como pago completo (ajústalo en la Clínica con «Corregir monto recibido» si hace falta).`;
  }
  const { data, error } = await admin.rpc("gestionesjj_registrar_pago", {
    p_cita_id: citaId,
    p_pagada: true,
    p_monto_recibido: aviso.montoValor,
  });
  const r = (Array.isArray(data) ? data[0] : data) as { saldo_nuevo: number | string | null } | null;
  if (error || !r) return "";
  const saldo = Number(r.saldo_nuevo ?? 0);
  if (saldo > 0) return `💰 Quedan <b>${esc(totalPorMoneda([{ monto: saldo, moneda: monedaCita }]))}</b> a favor para la siguiente sesión.`;
  if (saldo < 0) return `⚠️ Quedan <b>${esc(totalPorMoneda([{ monto: -saldo, moneda: monedaCita }]))}</b> pendientes para la siguiente sesión.`;
  return "";
}

/** Marca (o desmarca) una cita como pagada desde un boton de Telegram. */
export async function marcarPagadaDesdeTelegram(admin: SupabaseClient, citaId: string, pagada: boolean) {
  // Igual que la casilla "Pagada" de la Clínica: pagó lo que le tocaba (incluido
  // el saldo de sesiones anteriores); al desmarcar se borra lo registrado.
  const { error: rpcError } = await admin.rpc("gestionesjj_registrar_pago", {
    p_cita_id: citaId,
    p_pagada: pagada,
    p_monto_recibido: null,
  });
  if (rpcError) return null;
  const { data, error } = pagada
    ? await admin.from("gestionesjj_citas").select(COLUMNAS).eq("id", citaId).maybeSingle()
    : await admin
        .from("gestionesjj_citas")
        .update({ pago_referencia: null })
        .eq("id", citaId)
        .select(COLUMNAS)
        .maybeSingle();
  if (error || !data) return null;
  const cita = data as unknown as RawCitaPago;
  return `${nombreDe(cita)} (${fechaHora(cita.inicio)})`;
}
