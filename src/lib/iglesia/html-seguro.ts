// Limpieza del HTML que produce el editor de protocolos.
//
// El contenido lo escribe el mismo duenio de la app, pero igual se filtra: se
// guarda y se muestra solo lo que el editor puede generar (formato de texto,
// listas y enlaces). Todo lo demas — scripts, iframes, manejadores onclick,
// estilos raros — se descarta. La limpieza corre al guardar y tambien al
// mostrar, para que un contenido viejo o pegado desde Word tampoco cuele nada.

const ETIQUETAS = new Set([
  "P", "DIV", "BR", "SPAN",
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE",
  "UL", "OL", "LI",
  "H1", "H2", "H3", "H4",
  "BLOCKQUOTE", "A",
]);

// Solo estas propiedades sobreviven del atributo style.
const ESTILOS = new Set(["color", "font-size", "font-weight", "font-style", "text-decoration", "text-align"]);

/**
 * document.execCommand("fontSize") produce <font size="1..7">. Se traduce a
 * em para que el zoom de la pantalla completa escale todo el documento: si el
 * tamano quedara en px, agrandar la letra no haria nada.
 */
const TAMANOS: Record<string, string> = {
  "1": "0.75em",
  "2": "0.875em",
  "3": "1em",
  "4": "1.125em",
  "5": "1.5em",
  "6": "2em",
  "7": "3em",
};

function limpiarEstilo(valor: string) {
  return valor
    .split(";")
    .map((parte) => parte.trim())
    .filter(Boolean)
    .filter((parte) => {
      const propiedad = parte.split(":")[0]?.trim().toLowerCase();
      if (!propiedad || !ESTILOS.has(propiedad)) return false;
      // Nada de url(...) ni expresiones: solo valores simples.
      return !/url\s*\(|expression|javascript:/i.test(parte);
    })
    .join("; ");
}

function limpiarNodo(nodo: Element, documento: Document) {
  for (const hijo of [...nodo.children]) limpiarNodo(hijo, documento);

  // <font size> viene del editor; se convierte a un span con tamano en em.
  if (nodo.tagName === "FONT") {
    const reemplazo = documento.createElement("span");
    const tamano = TAMANOS[nodo.getAttribute("size") ?? ""];
    const color = nodo.getAttribute("color");
    const estilos = [tamano ? `font-size: ${tamano}` : "", color ? `color: ${color}` : ""].filter(Boolean);
    if (estilos.length) reemplazo.setAttribute("style", estilos.join("; "));
    reemplazo.append(...nodo.childNodes);
    nodo.replaceWith(reemplazo);
    return;
  }

  if (!ETIQUETAS.has(nodo.tagName)) {
    // La etiqueta no se permite, pero su texto si: se desenvuelve.
    nodo.replaceWith(...nodo.childNodes);
    return;
  }

  for (const atributo of [...nodo.attributes]) {
    const nombre = atributo.name.toLowerCase();

    if (nombre === "style") {
      const limpio = limpiarEstilo(atributo.value);
      if (limpio) nodo.setAttribute("style", limpio);
      else nodo.removeAttribute("style");
      continue;
    }

    if (nombre === "href" && nodo.tagName === "A") {
      if (/^(https?:|mailto:|tel:)/i.test(atributo.value.trim())) {
        nodo.setAttribute("rel", "noreferrer noopener");
        nodo.setAttribute("target", "_blank");
      } else {
        nodo.removeAttribute("href");
      }
      continue;
    }

    if (nombre === "rel" || nombre === "target") continue;

    nodo.removeAttribute(atributo.name);
  }
}

/** Deja el HTML con solo el formato permitido. Devuelve "" si no hay contenido. */
export function limpiarHtml(html: string) {
  if (!html.trim()) return "";
  if (typeof window === "undefined") return "";

  const documento = new DOMParser().parseFromString(`<div id="raiz">${html}</div>`, "text/html");
  const raiz = documento.getElementById("raiz");
  if (!raiz) return "";

  for (const hijo of [...raiz.children]) limpiarNodo(hijo, documento);

  const resultado = raiz.innerHTML.trim();
  // Un contenedor vacio que solo trae saltos de linea no es contenido.
  return resultado.replace(/<br\s*\/?>|&nbsp;|\s/gi, "") ? resultado : "";
}

/** Texto plano del protocolo, para la vista previa de la lista. */
export function resumenDeHtml(html: string, limite = 160) {
  if (typeof window === "undefined") return "";
  const documento = new DOMParser().parseFromString(html, "text/html");
  const texto = (documento.body.textContent ?? "").replace(/\s+/g, " ").trim();
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}
