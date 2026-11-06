"use client";

import { FileSignature, FileText } from "lucide-react";
import { useState } from "react";
import { ResponsablesFields } from "@/components/booking/datos-paciente-page";
import { ConsentimientoModal } from "@/components/clinica/consentimiento-documento";
import { RESPONSABLE_VACIO, type PlantillaConsentimiento, type Responsable } from "@/lib/clinica/consentimiento";

export type DatosConsentimientoEvaluacion = {
  esMenor: boolean;
  pacienteNombre: string;
  identificacion: string;
  responsables: Responsable[];
  plantilla: PlantillaConsentimiento;
};

/**
 * Paso previo de una evaluación por enlace cuando el paciente aún no firmó el
 * consentimiento informado: se lee, se firma (nombre del expediente +
 * identificación; padres o tutores si es menor) y se continúa al cuestionario.
 */
export function ConsentimientoEvaluacion({
  datos,
  onFirmado,
  token,
}: {
  datos: DatosConsentimientoEvaluacion;
  onFirmado: () => void;
  token: string;
}) {
  const { esMenor, pacienteNombre, plantilla } = datos;
  const [identificacion, setIdentificacion] = useState(datos.identificacion);
  const [responsables, setResponsables] = useState<Responsable[]>(
    datos.responsables.length ? datos.responsables.map((r) => ({ ...RESPONSABLE_VACIO, ...r })) : [{ ...RESPONSABLE_VACIO }]
  );
  const [acepta, setAcepta] = useState(false);
  const [leido, setLeido] = useState(false);
  const [declaraTutela, setDeclaraTutela] = useState(false);
  const [asentimiento, setAsentimiento] = useState(false);
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const firmar = async () => {
    if (enviando) return;
    const firmantes = responsables.filter((r) => r.nombre.trim() || r.identificacion.trim());
    if (esMenor && (firmantes.length === 0 || firmantes.some((r) => !r.nombre.trim() || !r.identificacion.trim()))) {
      setError("Escriba el nombre y el número de identificación de cada padre, madre o tutor que firma.");
      return;
    }
    if (esMenor && !declaraTutela) {
      setError("Confirme que ejerce la patria potestad o tutela legal del menor.");
      return;
    }
    if (!esMenor && !identificacion.trim()) {
      setError("Escriba su número de identificación para firmar.");
      return;
    }
    if (!acepta) {
      setError("Para continuar debe leer y aceptar el consentimiento informado.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/evaluacion/${token}/consentimiento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acepta: true,
          identificacion: esMenor ? "" : identificacion.trim(),
          responsables: esMenor ? firmantes : [],
          declaraTutela: esMenor ? declaraTutela : null,
          asentimientoMenor: esMenor ? asentimiento : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { estado?: string; error?: string };
      setEnviando(false);
      if (!res.ok) {
        setError(data.error ?? "No se pudo registrar la firma. Intente de nuevo.");
        return;
      }
      if (data.estado === "firmado" || data.estado === "ya_firmado") onFirmado();
      else setError("Este enlace ya no está disponible. Pida uno nuevo a su psicólogo.");
    } catch {
      setEnviando(false);
      setError("No se pudo conectar. Revise su conexión e intente de nuevo.");
    }
  };

  return (
    <div className="grid gap-5" data-testid="consentimiento-evaluacion">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <FileSignature className="h-5 w-5 text-amber-600" />
        </span>
        <div>
          <h1 className="text-xl font-semibold leading-tight text-slate-900">Primero: consentimiento informado</h1>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Antes de responder el test {esMenor ? "deben" : "debes"} leer y firmar el consentimiento informado, el cual es
            necesario antes de responder las preguntas. Solo se firma una vez; después{" "}
            {esMenor ? "podrán" : "podrás"} continuar con el cuestionario.
          </p>
        </div>
      </div>

      <button
        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-teal-600 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-900"
        onClick={() => setVer(true)}
        type="button"
      >
        <FileText className="h-4 w-4" />
        Leer el consentimiento informado
      </button>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        {esMenor ? "Paciente (menor de edad)" : "Paciente"}: <strong>{pacienteNombre || "—"}</strong>
      </div>

      {esMenor ? (
        <ResponsablesFields onChange={setResponsables} value={responsables} />
      ) : (
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase text-slate-500">Número de documento de identificación *</span>
          <input
            className="field-light"
            maxLength={40}
            onChange={(e) => setIdentificacion(e.target.value)}
            value={identificacion}
          />
        </label>
      )}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        {esMenor ? (
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input checked={declaraTutela} className="mt-1 h-4 w-4 shrink-0" onChange={(e) => setDeclaraTutela(e.target.checked)} type="checkbox" />
            <span>Declaro que ejerzo la patria potestad o la tutela legal del menor. *</span>
          </label>
        ) : null}
        {esMenor ? (
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input checked={asentimiento} className="mt-1 h-4 w-4 shrink-0" onChange={(e) => setAsentimiento(e.target.checked)} type="checkbox" />
            <span>Le explicamos al menor, según su edad, que asistirá a atención psicológica y está de acuerdo.</span>
          </label>
        ) : null}
        <label className="flex items-start gap-3 text-sm leading-6 text-slate-900">
          <input
            checked={acepta}
            className="mt-1 h-4 w-4 shrink-0"
            data-testid="acepta-consentimiento"
            disabled={!leido}
            onChange={(e) => setAcepta(e.target.checked)}
            type="checkbox"
          />
          <span>
            He leído y acepto el consentimiento informado. *
            {!leido ? <span className="block text-xs text-slate-500">Primero ábralo con el botón «Leer el consentimiento informado».</span> : null}
          </span>
        </label>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <button
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-4 text-base font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
        disabled={enviando || !acepta}
        onClick={() => void firmar()}
        type="button"
      >
        <FileSignature className="h-4 w-4" />
        {enviando ? "Registrando firma..." : "Firmar y continuar al test"}
      </button>
      <p className="-mt-2 text-center text-xs text-slate-400">
        La aceptación electrónica (casilla, nombre e identificación) tiene el mismo valor que una firma; se registran la fecha y la hora.
      </p>

      {ver ? (
        <ConsentimientoModal
          datos={{
            esMenor,
            pacienteNombre,
            pacienteIdentificacion: identificacion,
            responsables: responsables.filter((r) => r.nombre.trim()),
          }}
          onAceptar={() => {
            setLeido(true);
            setAcepta(true);
          }}
          onCerrar={() => {
            setLeido(true);
            setVer(false);
          }}
          plantilla={plantilla}
        />
      ) : null}
    </div>
  );
}
