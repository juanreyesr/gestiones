"use client";

import { Cake, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  cuandoCumple,
  cumpleanosProximos,
  enlaceCumpleanosDocente,
  hoyGuatemala,
  nombreConTitulo,
  type ProximoCumple,
} from "@/lib/cumpleanos-docentes";
import { fetchDocentesAdmin, type DocenteAdminRow } from "@/lib/docentes-admin";

/**
 * Alerta de cumpleaños de docentes activos en Coordinacion: aparece cada vez
 * que se entra al area, desde 7 dias antes y hasta el dia del cumpleaños (ese
 * dia con boton para felicitarlo por WhatsApp). Se puede cerrar hasta la
 * siguiente entrada.
 */
export function CumpleanosDocentesAlerta() {
  const [proximos, setProximos] = useState<ProximoCumple<DocenteAdminRow>[]>([]);
  const [cerrada, setCerrada] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetchDocentesAdmin().then(({ data }) => {
      if (!vigente) return;
      setProximos(
        cumpleanosProximos(
          data.filter((d) => d.activo),
          hoyGuatemala(),
        ),
      );
    });
    return () => {
      vigente = false;
    };
  }, []);

  if (cerrada || proximos.length === 0) return null;

  return (
    <div className="relative border border-amber-300/40 bg-amber-300/10 p-4 pr-12 backdrop-blur-xl" role="status">
      <button
        aria-label="Cerrar aviso de cumpleaños"
        className="absolute right-3 top-3 p-1 text-amber-100/70 transition hover:text-white"
        onClick={() => setCerrada(true)}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase text-amber-200">
        <Cake className="h-4 w-4" />
        Cumpleaños de docentes
      </div>
      <ul className="grid gap-2">
        {proximos.map(({ docente, fecha, diasFaltan }) => (
          <li className="flex flex-wrap items-center justify-between gap-3" key={docente.id}>
            <span className="text-sm text-slate-100">
              {diasFaltan === 0 ? "🎂 " : "🎈 "}
              <b className="text-white">{nombreConTitulo(docente)}</b> cumple años {cuandoCumple(diasFaltan, fecha)}
              {docente.telefono ? "" : " · sin teléfono registrado"}
            </span>
            {diasFaltan === 0 ? (
              <a
                className="inline-flex items-center gap-2 bg-emerald-300 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-200"
                href={enlaceCumpleanosDocente(docente)}
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Felicitar por WhatsApp
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
