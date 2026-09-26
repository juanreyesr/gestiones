/**
 * Lee los datos de una reserva hecha en Calendly (u otro sistema de citas)
 * a partir del evento que ese sistema dejo en Google Calendar: titulo,
 * descripcion (preguntas y respuestas del formulario) e invitados.
 *
 * Es una funcion pura (sin red ni BD) para poder probarla con datos
 * inventados. Tolera los dos formatos que produce Calendly en la
 * descripcion: "Pregunta: respuesta" en una linea, o la etiqueta en una
 * linea y el valor en la siguiente ("Nombre del evento" / "Atencion...").
 */

export type EventoReservaEntrada = {
  titulo: string;
  descripcion: string | null;
  invitados: { email: string | null; nombre: string | null; yo: boolean; organizador: boolean }[];
};

export type DatosReserva = {
  esReserva: boolean;
  tipoEvento: string | null;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  motivo: string | null;
  notas: string | null;
  consentimiento: boolean;
  /** Texto de la pregunta de consentimiento tal como la acepto la persona. */
  consentimientoTexto: string | null;
};

type Par = { clave: string; valor: string };

/** Quita el HTML basico que Google a veces guarda en la descripcion. */
function textoPlano(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function sinTildes(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function pares(descripcion: string): Par[] {
  const lineas = textoPlano(descripcion)
    .split(/\r?\n/)
    .map((l) => l.trim());
  const resultado: Par[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!linea) continue;
    // "Pregunta?: respuesta" o "Clave: valor" (se corta en el primer ": " que no sea parte de una URL).
    const corte = linea.search(/:\s/);
    if (corte > 0 && !/^https?$/i.test(linea.slice(0, corte))) {
      resultado.push({ clave: linea.slice(0, corte).trim(), valor: linea.slice(corte + 1).trim() });
      continue;
    }
    // Etiqueta sola en una linea y valor en la siguiente no vacia.
    if (/^(nombre del evento|event name|invitado|invitee|nombre del invitado|invitee name|correo|email|tel[eé]fono)$/i.test(linea)) {
      const siguiente = lineas.slice(i + 1).find((l) => l);
      if (siguiente) {
        resultado.push({ clave: linea, valor: siguiente });
        i = lineas.indexOf(siguiente, i + 1);
      }
    }
  }
  return resultado;
}

function buscar(lista: Par[], patron: RegExp, excluir?: RegExp) {
  return lista.find((p) => patron.test(sinTildes(p.clave)) && !(excluir && excluir.test(sinTildes(p.clave))))?.valor || null;
}

const TELEFONO_RE = /(\+?\(?\d[\d\s().-]{6,}\d)/;

function limpiarTelefono(valor: string | null) {
  if (!valor) return null;
  const encontrado = valor.match(TELEFONO_RE)?.[1];
  if (!encontrado) return null;
  const digitos = encontrado.replace(/\D/g, "");
  return digitos.length >= 8 ? encontrado.replace(/\s+/g, " ").trim() : null;
}

/** "Ana Lopez y Juan Reyes" / "Ana Lopez and Host" → "Ana Lopez". */
function nombreDesdeTitulo(titulo: string, nombresPropios: string[]) {
  const partes = titulo.split(/\s+(?:y|and|&|con|with)\s+/i).map((p) => p.trim()).filter(Boolean);
  if (partes.length < 2) {
    const entreParentesis = titulo.match(/\(([^)]+)\)\s*$/)?.[1];
    return entreParentesis?.trim() || null;
  }
  const propios = nombresPropios.map(sinTildes);
  const ajenas = partes.filter((p) => !propios.some((n) => n && (sinTildes(p).includes(n) || n.includes(sinTildes(p)))));
  return ajenas[0] ?? partes[0];
}

export function parsearReserva(evento: EventoReservaEntrada): DatosReserva {
  const descripcion = evento.descripcion ?? "";
  const lista = pares(descripcion);
  const plano = textoPlano(descripcion);

  const tipoEvento = buscar(lista, /^(nombre del evento|event name|evento)$/);
  const invitado = evento.invitados.find((i) => !i.yo && !i.organizador && i.email && !/calendly\.com$/i.test(i.email));
  const propios = evento.invitados.filter((i) => i.yo || i.organizador).map((i) => i.nombre ?? "");

  const nombre =
    buscar(lista, /^(invitado|invitee|nombre del invitado|invitee name|nombre completo|nombre y apellido|tu nombre|nombre)$/) ||
    invitado?.nombre?.trim() ||
    nombreDesdeTitulo(evento.titulo, propios);

  const email =
    invitado?.email?.trim().toLowerCase() ||
    buscar(lista, /correo|e-?mail/)?.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0]?.toLowerCase() ||
    null;

  const telefono =
    limpiarTelefono(buscar(lista, /tel[eé]fono|telefono|celular|whats ?app|movil|phone|numero/)) ||
    limpiarTelefono(plano.match(/\+502[\d\s-]{8,11}/)?.[0] ?? null);

  const motivo = buscar(lista, /motivo|abordar|razon|te gustaria trabajar|what would you like/);
  const notas = buscar(lista, /importante saber|antes de iniciar|algo mas|share anything|anything else/);
  const clavesConsentimiento = lista.find((p) => /acepto|consentimiento|consent/.test(sinTildes(p.clave)));
  const consentimiento = Boolean(clavesConsentimiento && /^(si|yes|acepto|true)\b/.test(sinTildes(clavesConsentimiento.valor)));

  const esReserva =
    /calendly/i.test(descripcion) ||
    Boolean(tipoEvento) ||
    Boolean(telefono && (motivo || clavesConsentimiento));

  return {
    esReserva,
    tipoEvento,
    nombre: nombre?.slice(0, 160) || null,
    telefono,
    email,
    motivo: motivo?.slice(0, 1000) || null,
    notas: notas?.slice(0, 2000) || null,
    consentimiento,
    consentimientoTexto: consentimiento ? clavesConsentimiento!.clave.slice(0, 2000) : null,
  };
}
