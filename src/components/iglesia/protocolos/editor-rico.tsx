"use client";

import { Bold, Italic, List, ListOrdered, Palette, RemoveFormatting, Underline } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { limpiarHtml } from "@/lib/iglesia/html-seguro";

// Tamanos que ofrece la barra. El valor es el que entiende execCommand
// ("fontSize" del 1 al 7); html-seguro.ts lo traduce a em para que el zoom de
// la pantalla completa escale todo por igual.
const TAMANOS: Array<{ valor: string; label: string; clase: string }> = [
  { valor: "2", label: "Pequeño", clase: "text-[11px]" },
  { valor: "3", label: "Normal", clase: "text-sm" },
  { valor: "5", label: "Grande", clase: "text-base" },
  { valor: "6", label: "Título", clase: "text-lg" },
];

const COLORES = ["#e2e8f0", "#00c875", "#fdab3d", "#e2445c", "#6d5bd0", "#0086c0"];

const BOTON = "flex h-8 min-w-8 items-center justify-center border border-white/10 bg-white/8 px-2 text-slate-200 transition hover:border-emerald-300/50 hover:text-white";

/**
 * Editor de texto con lo basico: negrita, cursiva, subrayado, tamano, color,
 * vinetas y numeracion.
 *
 * Usa document.execCommand sobre un contenteditable. Esta marcado como obsoleto
 * en la especificacion pero sigue funcionando en todos los navegadores, y para
 * cuatro herramientas evita meter un editor de 300 KB en la app. Lo que salga
 * de aqui pasa siempre por limpiarHtml antes de guardarse.
 */
export function EditorRico({
  contenidoInicial,
  onChange,
}: {
  contenidoInicial: string;
  onChange: (html: string) => void;
}) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const [colorAbierto, setColorAbierto] = useState(false);

  useEffect(() => {
    // El contenido se escribe una sola vez: a partir de ahi manda el DOM del
    // contenteditable, no React (si React lo re-renderizara, el cursor saltaria).
    if (areaRef.current) areaRef.current.innerHTML = contenidoInicial;
  }, [contenidoInicial]);

  const ejecutar = (comando: string, valor?: string, conCss = true) => {
    areaRef.current?.focus();
    document.execCommand("styleWithCSS", false, String(conCss));
    document.execCommand(comando, false, valor);
    if (areaRef.current) onChange(limpiarHtml(areaRef.current.innerHTML));
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5 border border-white/10 bg-white/5 p-1.5">
        <button className={`${BOTON} font-bold`} onMouseDown={(evento) => evento.preventDefault()} onClick={() => ejecutar("bold")} title="Negrita" type="button">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button className={BOTON} onMouseDown={(evento) => evento.preventDefault()} onClick={() => ejecutar("italic")} title="Cursiva" type="button">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button className={BOTON} onMouseDown={(evento) => evento.preventDefault()} onClick={() => ejecutar("underline")} title="Subrayado" type="button">
          <Underline className="h-3.5 w-3.5" />
        </button>

        <span className="mx-1 h-5 w-px bg-white/10" />

        {TAMANOS.map((tamano) => (
          <button
            className={`${BOTON} ${tamano.clase} font-semibold`}
            key={tamano.valor}
            onClick={() => ejecutar("fontSize", tamano.valor, false)}
            onMouseDown={(evento) => evento.preventDefault()}
            title={`Tamaño ${tamano.label.toLowerCase()}`}
            type="button"
          >
            A
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-white/10" />

        <div className="relative">
          <button
            className={BOTON}
            onClick={() => setColorAbierto((previo) => !previo)}
            onMouseDown={(evento) => evento.preventDefault()}
            title="Color del texto"
            type="button"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
          {colorAbierto ? (
            <div className="absolute left-0 top-9 z-20 flex gap-1 border border-white/15 bg-slate-950 p-1.5 shadow-xl">
              {COLORES.map((color) => (
                <button
                  className="h-6 w-6 border border-white/20"
                  key={color}
                  onClick={() => {
                    ejecutar("foreColor", color);
                    setColorAbierto(false);
                  }}
                  onMouseDown={(evento) => evento.preventDefault()}
                  style={{ backgroundColor: color }}
                  title={color}
                  type="button"
                />
              ))}
            </div>
          ) : null}
        </div>

        <span className="mx-1 h-5 w-px bg-white/10" />

        <button className={BOTON} onMouseDown={(evento) => evento.preventDefault()} onClick={() => ejecutar("insertUnorderedList")} title="Viñetas" type="button">
          <List className="h-3.5 w-3.5" />
        </button>
        <button className={BOTON} onMouseDown={(evento) => evento.preventDefault()} onClick={() => ejecutar("insertOrderedList")} title="Numeración" type="button">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        <button
          className={`${BOTON} ml-auto`}
          onClick={() => ejecutar("removeFormat")}
          onMouseDown={(evento) => evento.preventDefault()}
          title="Quitar formato"
          type="button"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className="contenido-protocolo min-h-[320px] w-full overflow-y-auto border border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-100 outline-none focus:border-emerald-300/60"
        contentEditable
        onInput={() => {
          if (areaRef.current) onChange(limpiarHtml(areaRef.current.innerHTML));
        }}
        onPaste={(evento) => {
          // Se pega como texto plano: lo que venga de Word o del navegador trae
          // estilos que no queremos arrastrar.
          evento.preventDefault();
          const texto = evento.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, texto);
        }}
        ref={areaRef}
        suppressContentEditableWarning
      />
    </div>
  );
}
