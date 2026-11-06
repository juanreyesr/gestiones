"use client";

import { DatabaseBackup, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { descargarRespaldo, type ResultadoRespaldo } from "@/lib/respaldo";
import { BTN_ACCENT, SectionCard } from "./ui";

const CLAVE_ULTIMO = "gestionesjj-ultimo-respaldo";

const leerUltimo = () => {
  try {
    return localStorage.getItem(CLAVE_ULTIMO);
  } catch {
    return null;
  }
};

/** Respaldo completo descargable (Clínica → Configuración). */
export function RespaldoDatos() {
  const [ultimo, setUltimo] = useState<string | null>(() => (typeof window === "undefined" ? null : leerUltimo()));
  const [avance, setAvance] = useState<{ hechas: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoRespaldo | null>(null);
  const [error, setError] = useState("");

  const descargar = async () => {
    setError("");
    setResultado(null);
    setAvance({ hechas: 0, total: 1 });
    try {
      const r = await descargarRespaldo((hechas, total) => setAvance({ hechas, total }));
      setResultado(r);
      const ahora = new Date().toISOString();
      try {
        localStorage.setItem(CLAVE_ULTIMO, ahora);
      } catch {
        // sin almacenamiento local: solo no se recuerda la fecha
      }
      setUltimo(ahora);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el respaldo.");
    } finally {
      setAvance(null);
    }
  };

  const conError = resultado?.tablas.filter((t) => t.error) ?? [];
  return (
    <SectionCard title="Respaldo de datos">
      <div className="grid gap-3 text-sm text-slate-300" data-testid="respaldo-datos">
        <p className="leading-6">
          Descarga en este dispositivo un archivo con <strong className="text-white">todos los datos</strong> del sistema: pacientes, citas,
          sesiones, consentimientos, evaluaciones e informes, aula virtual, recursos, encuestas, pendientes y configuración. No incluye
          contraseñas ni los archivos subidos (solo sus referencias).
        </p>
        <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Contiene datos clínicos confidenciales. Guárdalo en un lugar cifrado (por ejemplo, un disco o carpeta con contraseña) y
          descárgalo al menos una vez al mes; te lo recordaré por Telegram el día 1.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button className={BTN_ACCENT} disabled={avance !== null} onClick={() => void descargar()} type="button">
            <DatabaseBackup className="h-4 w-4" />
            {avance ? `Preparando… ${Math.round((avance.hechas / avance.total) * 100)} %` : "Descargar respaldo completo"}
          </button>
          <span className="text-xs text-slate-400">
            {ultimo ? `Último respaldo en este dispositivo: ${new Date(ultimo).toLocaleString("es-GT")}` : "Aún no has descargado un respaldo en este dispositivo."}
          </span>
        </div>
        {resultado ? (
          <p className="text-xs text-emerald-300">
            Listo: {resultado.archivo} · {resultado.filas.toLocaleString("es-GT")} registros de {resultado.tablas.length} tablas.
            {conError.length ? ` ${conError.length} tabla(s) sin leer: ${conError.map((t) => `${t.tabla.replace("gestionesjj_", "")} (${t.error})`).join("; ")}.` : ""}
          </p>
        ) : null}
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
      </div>
    </SectionCard>
  );
}
