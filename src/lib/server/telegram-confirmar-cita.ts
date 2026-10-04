import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarNombre } from "@/lib/clinica/coincidencias";
import { tokenCita, urlConfirmarPorWhatsApp, urlPaginaCita } from "./cita-publica";
import { enviarMensaje, esc, fechaHora } from "./telegram";

// /confirmar <nombre>: manda la tarjeta de la cita con el boton "Confirmarle
// la cita por WhatsApp" (y el enlace a su pagina de calendario). Sirve para
// citas agendadas desde la app o para volver a enviar una confirmacion.

type RawCita = {
  id: string;
  inicio: string;
  estado: string;
  modalidad: string | null;
  contacto_nombre: string | null;
  gestionesjj_pacientes: { nombre: string } | null;
};

const nombreDe = (c: RawCita) => c.gestionesjj_pacientes?.nombre ?? c.contacto_nombre ?? "Sin nombre";

/** Tarjeta de una cita con los botones de confirmacion. */
export async function enviarConfirmacionCita(admin: SupabaseClient, chatId: number, citaId: string) {
  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,estado,modalidad,contacto_nombre,gestionesjj_pacientes(nombre)")
    .eq("id", citaId)
    .maybeSingle();
  const cita = data as unknown as RawCita | null;
  const token = cita ? tokenCita(cita.id) : null;
  if (!cita || !token) {
    await enviarMensaje(chatId, cita ? "Falta configurar CRON_SECRET en el servidor." : "No encontré esa cita.");
    return;
  }
  const texto = [
    `✅ Cita de <b>${esc(nombreDe(cita))}</b>`,
    `📅 ${esc(fechaHora(cita.inicio))}`,
    cita.modalidad === "virtual" ? "💻 Virtual" : cita.modalidad === "presencial" ? "🏢 Presencial" : null,
    cita.estado === "cancelada" ? "⚠️ Esta cita está cancelada." : null,
  ]
    .filter(Boolean)
    .join("\n");
  await enviarMensaje(chatId, texto, {
    botones: [
      [{ text: "📲 Confirmarle la cita por WhatsApp", url: urlConfirmarPorWhatsApp(token) }],
      [{ text: "📅 Ver la página de la cita", url: urlPaginaCita(token) }],
    ],
  });
}

/** /confirmar <nombre>: proximas citas del paciente (o la mas reciente si no tiene proximas). */
export async function buscarCitaParaConfirmar(admin: SupabaseClient, chatId: number, busqueda: string) {
  const termino = normalizarNombre(busqueda);
  if (!termino) {
    await enviarMensaje(chatId, "¿De qué paciente? Escríbelo después del comando, por ejemplo:\n/confirmar Victoria");
    return;
  }

  const desde = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const { data } = await admin
    .from("gestionesjj_citas")
    .select("id,inicio,estado,modalidad,contacto_nombre,gestionesjj_pacientes(nombre)")
    .gte("inicio", desde)
    .neq("estado", "cancelada")
    .order("inicio", { ascending: true })
    .limit(2000);

  const palabras = termino.split(" ");
  const coinciden = ((data ?? []) as unknown as RawCita[]).filter((c) => {
    const nombre = normalizarNombre(nombreDe(c));
    return palabras.every((palabra) => nombre.includes(palabra));
  });
  const ahora = Date.now();
  const proximas = coinciden.filter((c) => Date.parse(c.inicio) >= ahora - 2 * 3_600_000);
  const candidatas = proximas.length ? proximas : coinciden.slice(-1);

  if (!candidatas.length) {
    await enviarMensaje(chatId, `No encontré citas de «${esc(busqueda)}» en los últimos 6 meses.`);
    return;
  }
  if (candidatas.length === 1) {
    await enviarConfirmacionCita(admin, chatId, candidatas[0].id);
    return;
  }
  await enviarMensaje(chatId, `Encontré ${candidatas.length} citas próximas. ¿Cuál quieres confirmar?`, {
    botones: candidatas.slice(0, 8).map((c) => [
      { text: `${nombreDe(c).split(" ")[0]} · ${fechaHora(c.inicio)}`.slice(0, 60), callback_data: `cc:ok:${c.id}` },
    ]),
  });
}
