"use client";

import { ClipboardList, HeartPulse } from "lucide-react";
import { useEffect, useState } from "react";
import { FORMULARIOS } from "./formularios";
import { ConsentimientoEvaluacion, type DatosConsentimientoEvaluacion } from "./consentimiento-evaluacion";

type Info = {
  estado: "cargando" | "ok" | "completa" | "cerrada" | "invalido";
  instrumento?: string | null;
  ref?: string | null;
  borrador?: unknown;
  opciones?: Record<string, unknown> | null;
  /** firmado = false: antes de responder hay que firmar el consentimiento informado. */
  consentimiento?: ({ firmado: false } & DatosConsentimientoEvaluacion) | { firmado: true };
};

/** Página pública /evaluacion/<token>: elige el formulario del registro según el instrumento asignado. */
export function EvaluacionPublica({ token }: { token: string }) {
  const [info, setInfo] = useState<Info>({ estado: "cargando" });

  useEffect(() => {
    let vivo = true;
    fetch(`/api/evaluacion/${token}`)
      .then((r) => r.json())
      .then((d: Info) => vivo && setInfo(d.estado ? d : { estado: "invalido" }))
      .catch(() => vivo && setInfo({ estado: "invalido" }));
    return () => {
      vivo = false;
    };
  }, [token]);

  let contenido: React.ReactNode;
  if (info.estado === "cargando") {
    contenido = <p className="py-10 text-center text-sm text-slate-400">Cargando...</p>;
  } else if (info.estado === "ok" && info.consentimiento?.firmado === false) {
    const datosConsentimiento = info.consentimiento;
    contenido = (
      <ConsentimientoEvaluacion
        datos={datosConsentimiento}
        onFirmado={() => {
          setInfo((prev) => ({ ...prev, consentimiento: { firmado: true } }));
          window.scrollTo({ top: 0 });
        }}
        token={token}
      />
    );
  } else if (info.estado === "ok" && info.instrumento && FORMULARIOS[info.instrumento]) {
    contenido = FORMULARIOS[info.instrumento]({ borrador: info.borrador ?? null, codigoCaso: info.ref ?? "", opciones: info.opciones, token });
  } else {
    const titulo =
      info.estado === "completa" ? "Este formulario ya fue enviado" : info.estado === "cerrada" ? "Formulario no disponible" : "Enlace no válido";
    const detalle =
      info.estado === "completa"
        ? "Sus respuestas ya quedaron registradas. Si necesita responderlo de nuevo, pida a su psicólogo que lo vuelva a habilitar."
        : info.estado === "cerrada"
          ? "Su psicólogo cerró este formulario. Si necesita responderlo, pídale que lo vuelva a habilitar."
          : "Este enlace no es válido o ya no está disponible. Solicite uno nuevo a su psicólogo.";
    contenido = (
      <div className="grid gap-3 py-8 text-center">
        <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
        <p className="text-base font-semibold text-slate-900">{titulo}</p>
        <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500">{detalle}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
            <HeartPulse className="h-4 w-4 text-emerald-600" />
          </span>
          Atención psicológica · Lic. Juan J. Reyes
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">{contenido}</div>
      </div>
    </main>
  );
}
