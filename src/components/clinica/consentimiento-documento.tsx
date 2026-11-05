"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { ModalPortal } from "@/components/modal-portal";
import {
  PLANTILLA_INICIAL,
  seccionesConsentimiento,
  type DatosConsentimiento,
  type PlantillaConsentimiento,
} from "@/lib/clinica/consentimiento";

/** Ventana con el texto completo del consentimiento (formulario público, fondo claro). */
export function ConsentimientoModal({
  datos,
  onAceptar,
  onCerrar,
  plantilla = PLANTILLA_INICIAL,
}: {
  datos: DatosConsentimiento;
  onAceptar?: () => void;
  onCerrar: () => void;
  plantilla?: PlantillaConsentimiento;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
    };
  }, [onCerrar]);

  return (
    <ModalPortal>
      <div
        aria-labelledby="consentimiento-titulo"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
        onClick={onCerrar}
        role="dialog"
      >
        <div
          className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white text-slate-800 shadow-xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900" id="consentimiento-titulo">
                Consentimiento informado
              </h2>
              <p className="text-xs text-slate-500">
                Atención psicológica presencial y virtual{datos.esMenor ? " · menor de edad" : ""} · versión {plantilla.version}
              </p>
            </div>
            <button aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={onCerrar} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 sm:p-5">
            <ConsentimientoTexto datos={datos} plantilla={plantilla} />
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4">
            <button className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={onCerrar} type="button">
              Cerrar
            </button>
            {onAceptar ? (
              <button
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                onClick={() => {
                  onAceptar();
                  onCerrar();
                }}
                type="button"
              >
                He leído y acepto
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function ConsentimientoTexto({
  datos,
  plantilla = PLANTILLA_INICIAL,
}: {
  datos: DatosConsentimiento;
  plantilla?: PlantillaConsentimiento;
}) {
  return (
    <div className="grid gap-4 text-sm leading-6">
      {seccionesConsentimiento(datos, plantilla).map((s, i) => (
        <section key={`${i}-${s.titulo}`}>
          <h3 className="mb-1 font-semibold text-slate-900">{s.titulo}</h3>
          {s.parrafos.map((p, i) => (
            <p className="mb-1.5" key={i}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
