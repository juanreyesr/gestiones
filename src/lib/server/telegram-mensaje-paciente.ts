import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarNombre } from "@/lib/clinica/coincidencias";
import { enlaceMensajePaciente } from "@/lib/clinica/mensaje-paciente";
import { urlMensajePaciente } from "./enlace-paciente";
import { enviarMensaje, esc } from "./telegram";

// "enviar mensaje a Ana", "mándale un mensaje a Pedro López", "escríbele a
// Luisa": busca al paciente y manda un boton que abre WhatsApp con
// "Buenos días/tardes/noches, (nombre), te escribo para ". Si hay varios
// (o ninguno exacto), sugiere los nombres parecidos para elegir.

type Paciente = { id: string; nombre: string; telefono: string | null; pais: string | null; estado: string | null };

const sinTildes = (texto: string) => texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Nombre buscado ("" si no lo trae) o null si el mensaje no es un pedido de mensaje a un paciente. */
export function pedidoMensajePaciente(texto: string): string | null {
  const limpio = texto.replace(/[¿?¡!.,]/g, " ").replace(/\s+/g, " ").trim();
  const inicio = sinTildes(limpio).match(
    /^(?:por favor\s+)?(?:(?:enviar|envia|mandar|manda)(?:le|me)?\s+(?:un\s+)?(?:mensaje|msj|whatsapp|wasap)|(?:escribir|escribe)(?:le|me)?(?:\s+(?:un\s+)?(?:mensaje|msj|whatsapp|wasap))?|mensaje)\s+(?:a|al|para)\b/,
  );
  if (!inicio) return null;
  return limpio
    .slice(inicio[0].length)
    .replace(/\s+por\s+(?:whatsapp|wasap|whats)\b.*$/i, "")
    .replace(/^(?:\s*\b(?:la|el|mi|paciente)\b)+/i, "")
    .trim();
}

/** Distancia de edicion corta (para "Victora" → "Victoria"). */
function distancia(a: string, b: string) {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const actual = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = actual;
    }
  }
  return fila[b.length];
}

/** Cuantas palabras buscadas se parecen a alguna palabra del nombre. */
function parecido(palabras: string[], nombre: string) {
  const delNombre = nombre.split(" ");
  return palabras.filter((p) =>
    delNombre.some((n) => n.startsWith(p) || (p.length >= 4 && n.length >= 4 && distancia(p, n) <= (p.length >= 7 ? 2 : 1))),
  ).length;
}

const etiqueta = (p: Paciente) => `${p.nombre}${p.estado && p.estado !== "activo" ? ` (${p.estado})` : ""}`.slice(0, 60);

export async function buscarPacienteParaMensaje(admin: SupabaseClient, chatId: number, busqueda: string) {
  const termino = normalizarNombre(busqueda);
  if (!termino) {
    await enviarMensaje(chatId, "¿A qué paciente? Escribe por ejemplo: <i>enviar mensaje a Ana López</i>");
    return;
  }

  const { data } = await admin.from("gestionesjj_pacientes").select("id,nombre,telefono,pais,estado").limit(5000);
  const pacientes = (data ?? []) as Paciente[];
  const palabras = termino.split(" ");
  const activosPrimero = (a: Paciente, b: Paciente) =>
    Number(b.estado === "activo") - Number(a.estado === "activo") || a.nombre.localeCompare(b.nombre);

  const exactos = pacientes
    .filter((p) => {
      const nombre = normalizarNombre(p.nombre);
      return palabras.every((palabra) => nombre.includes(palabra));
    })
    .sort(activosPrimero);

  if (exactos.length === 1) {
    await enviarTarjetaMensaje(admin, chatId, exactos[0].id);
    return;
  }

  const opciones = exactos.length
    ? exactos
    : pacientes
        .map((p) => ({ p, puntos: parecido(palabras, normalizarNombre(p.nombre)) }))
        .filter((x) => x.puntos > 0)
        .sort((a, b) => b.puntos - a.puntos || activosPrimero(a.p, b.p))
        .map((x) => x.p);

  if (!opciones.length) {
    await enviarMensaje(chatId, `No encontré pacientes parecidos a «${esc(busqueda)}». Prueba con otra parte del nombre.`);
    return;
  }
  await enviarMensaje(
    chatId,
    exactos.length
      ? `Encontré ${exactos.length} pacientes. ¿A quién le escribo?`
      : `No encontré «${esc(busqueda)}» exacto. ¿Te refieres a alguno de estos?`,
    { botones: opciones.slice(0, 8).map((p) => [{ text: etiqueta(p), callback_data: `pm:ok:${p.id}` }]) },
  );
}

/** Tarjeta con el boton de WhatsApp (el saludo se calcula al tocarlo). */
export async function enviarTarjetaMensaje(admin: SupabaseClient, chatId: number, pacienteId: string) {
  const { data } = await admin.from("gestionesjj_pacientes").select("id,nombre,telefono,pais,estado").eq("id", pacienteId).maybeSingle();
  const paciente = data as Paciente | null;
  if (!paciente) {
    await enviarMensaje(chatId, "Ese paciente ya no existe.");
    return;
  }
  if (!paciente.telefono) {
    await enviarMensaje(chatId, `<b>${esc(paciente.nombre)}</b> no tiene teléfono registrado.`);
    return;
  }
  await enviarMensaje(
    chatId,
    `💬 <b>${esc(paciente.nombre)}</b>\n📞 ${esc(paciente.telefono)}\n\n<i>Se abre con «Buenos días/tardes/noches, ${esc(
      paciente.nombre.trim().split(/\s+/)[0] ?? "",
    )}, te escribo para…»; lo demás lo escribes tú.</i>`,
    { botones: [[{ text: "📲 Escribirle por WhatsApp", url: urlMensajePaciente(paciente.id) ?? enlaceMensajePaciente(paciente) }]] },
  );
}
