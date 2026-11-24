import { ArrowDownRight, ArrowRight, ArrowUpRight, LifeBuoy, Target, TrendingUp } from "lucide-react";
import type { GraficaPaciente, InformePaciente, MetasInformePaciente, TonoResultado } from "@/lib/evaluaciones/informe-paciente";

const COLOR: Record<TonoResultado, string> = {
  bien: "border-emerald-200 bg-emerald-50 text-emerald-800",
  leve: "border-sky-200 bg-sky-50 text-sky-800",
  atencion: "border-amber-200 bg-amber-50 text-amber-900",
  alto: "border-rose-200 bg-rose-50 text-rose-900",
};

const fechaLarga = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
};

const TENDENCIA = {
  mejora: { texto: "Mejoró", clase: "text-emerald-700", Icono: ArrowDownRight },
  igual: { texto: "Se mantiene", clase: "text-slate-500", Icono: ArrowRight },
  empeora: { texto: "Aumentó", clase: "text-rose-700", Icono: ArrowUpRight },
} as const;

/** Informe para el paciente (fondo claro). Lo usan la vista previa del panel y /informe/<token>. */
export function InformePacienteVista({ informe }: { informe: InformePaciente }) {
  return (
    <article className="grid gap-5 text-slate-800">
      <header className="grid gap-1">
        <h1 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">{informe.titulo}</h1>
        <p className="text-sm text-slate-500">
          {informe.paciente ? <>Para: <strong className="text-slate-700">{informe.paciente}</strong> · </> : null}
          {informe.fechaAplicacion ? <>Respondido el {fechaLarga(informe.fechaAplicacion)} · </> : null}
          {informe.profesional}
        </p>
      </header>
      <p className="text-sm leading-6">{informe.intro}</p>
      {informe.destacado ? (
        <section className="grid gap-1 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950">
          <h2 className="text-lg font-semibold">{informe.destacado.titulo}</h2>
          {informe.destacado.texto ? <p className="text-sm leading-6">{informe.destacado.texto}</p> : null}
        </section>
      ) : null}

      {informe.grafica ? <GraficaBarras grafica={informe.grafica} /> : null}

      {informe.metas ? <MetasVista metas={informe.metas} /> : null}

      {informe.evolucion ? (
        <section className="grid gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4" data-testid="evolucion-paciente">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-indigo-950">
            <TrendingUp className="h-5 w-5" />
            {informe.evolucion.titulo}
          </h2>
          <p className="text-sm leading-6 text-slate-700">{informe.evolucion.resumen}</p>
          <div className="grid gap-2">
            {informe.evolucion.areas.map((a) => {
              const t = TENDENCIA[a.tendencia];
              const fechas = informe.evolucion!.fechas;
              return (
                <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3" key={a.area}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{a.area}</h3>
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold ${t.clase}`}>
                      <t.Icono className="h-4 w-4" />
                      {t.texto}
                    </span>
                  </div>
                  <ol className="flex flex-wrap items-end gap-x-1 gap-y-2">
                    {a.puntos.map((p, i) => (
                      <li className="flex items-end gap-1" key={i}>
                        {i > 0 ? <span className="pb-1 text-slate-300">→</span> : null}
                        <span className="grid justify-items-center gap-0.5">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">{i === fechas.length - 1 ? "Hoy" : fechas[i]}</span>
                          {p ? (
                            <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${COLOR[p.tono]}`}>{p.nivel}</span>
                          ) : (
                            <span className="px-2 text-xs text-slate-300" title="No se aplicó esa vez">—</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-sm leading-6 text-slate-700">{a.frase}</p>
                </div>
              );
            })}
          </div>
          {informe.evolucion.mejoras.length || informe.evolucion.atencion.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {informe.evolucion.mejoras.length ? (
                <div className="rounded-lg border border-emerald-200 bg-white p-3">
                  <h3 className="text-sm font-semibold text-emerald-800">Molestias que más disminuyeron</h3>
                  <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-slate-700">
                    {informe.evolucion.mejoras.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {informe.evolucion.atencion.length ? (
                <div className="rounded-lg border border-amber-200 bg-white p-3">
                  <h3 className="text-sm font-semibold text-amber-900">Molestias que aumentaron (para seguir trabajando)</h3>
                  <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-slate-700">
                    {informe.evolucion.atencion.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {informe.resultados.length > 0 ? (
        <section className="grid gap-3">
          {informe.resultados.map((r) => (
            <div className="grid gap-1.5 rounded-xl border border-slate-200 p-4" key={r.area}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">{r.area}</h2>
                <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${COLOR[r.tono]}`}>
                  {r.nivel}
                  {r.puntuacion ? ` · ${r.puntuacion}` : ""}
                </span>
              </div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{r.periodo}</p>
              <TextoResultado texto={r.texto} />
            </div>
          ))}
        </section>
      ) : null}

      {informe.notas ? (
        <section className="grid gap-1.5 rounded-xl border-l-4 border-teal-600 bg-teal-50 p-4">
          <h2 className="text-base font-semibold text-slate-900">Comentarios de su psicólogo</h2>
          <p className="whitespace-pre-wrap text-sm leading-6">{informe.notas}</p>
        </section>
      ) : null}

      {informe.ayuda ? (
        <section className="grid gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <h2 className="flex items-center gap-2 font-semibold">
            <LifeBuoy className="h-4 w-4" />
            Si en algún momento siente que no puede mantenerse a salvo
          </h2>
          <ul className="list-disc pl-5">
            {informe.ayuda.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="border-t border-slate-100 pt-3 text-xs leading-5 text-slate-400">{informe.aviso}</p>
    </article>
  );
}

/** Barras horizontales de un solo tono (la más alta, resaltada), con el valor escrito al lado. */
function GraficaBarras({ grafica }: { grafica: GraficaPaciente }) {
  return (
    <section className="grid gap-3 rounded-xl border border-slate-200 p-4" data-corte data-testid="grafica-paciente">
      <h2 className="text-base font-semibold text-slate-900">{grafica.titulo}</h2>
      <div className="grid gap-2" role="list">
        {grafica.barras.map((b) => (
          <div
            aria-label={`${b.etiqueta}: ${b.texto}`}
            className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
            key={b.etiqueta}
            role="listitem"
          >
            <span className={`text-xs leading-tight ${b.destacada ? "font-semibold text-slate-900" : "text-slate-600"}`}>{b.etiqueta}</span>
            <span className="relative h-3 rounded-full bg-slate-100">
              {b.valor !== null ? (
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${b.destacada ? "bg-teal-700" : "bg-teal-500"}`}
                  style={{ width: `${Math.max(2, (b.valor / grafica.max) * 100)}%` }}
                />
              ) : null}
            </span>
            <span className={`whitespace-nowrap text-right text-xs ${b.destacada ? "font-bold text-slate-900" : "text-slate-600"}`}>{b.texto}</span>
          </div>
        ))}
      </div>
      {grafica.escala ? (
        <p className="text-[11px] leading-5 text-slate-500">{grafica.escala.map((e, i) => `${i} = ${e}`).join(" · ")}</p>
      ) : null}
      {grafica.nota ? <p className="text-xs leading-5 text-slate-500">{grafica.nota}</p> : null}
    </section>
  );
}

/** Texto de un resultado: párrafos separados por línea en blanco y viñetas «• » como lista. */
function TextoResultado({ texto }: { texto: string }) {
  return (
    <div className="grid gap-2 text-sm leading-6">
      {texto.split(/\n\s*\n/).map((parrafo, i) => {
        const lineas = parrafo.split("\n");
        const vinetas = lineas.filter((l) => l.startsWith("• "));
        if (!vinetas.length) return <p className="whitespace-pre-line" key={i}>{parrafo}</p>;
        const encabezado = lineas.filter((l) => !l.startsWith("• ")).join(" ");
        return (
          <div key={i}>
            {encabezado ? <p>{encabezado}</p> : null}
            <ul className="list-disc pl-5">
              {vinetas.map((v) => (
                <li key={v}>{v.slice(2)}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const ESTADO_META = {
  activa: { texto: "En proceso", clase: "border-sky-200 bg-sky-50 text-sky-800" },
  lograda: { texto: "¡Lograda!", clase: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  pausada: { texto: "En pausa", clase: "border-slate-200 bg-slate-50 text-slate-600" },
} as const;

const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" });
};

/** Línea de avance de 0 a 10 (una marca por registro). */
function LineaAvance({ puntos }: { puntos: { fecha: string; valor: number }[] }) {
  const ancho = 300;
  const alto = 70;
  const pad = 8;
  const x = (i: number) => (puntos.length === 1 ? ancho / 2 : pad + (i * (ancho - 2 * pad)) / (puntos.length - 1));
  const y = (v: number) => alto - pad - (v / 10) * (alto - 2 * pad);
  return (
    <svg
      aria-label={`Su avance: ${puntos.map((p) => `${p.valor} de 10 el ${fechaCorta(p.fecha)}`).join(", ")}`}
      className="h-auto w-full max-w-sm"
      role="img"
      viewBox={`0 0 ${ancho} ${alto}`}
    >
      {[0, 5, 10].map((v) => (
        <g key={v}>
          <line stroke="#e2e8f0" x1={pad + 14} x2={ancho - pad} y1={y(v)} y2={y(v)} />
          <text fill="#94a3b8" fontSize="9" x={0} y={y(v) + 3}>
            {v}
          </text>
        </g>
      ))}
      <path
        d={puntos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ")}
        fill="none"
        stroke="#0d9488"
        strokeWidth={2.5}
      />
      {puntos.map((p, i) => (
        <circle cx={x(i)} cy={y(p.valor)} fill="#0d9488" key={i} r={3.5} />
      ))}
    </svg>
  );
}

function MetasVista({ metas }: { metas: MetasInformePaciente }) {
  return (
    <section className="grid gap-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4" data-testid="metas-paciente">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-teal-950">
        <Target className="h-5 w-5" />
        {metas.titulo}
      </h2>
      {metas.intro ? <p className="text-sm leading-6 text-slate-700">{metas.intro}</p> : null}
      <div className="grid gap-2">
        {metas.items.map((m, i) => (
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3" key={i}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{m.meta}</h3>
              <span className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${ESTADO_META[m.estado].clase}`}>
                {ESTADO_META[m.estado].texto}
                {m.puntos.length ? ` · ${m.puntos[m.puntos.length - 1].valor} de 10` : ""}
              </span>
            </div>
            {m.indicador ? <p className="text-xs text-slate-500">Cómo lo notamos: {m.indicador}</p> : null}
            {m.puntos.length > 1 ? (
              <div className="grid gap-0.5">
                <LineaAvance puntos={m.puntos} />
                <p className="text-[11px] text-slate-400">
                  Del {fechaCorta(m.puntos[0].fecha)} al {fechaCorta(m.puntos[m.puntos.length - 1].fecha)}
                </p>
              </div>
            ) : null}
            <p className="text-sm leading-6 text-slate-700">{m.frase}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
