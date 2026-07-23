"use client";

import { CheckCircle2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchCampanas } from "@/lib/encuestas/campanas";
import { insertRespuestaRetroactiva } from "@/lib/encuestas/respuestas";
import { respuestaVacia, type CampanaConConteo, type RespuestaEncuestaPayload } from "@/lib/encuestas/types";
import {
  SeccionCarrera,
  SeccionCierre,
  SeccionComoLlego,
  SeccionExpectativas,
  SeccionPerfil,
  SeccionUniversidad,
} from "./secciones";
import { BTN_PRIMARY, EmptyState, ErrorBanner, Field } from "./ui";

export function CapturaRapida({ campanaPreseleccionada }: { campanaPreseleccionada: CampanaConConteo | null }) {
  const [campanas, setCampanas] = useState<CampanaConConteo[]>([]);
  const [campanaId, setCampanaId] = useState(campanaPreseleccionada?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [valor, setValor] = useState<RespuestaEncuestaPayload>(respuestaVacia());
  const [guardadas, setGuardadas] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await fetchCampanas();
    setCampanas(data);
    setError(fetchError ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de campanas al montar la captura rapida
    void cargar();
  }, [cargar]);

  const onChange = (patch: Partial<RespuestaEncuestaPayload>) => setValor((current) => ({ ...current, ...patch }));

  const puedeGuardar =
    campanaId !== "" &&
    valor.fuente_conocimiento.trim() !== "" &&
    valor.razones_universidad.length > 0 &&
    valor.razones_carrera.length > 0 &&
    valor.quien_influyo.trim() !== "" &&
    valor.expectativas_carrera.length > 0 &&
    valor.expectativa_universidad.length > 0;

  const handleGuardar = async () => {
    if (!puedeGuardar || guardando) return;
    setGuardando(true);
    setError("");
    const { error: saveError } = await insertRespuestaRetroactiva(campanaId, valor);
    setGuardando(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setValor(respuestaVacia());
    setGuardadas((n) => n + 1);
    setConfirmacion(true);
    setTimeout(() => setConfirmacion(false), 2000);
  };

  if (loading) return <p className="text-sm text-slate-400">Cargando campañas...</p>;

  if (campanas.length === 0) {
    return <EmptyState>Primero crea una campaña en la pestaña &quot;Campañas&quot; para poder transcribir encuestas.</EmptyState>;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <Field label="Campaña">
          <select className="field" onChange={(event) => setCampanaId(event.target.value)} value={campanaId}>
            <option value="">Selecciona una campaña</option>
            {campanas.map((campana) => (
              <option key={campana.id} value={campana.id}>
                {campana.anio} · {campana.titulo}
              </option>
            ))}
          </select>
        </Field>
        {guardadas > 0 ? (
          <span className="inline-flex items-center gap-2 border border-emerald-300/40 bg-emerald-300/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            {guardadas} transcritas en esta sesión
          </span>
        ) : null}
      </div>

      <ErrorBanner message={error} />

      {campanaId ? (
        <div className="grid gap-6">
          <SeccionComoLlego onChange={onChange} valor={valor} />
          <SeccionUniversidad onChange={onChange} valor={valor} />
          <SeccionCarrera onChange={onChange} valor={valor} />
          <SeccionExpectativas onChange={onChange} valor={valor} />
          <SeccionPerfil onChange={onChange} valor={valor} />
          <SeccionCierre onChange={onChange} valor={valor} />

          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            {confirmacion ? <span className="text-sm font-semibold text-emerald-200">Guardada. Lista para la siguiente.</span> : null}
            <button className={BTN_PRIMARY} disabled={!puedeGuardar || guardando} onClick={() => void handleGuardar()} type="button">
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar y transcribir la siguiente"}
            </button>
          </div>
        </div>
      ) : (
        <EmptyState>Selecciona una campaña para empezar a transcribir.</EmptyState>
      )}
    </div>
  );
}
