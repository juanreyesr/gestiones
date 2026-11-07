"use client";

import { Download, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { descargarPdfDeHtml, nombrePdf } from "@/lib/pdf-desde-html";
import { BTN_ACCENT, BTN_GHOST } from "./ui";

/**
 * Documento del informe dentro de un iframe (fondo claro). «Descargar PDF»
 * genera y descarga el archivo directamente (funciona en el teléfono); imprimir
 * queda como opción secundaria.
 */
export function InformeFrame({ html, titulo, textoBoton = "Descargar PDF" }: { html: string; titulo: string; textoBoton?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [alto, setAlto] = useState(900);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  // Altura del contenido (no del marco), también al abrir o plegar secciones
  // («Mostrar respuestas ítem por ítem»). Se mide al cargar y con cada cambio de tamaño.
  useEffect(() => {
    const marco = ref.current;
    if (!marco) return;
    let observador: ResizeObserver | null = null;
    const preparar = () => {
      const doc = marco.contentDocument;
      if (!doc?.body) return;
      const medir = () => setAlto(Math.ceil(doc.body.getBoundingClientRect().height) + 8);
      medir();
      observador?.disconnect();
      observador = new ResizeObserver(medir);
      observador.observe(doc.body);
    };
    if (marco.contentDocument?.readyState === "complete" && marco.contentDocument.body?.childElementCount) preparar();
    marco.addEventListener("load", preparar);
    return () => {
      marco.removeEventListener("load", preparar);
      observador?.disconnect();
    };
  }, [html]);

  const descargar = async () => {
    setGenerando(true);
    setError("");
    try {
      await descargarPdfDeHtml(html, nombrePdf(`${titulo} ${new Date().toISOString().slice(0, 10)}`));
    } catch {
      setError("No se pudo generar el PDF. Intenta de nuevo o usa «Imprimir».");
    } finally {
      setGenerando(false);
    }
  };
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button className={BTN_ACCENT} disabled={generando} onClick={() => void descargar()} type="button">
          <Download className="h-4 w-4" />
          {generando ? "Generando PDF…" : textoBoton}
        </button>
        <button className={BTN_GHOST} onClick={() => ref.current?.contentWindow?.print()} type="button">
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <iframe
        className="w-full rounded border border-white/10 bg-white"
        ref={ref}
        srcDoc={html}
        style={{ height: alto }}
        title={titulo}
      />
    </div>
  );
}
