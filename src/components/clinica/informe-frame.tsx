"use client";

import { Printer } from "lucide-react";
import { useRef, useState } from "react";
import { BTN_ACCENT } from "./ui";

/** Documento del informe dentro de un iframe (fondo claro, listo para imprimir). */
export function InformeFrame({ html, titulo, textoBoton = "Imprimir o guardar PDF" }: { html: string; titulo: string; textoBoton?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [alto, setAlto] = useState(900);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button className={BTN_ACCENT} onClick={() => ref.current?.contentWindow?.print()} type="button">
          <Printer className="h-4 w-4" />
          {textoBoton}
        </button>
      </div>
      <iframe
        className="w-full rounded border border-white/10 bg-white"
        onLoad={() => {
          const doc = ref.current?.contentDocument;
          if (doc) setAlto(doc.documentElement.scrollHeight + 8);
        }}
        ref={ref}
        srcDoc={html}
        style={{ height: alto }}
        title={titulo}
      />
    </div>
  );
}
