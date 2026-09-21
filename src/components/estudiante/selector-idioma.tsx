"use client";

import { Languages } from "lucide-react";
import type { Idioma } from "@/lib/cursos/types";
import { IDIOMA_LABELS, IDIOMAS } from "@/lib/estudiante/i18n";
import { useIdioma } from "./idioma-context";

export function SelectorIdioma({ className, onChange }: { className?: string; onChange?: (idioma: Idioma) => void }) {
  const { idioma, setIdioma } = useIdioma();

  return (
    <label className={`inline-flex items-center gap-1.5 text-slate-400 ${className ?? ""}`}>
      <Languages className="h-4 w-4" />
      <select
        aria-label="Idioma"
        className="rounded-full border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs font-medium text-slate-600 outline-none focus:border-slate-400"
        onChange={(event) => {
          const nuevo = event.target.value as Idioma;
          setIdioma(nuevo);
          onChange?.(nuevo);
        }}
        value={idioma}
      >
        {IDIOMAS.map((opcion) => (
          <option key={opcion} value={opcion}>
            {IDIOMA_LABELS[opcion]}
          </option>
        ))}
      </select>
    </label>
  );
}
