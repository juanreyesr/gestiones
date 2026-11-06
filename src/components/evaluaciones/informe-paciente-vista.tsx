import { LifeBuoy } from "lucide-react";
import type { InformePaciente, TonoResultado } from "@/lib/evaluaciones/informe-paciente";

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
          <p className="text-sm leading-6">{informe.destacado.texto}</p>
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
              <p className="whitespace-pre-line text-sm leading-6">{r.texto}</p>
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
