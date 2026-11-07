/**
 * Genera y descarga un PDF (A4) a partir de HTML ya armado, sin abrir la
 * ventana de impresión (que no sirve en teléfonos). Se captura el contenido
 * como imagen (html2canvas-pro, compatible con los colores de Tailwind) y se
 * reparte en páginas cortando entre filas, párrafos o bloques, no a media línea.
 * Las librerías se cargan solo al pulsar el botón.
 */

const A4 = { ancho: 595.28, alto: 841.89 };
const MARGEN = 28;
const ESCALA = 2;
const CORTES = "tr, p, h1, h2, h3, li, section, header, .flag, .tipo, .kpi, .cita, .aviso, .exp, article > *, [data-corte]";

type Capacitor = { isNativePlatform?: () => boolean };

/** Posiciones (px CSS, relativas a la raíz) donde conviene cortar página. */
function puntosDeCorte(raiz: HTMLElement) {
  const arriba = raiz.getBoundingClientRect().top;
  const puntos = new Set<number>();
  raiz.querySelectorAll<HTMLElement>(CORTES).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0) puntos.add(Math.round(r.bottom - arriba));
  });
  return [...puntos].sort((a, b) => a - b);
}

async function guardar(blob: Blob, nombre: string) {
  const archivo = new File([blob], nombre, { type: "application/pdf" });
  const nativo = (window as unknown as { Capacitor?: Capacitor }).Capacitor?.isNativePlatform?.() ?? false;
  // En la app (WebView) las descargas no siempre funcionan: se ofrece compartir/guardar el archivo.
  if (nativo && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return;
    } catch {
      // Si se cancela o falla, se intenta la descarga normal.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function capturarYDescargar(raiz: HTMLElement, nombre: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const anchoCss = raiz.scrollWidth;
  const altoCss = raiz.scrollHeight;
  const cortes = puntosDeCorte(raiz);
  const lienzo = await html2canvas(raiz, { scale: ESCALA, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: anchoCss });

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const anchoUtil = A4.ancho - MARGEN * 2;
  const f = anchoUtil / anchoCss; // pt por px CSS
  const altoPagina = (A4.alto - MARGEN * 2) / f;
  let inicio = 0;
  let primera = true;
  while (inicio < altoCss - 1) {
    const limite = inicio + altoPagina;
    let fin = altoCss;
    if (limite < altoCss) {
      const candidatos = cortes.filter((c) => c > inicio + altoPagina * 0.55 && c <= limite);
      fin = candidatos.length ? candidatos[candidatos.length - 1] : limite;
    }
    const trozo = document.createElement("canvas");
    trozo.width = lienzo.width;
    trozo.height = Math.max(1, Math.round((fin - inicio) * ESCALA));
    const ctx = trozo.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, trozo.width, trozo.height);
    ctx.drawImage(lienzo, 0, Math.round(inicio * ESCALA), lienzo.width, trozo.height, 0, 0, trozo.width, trozo.height);
    if (!primera) doc.addPage();
    doc.addImage(trozo.toDataURL("image/jpeg", 0.92), "JPEG", MARGEN, MARGEN, anchoUtil, (fin - inicio) * f);
    primera = false;
    inicio = fin;
  }
  await guardar(doc.output("blob"), nombre);
}

/** PDF de un documento HTML completo (p. ej. el informe profesional), maquetado a ancho de hoja. */
export async function descargarPdfDeHtml(html: string, nombre: string) {
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  Object.assign(marco.style, { position: "fixed", left: "-10000px", top: "0", width: "794px", height: "1123px", border: "0" });
  document.body.appendChild(marco);
  try {
    await new Promise<void>((listo) => {
      marco.onload = () => listo();
      marco.srcdoc = html;
    });
    const doc = marco.contentDocument!;
    await doc.fonts?.ready;
    marco.style.height = `${doc.documentElement.scrollHeight}px`;
    await capturarYDescargar(doc.body, nombre);
  } finally {
    marco.remove();
  }
}

/** PDF de un elemento de la página (p. ej. el informe al paciente), copiado a ancho de hoja. */
export async function descargarPdfDeElemento(elemento: HTMLElement, nombre: string, ancho = 720) {
  const caja = document.createElement("div");
  caja.setAttribute("aria-hidden", "true");
  Object.assign(caja.style, { position: "fixed", left: "-10000px", top: "0", width: `${ancho}px`, background: "#ffffff", padding: "24px" });
  caja.appendChild(elemento.cloneNode(true));
  document.body.appendChild(caja);
  try {
    await document.fonts?.ready;
    await capturarYDescargar(caja, nombre);
  } finally {
    caja.remove();
  }
}

/** Nombre de archivo seguro: «Informe JJR · Ana Pérez» → «Informe_JJR_Ana_Perez.pdf». */
export const nombrePdf = (texto: string) =>
  `${texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80) || "informe"}.pdf`;
