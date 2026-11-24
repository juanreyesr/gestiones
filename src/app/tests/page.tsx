import { ArrowRight, Clock, ShieldCheck, TrendingUp, UserRound } from "lucide-react";
import Link from "next/link";
import { AREAS_TESTS, PRECIO_PRIMERA, PRECIO_REEVALUACION, testsDeArea } from "@/lib/tests/catalogo";

export default function CatalogoTests() {
  return (
    <div className="grid gap-10">
      <section className="grid gap-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">Tests psicométricos en línea</p>
        <h1 className="max-w-2xl text-2xl font-semibold leading-tight sm:text-4xl">Conózcase mejor, mida cómo se encuentra hoy y siga su avance en el tiempo.</h1>
        <p className="max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
          Instrumentos seleccionados y elaborados por el M. A. Juan José Reyes, psicólogo. Resultados inmediatos en lenguaje sencillo, guardados en su cuenta para
          comparar cuando vuelva a evaluarse.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" href="#catalogo">
            Ver los tests <ArrowRight className="h-4 w-4" />
          </a>
          <span className="text-sm text-emerald-50">
            US${PRECIO_PRIMERA} por test · Reevaluación US${PRECIO_REEVALUACION} · PayPal o tarjeta
          </span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { Icono: UserRound, titulo: "1. Cree su cuenta", texto: "Con su correo. Ahí quedan sus resultados y su historial." },
          { Icono: Clock, titulo: "2. Responda a su ritmo", texto: "Se guarda su avance automáticamente; puede continuar después." },
          { Icono: TrendingUp, titulo: "3. Vea su resultado y su avance", texto: "Informe inmediato y comparación cada vez que se reevalúe." },
        ].map(({ Icono, titulo, texto }) => (
          <div className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-4" key={titulo}>
            <Icono className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
            <p className="text-sm leading-6 text-slate-600">{texto}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-8" id="catalogo">
        {AREAS_TESTS.map((area) => (
          <section className="grid gap-3" key={area.id}>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{area.nombre}</h2>
              <p className="text-sm leading-6 text-slate-600">{area.descripcion}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {testsDeArea(area.id).map((t) => (
                <Link
                  className="group grid content-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
                  href={`/tests/${t.id}`}
                  key={t.id}
                >
                  <div className="grid gap-1">
                    <h3 className="text-base font-semibold text-slate-900">{t.nombre}</h3>
                    <p className="text-sm leading-6 text-slate-600">{t.resumen}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {t.minutos}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 group-hover:underline">
                      US${PRECIO_PRIMERA} · Ver detalles <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          Estos tests son herramientas de <strong>autoevaluación</strong>: muestran de forma general cómo se encuentra en este momento. No son un diagnóstico clínico;
          solo un profesional de la salud mental, con más información sobre su caso, puede emitir un criterio clínico. Son para personas de 18 años o más.
        </p>
      </section>
    </div>
  );
}
