"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { actualizarMotivoConsulta } from "@/lib/clinica/pacientes";
import type { PacienteRow } from "@/lib/clinica/types";
import { fetchEvaluacionesDePaciente, type EvaluacionRespuestaRow } from "@/lib/evaluaciones/evaluaciones";
import { fechaLegible } from "@/lib/evaluaciones/fichas/intervencion";
import type { BaseMotivo } from "@/lib/evaluaciones/fichas/codigo";
import { diffPalabras, ETIQUETA_MOTIVO, historialMotivo, type ComparativaMotivo } from "@/lib/evaluaciones/fichas/motivo";
import { abrirSeccion, EVENTO_ABRIR_RESPUESTA, EVENTO_EVALUACIONES_CAMBIO } from "./seccion-plegable";
import { BTN_GHOST } from "./ui";

const ESTILO_ESTADO = {
  "sin-cambios": "border-slate-400/40 bg-slate-400/10 text-slate-200",
  actualizado: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  "sin-base": "border-amber-300/40 bg-amber-300/10 text-amber-100",
} as const;

function Rotulo({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</div>;
}

/** Original del expediente frente a lo escrito en la ficha 1.1, con las palabras agregadas y quitadas. */
export function ComparativaMotivoVista({ c, compacta = false }: { c: ComparativaMotivo; compacta?: boolean }) {
  return (
    <div className="grid gap-3" data-estado={c.estado} data-testid="comparativa-motivo">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${ESTILO_ESTADO[c.estado]}`} data-testid="comparativa-estado">
          {ETIQUETA_MOTIVO[c.estado]}
        </span>
        <span className="text-xs text-slate-400">
          Ficha 1.1 del {fechaLegible(c.fecha)}
          {c.delTerapeuta ? " · llenada por el terapeuta" : ""}
        </span>
      </div>

      {c.estado === "sin-base" ? (
        <div className="grid gap-1">
          <p className="text-xs text-slate-400">No había un motivo de consulta registrado antes de esta ficha.</p>
          {c.actual ? <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{c.actual}</p> : null}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid content-start gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <Rotulo>
              Motivo inicial · {c.base!.fuente}
              {c.base!.fecha ? `, ${fechaLegible(c.base!.fecha)}` : ""}
            </Rotulo>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{c.base!.motivo}</p>
          </div>
          <div className="grid content-start gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <Rotulo>Motivo en la ficha 1.1 · {fechaLegible(c.fecha)}</Rotulo>
            {c.estado === "actualizado" ? (
              <p className="text-sm leading-6 text-slate-200" data-testid="comparativa-diff">
                {c.diff.map((t, i) => (
                  <span key={i}>
                    {i ? " " : ""}
                    {t.tipo === "agregado" ? (
                      <ins className="rounded bg-emerald-400/20 px-0.5 text-emerald-100 no-underline">{t.texto}</ins>
                    ) : t.tipo === "quitado" ? (
                      <del className="text-slate-500 line-through">{t.texto}</del>
                    ) : (
                      t.texto
                    )}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-sm leading-6 text-slate-400">{c.actual ? "Lo dejó igual." : "No escribió el motivo: se mantiene el inicial."}</p>
            )}
          </div>
        </div>
      )}
      {c.estado === "actualizado" ? (
        <p className="text-[11px] text-slate-500">
          <ins className="rounded bg-emerald-400/20 px-0.5 text-emerald-100 no-underline">Verde</ins>: agregado ·{" "}
          <del className="text-slate-500 line-through">tachado</del>: quitado
        </p>
      ) : null}

      {!compacta ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {c.desdeCuando ? (
            <div>
              <Rotulo>Desde cuándo</Rotulo>
              <dd className="text-slate-200">{c.desdeCuando}</dd>
            </div>
          ) : null}
          {c.afectaHoy !== null ? (
            <div>
              <Rotulo>Cuánto le afecta hoy</Rotulo>
              <dd className="text-slate-200">{c.afectaHoy} de 10</dd>
            </div>
          ) : null}
          {c.areas.length ? (
            <div className="sm:col-span-2">
              <Rotulo>Áreas donde lo nota</Rotulo>
              <dd className="text-slate-200">{c.areas.join(", ")}</dd>
            </div>
          ) : null}
          {c.metas.length ? (
            <div className="sm:col-span-2">
              <Rotulo>Metas</Rotulo>
              <ul className="grid gap-0.5 text-slate-200">
                {c.metas.map((m, i) => (
                  <li key={i}>
                    • {m.meta || "(sin meta escrita)"}
                    {m.avance ? <span className="text-slate-400"> · avance: {m.avance}</span> : null}
                    {m.plazo ? <span className="text-slate-400"> · plazo: {m.plazo}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {c.primera ? (
            <div className="sm:col-span-2">
              <Rotulo>Meta para empezar</Rotulo>
              <dd className="text-slate-200">{c.primera}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

/** Editor «Llenarla yo» de la 1.1 (solo el terapeuta): motivo inicial y cambios mientras escribe. */
export function ComparacionEnVivo({ base, actual }: { base: BaseMotivo; actual: string }) {
  const sinCambios = !actual.trim() || diffPalabras(base.motivo, actual).every((t) => t.tipo === "igual");
  return (
    <div className="-mt-1 grid gap-1 rounded-lg border border-sky-300/30 bg-sky-300/5 p-3 text-sm" data-testid="comparacion-en-vivo">
      <Rotulo>
        Solo para usted · motivo inicial ({base.fuente}
        {base.fecha ? `, ${fechaLegible(base.fecha)}` : ""})
      </Rotulo>
      <p className="whitespace-pre-wrap leading-6 text-slate-300">{base.motivo}</p>
      {sinCambios ? (
        <span className="text-xs text-slate-400">Sin cambios frente al motivo inicial.</span>
      ) : (
        <p className="leading-6 text-slate-200">
          <span className="mr-1 text-xs font-semibold text-emerald-300">Cambios:</span>
          {diffPalabras(base.motivo, actual).map((t, i) => (
            <span key={i}>
              {i ? " " : ""}
              {t.tipo === "agregado" ? (
                <ins className="rounded bg-emerald-400/20 px-0.5 text-emerald-100 no-underline">{t.texto}</ins>
              ) : t.tipo === "quitado" ? (
                <del className="text-slate-500 line-through">{t.texto}</del>
              ) : (
                t.texto
              )}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

/**
 * Bloque de la ficha clínica: motivo y metas según la ficha 1.1 más reciente, comparado con el
 * motivo inicial, con el botón para pasar la versión nueva al expediente e historial de fichas 1.1.
 */
export function MotivoYMetas({ paciente, onActualizado }: { paciente: PacienteRow; onActualizado: () => void }) {
  const [historial, setHistorial] = useState<(ComparativaMotivo & { fila: EvaluacionRespuestaRow })[]>([]);
  const [error, setError] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      fetchEvaluacionesDePaciente(paciente.id).then((r) => {
        if (vivo) setHistorial(historialMotivo(r.respuestas));
      });
    void cargar();
    const alCambiar = () => void cargar();
    window.addEventListener(EVENTO_EVALUACIONES_CAMBIO, alCambiar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_EVALUACIONES_CAMBIO, alCambiar);
    };
  }, [paciente.id]);

  const ultima = historial[0];
  if (!ultima) return null;
  const yaEnExpediente = ultima.actual && ultima.actual.trim() === (paciente.motivoConsulta ?? "").trim();

  const usarVersion = async () => {
    if (trabajando || !ultima.actual) return;
    if (
      !window.confirm(
        "¿Usar el motivo escrito en la ficha 1.1 como motivo de consulta del expediente?\n\nEl motivo anterior no se pierde: queda guardado en la ficha 1.1 como «motivo inicial»."
      )
    )
      return;
    setTrabajando(true);
    setError("");
    const r = await actualizarMotivoConsulta(paciente.id, ultima.actual);
    setTrabajando(false);
    if (r.error) setError(r.error);
    else onActualizado();
  };

  const abrir = (id: string) => {
    abrirSeccion("evaluaciones");
    setTimeout(() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_RESPUESTA, { detail: id })), 80);
  };

  return (
    <div className="grid gap-3 border-t border-white/10 pt-3" data-testid="motivo-y-metas">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Motivo y metas (actualizado en la ficha 1.1 del {fechaLegible(ultima.fecha)})</div>
      <ComparativaMotivoVista c={ultima} />
      <div className="flex flex-wrap items-center gap-2">
        {ultima.actual && ultima.estado !== "sin-cambios" && !yaEnExpediente ? (
          <button className={BTN_GHOST} data-testid="usar-motivo-ficha" disabled={trabajando} onClick={() => void usarVersion()} type="button">
            <RefreshCw className="h-4 w-4" />
            {trabajando ? "Guardando…" : "Usar esta versión como motivo de consulta del expediente"}
          </button>
        ) : null}
        {yaEnExpediente && ultima.estado !== "sin-cambios" ? <span className="text-xs text-emerald-300">Esta versión ya es el motivo de consulta del expediente.</span> : null}
        {ultima.fila.id ? (
          <button className="text-xs text-slate-400 underline hover:text-white" onClick={() => abrir(ultima.fila.id)} type="button">
            Ver la ficha completa
          </button>
        ) : null}
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
      {historial.length > 1 ? (
        <details className="rounded-lg border border-white/10 p-2 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-slate-300">Historial: {historial.length} fichas 1.1</summary>
          <div className="mt-2 grid gap-3">
            {historial.slice(1).map((h) => (
              <ComparativaMotivoVista c={h} compacta key={h.fila.id} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
