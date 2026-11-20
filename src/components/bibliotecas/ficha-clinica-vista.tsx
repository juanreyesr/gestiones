"use client";

import { fichaPorId } from "@/lib/evaluaciones/fichas/catalogo";
import type { FichaClinica, VistaFicha } from "@/lib/bibliotecas/tipos";

/** Nombres de las etapas del plan TCC (las mismas de las Fichas terapéuticas JJR). */
const ETAPAS: Record<number, string> = {
  1: "Evaluación y formulación",
  2: "Psicoeducación",
  3: "Técnicas cognitivas",
  4: "Técnicas conductuales",
  5: "Prevención de recaídas",
};

export type TemaFichaClinica = "panel" | "claro";

const CLASES: Record<TemaFichaClinica, { titulo: string; texto: string; suave: string; rotulo: string; caja: string; alerta: string; ficha: string }> = {
  panel: {
    titulo: "text-white",
    texto: "text-slate-200",
    suave: "text-slate-400",
    rotulo: "text-slate-400",
    caja: "border-white/10 bg-white/[0.03]",
    alerta: "border-red-400/40 bg-red-500/10 text-red-100",
    ficha: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  },
  claro: {
    titulo: "text-slate-900",
    texto: "text-slate-700",
    suave: "text-slate-500",
    rotulo: "text-slate-500",
    caja: "border-slate-200 bg-slate-50",
    alerta: "border-red-200 bg-red-50 text-red-900",
    ficha: "border-teal-200 bg-teal-50 text-teal-900",
  },
};

type Clases = (typeof CLASES)[TemaFichaClinica];

function Seccion({ t, titulo, children }: { t: Clases; titulo: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-1.5">
      <h4 className={`text-[11px] font-semibold uppercase tracking-wide ${t.rotulo}`}>{titulo}</h4>
      {children}
    </section>
  );
}

function Lista({ t, items }: { t: Clases; items: string[] }) {
  return (
    <ul className={`grid list-disc gap-1 pl-5 text-sm leading-6 ${t.texto}`}>
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

/**
 * Una ficha clínica de una Biblioteca JJR. La vista decide qué partes se muestran:
 *  - terapeuta: todo menos el caso y la clave; incluye «Cómo lo detecta el sistema».
 *  - estudiante: sin «Cómo lo detecta el sistema»; con caso y clave para recordar.
 * `accionesFicha` (solo panel) dibuja botones por cada ficha terapéutica del plan.
 */
export function FichaClinicaVista({
  ficha,
  vista,
  tema = "panel",
  accionesFicha,
}: {
  ficha: FichaClinica;
  vista: VistaFicha;
  tema?: TemaFichaClinica;
  accionesFicha?: (fichaId: string) => React.ReactNode;
}) {
  const t = CLASES[tema];
  return (
    <article className="grid gap-4" data-ficha-clinica={ficha.id} data-vista={vista}>
      <header className="grid gap-1">
        <h3 className={`text-xl font-semibold leading-tight ${t.titulo}`}>{ficha.nombre}</h3>
        <p className={`text-xs ${t.suave}`}>
          DSM-5-TR: {ficha.codigos.dsm} · CIE-11: {ficha.codigos.cie}
        </p>
      </header>

      <p className={`text-sm leading-6 ${t.texto}`}>{ficha.enPocasPalabras}</p>

      <Seccion t={t} titulo="Síntomas clave">
        <Lista t={t} items={ficha.sintomasClave} />
      </Seccion>
      <Seccion t={t} titulo="Duración y umbral">
        <p className={`text-sm leading-6 ${t.texto}`}>{ficha.duracion}</p>
      </Seccion>

      <Seccion t={t} titulo="No confundir con">
        <div className="grid gap-2 sm:grid-cols-2">
          {ficha.noConfundir.map((d, i) => (
            <div className={`rounded-lg border p-2.5 ${t.caja}`} key={i}>
              <div className={`text-sm font-semibold ${t.titulo}`}>{d.con}</div>
              <p className={`text-sm leading-6 ${t.texto}`}>{d.diferencia}</p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion t={t} titulo="Preguntas para la entrevista">
        <Lista t={t} items={ficha.preguntas} />
      </Seccion>

      <Seccion t={t} titulo="Señales de alerta">
        <div className={`rounded-lg border p-3 ${t.alerta}`}>
          <ul className="grid list-disc gap-1 pl-5 text-sm leading-6">
            {ficha.alertas.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      </Seccion>

      <Seccion t={t} titulo="Plan TCC por etapas">
        <ol className="grid gap-2">
          {ficha.plan.map((p, i) => (
            <li className={`grid gap-1.5 rounded-lg border p-2.5 ${t.caja}`} key={i}>
              <div className={`text-xs font-semibold ${t.suave}`}>
                Etapa {p.etapa} · {ETAPAS[p.etapa]}
              </div>
              <p className={`text-sm leading-6 ${t.texto}`}>{p.texto}</p>
              {p.fichas.length ? (
                <div className="grid gap-1.5">
                  {p.fichas.map((id) => {
                    const f = fichaPorId(id);
                    if (!f) return null;
                    return (
                      <div className={`flex flex-wrap items-center gap-2 rounded border px-2 py-1.5 text-xs ${t.ficha}`} data-ficha-terapeutica={id} key={id}>
                        <span className="min-w-0 flex-1 font-semibold">
                          Ficha {f.id} · {f.titulo}
                        </span>
                        {accionesFicha?.(id)}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </Seccion>

      {vista === "terapeuta" ? (
        <Seccion t={t} titulo="Cómo lo detecta el sistema">
          <Lista t={t} items={ficha.deteccion} />
        </Seccion>
      ) : (
        <>
          <Seccion t={t} titulo="Caso para analizar">
            <p className={`rounded-lg border p-3 text-sm leading-6 ${t.caja} ${t.texto}`}>{ficha.caso}</p>
          </Seccion>
          <Seccion t={t} titulo="Clave para recordar">
            <p className={`text-sm font-semibold leading-6 ${t.titulo}`}>{ficha.clave}</p>
          </Seccion>
        </>
      )}

      <Seccion t={t} titulo="Referencias">
        <ul className={`grid gap-0.5 text-xs leading-5 ${t.suave}`}>
          {ficha.referencias.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Seccion>
      <p className={`text-[11px] leading-5 ${t.suave}`}>
        Material de referencia de redacción propia. Los códigos son del DSM-5-TR y la CIE-11; los criterios completos deben consultarse en los manuales
        oficiales y el diagnóstico requiere entrevista clínica.
      </p>
    </article>
  );
}
