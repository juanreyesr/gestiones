"use client";

import { fichaPorId } from "@/lib/evaluaciones/fichas/catalogo";
import type { FichaTecnica, VistaFicha } from "@/lib/bibliotecas/tipos";
import { CLASES, Lista, Seccion, type TemaFichaClinica } from "./ficha-clinica-vista";

/**
 * Ficha de una técnica terapéutica (biblioteca de psicoterapia). Vista terapeuta: sin caso, preguntas
 * ni clave. Vista estudiante: con caso, preguntas de práctica y clave.
 */
export function FichaTecnicaVista({
  ficha,
  vista,
  tema = "panel",
  accionesFicha,
}: {
  ficha: FichaTecnica;
  vista: VistaFicha;
  tema?: TemaFichaClinica;
  accionesFicha?: (fichaId: string) => React.ReactNode;
}) {
  const t = CLASES[tema];
  return (
    <article className="grid gap-4" data-ficha-tecnica={ficha.id} data-vista={vista}>
      <header className="grid gap-1">
        <h3 className={`text-xl font-semibold leading-tight ${t.titulo}`}>{ficha.nombre}</h3>
        <p className={`text-xs ${t.suave}`}>{ficha.modelo}</p>
      </header>
      <p className={`text-sm leading-6 ${t.texto}`}>{ficha.enPocasPalabras}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Seccion t={t} titulo="Cuándo usarla">
          <Lista items={ficha.indicaciones} t={t} />
        </Seccion>
        <Seccion t={t} titulo="Precauciones">
          <div className={`rounded-lg border p-3 ${t.alerta}`}>
            <ul className="grid list-disc gap-1 pl-5 text-sm leading-6">
              {ficha.precauciones.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </Seccion>
      </div>

      <Seccion t={t} titulo="Cómo aplicarla, paso a paso">
        <ol className={`grid list-decimal gap-1 pl-5 text-sm leading-6 ${t.texto}`}>
          {ficha.pasos.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      </Seccion>

      <Seccion t={t} titulo="Ejemplo de diálogo">
        <div className={`grid gap-1.5 rounded-lg border p-3 text-sm leading-6 ${t.caja}`}>
          {ficha.dialogo.map((linea, i) => {
            const [quien, ...resto] = linea.split(":");
            const tieneRol = resto.length > 0 && /^(Terapeuta|Paciente)$/.test(quien.trim());
            return (
              <p className={t.texto} key={i}>
                {tieneRol ? <strong className={t.titulo}>{quien.trim()}:</strong> : null}
                {tieneRol ? resto.join(":") : linea}
              </p>
            );
          })}
        </div>
      </Seccion>

      <Seccion t={t} titulo="Errores frecuentes">
        <Lista items={ficha.errores} t={t} />
      </Seccion>
      <Seccion t={t} titulo="Evidencia">
        <p className={`text-sm leading-6 ${t.texto}`}>{ficha.evidencia}</p>
      </Seccion>

      {ficha.fichas.length ? (
        <Seccion t={t} titulo="Fichas terapéuticas para trabajarla">
          <div className="grid gap-1.5">
            {ficha.fichas.map((id) => {
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
        </Seccion>
      ) : null}

      {vista === "estudiante" ? (
        <>
          <Seccion t={t} titulo="Caso para practicar">
            <p className={`rounded-lg border p-3 text-sm leading-6 ${t.caja} ${t.texto}`}>{ficha.caso}</p>
          </Seccion>
          <Seccion t={t} titulo="Preguntas para practicar">
            <Lista items={ficha.preguntas} t={t} />
          </Seccion>
          <Seccion t={t} titulo="Clave para recordar">
            <p className={`text-sm font-semibold leading-6 ${t.titulo}`}>{ficha.clave}</p>
          </Seccion>
        </>
      ) : null}

      <Seccion t={t} titulo="Referencias">
        <ul className={`grid gap-0.5 text-xs leading-5 ${t.suave}`}>
          {ficha.referencias.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Seccion>
      <p className={`text-[11px] leading-5 ${t.suave}`}>Material de referencia de redacción propia, para la formación y la práctica clínica supervisada.</p>
    </article>
  );
}
