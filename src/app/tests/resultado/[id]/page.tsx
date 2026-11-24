import { CalendarHeart, ChevronLeft, LifeBuoy, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InformePacienteVista } from "@/components/evaluaciones/informe-paciente-vista";
import { aplicacionDe } from "@/lib/server/tests/aplicaciones";
import { usuarioActual } from "@/lib/server/tests/sesion";
import { PRECIO_REEVALUACION, RECURSOS_CRISIS, testPorId } from "@/lib/tests/catalogo";
import { informeDeAplicacion } from "@/lib/tests/informe";

export const metadata: Metadata = { title: "Mi resultado", robots: { index: false } };
export const dynamic = "force-dynamic";

const dia = (iso: string) => iso.slice(0, 10);

export default async function ResultadoTest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioActual();
  if (!usuario) redirect(`/tests/cuenta?siguiente=${encodeURIComponent(`/tests/resultado/${id}`)}`);
  const { admin, fila } = await aplicacionDe(usuario.id, id);
  if (!admin || !fila) notFound();
  if (!fila.completada_at) redirect(`/tests/aplicar/${id}`);

  // Aplicación anterior del mismo test (para comparar) y el último RIASEC (para valores laborales).
  const [{ data: ant }, { data: ria }] = await Promise.all([
    admin
      .from("tests_aplicaciones")
      .select("datos,completada_at")
      .eq("usuario_id", usuario.id)
      .eq("instrumento", fila.instrumento)
      .lt("completada_at", fila.completada_at)
      .order("completada_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fila.instrumento === "valores"
      ? admin
          .from("tests_aplicaciones")
          .select("datos")
          .eq("usuario_id", usuario.id)
          .eq("instrumento", "riasec")
          .not("completada_at", "is", null)
          .order("completada_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const anterior = ant as { datos: Record<string, unknown> | null; completada_at: string } | null;
  const informe = informeDeAplicacion(
    { instrumento: fila.instrumento, datos: fila.datos, fecha: dia(fila.completada_at) },
    {
      nombre: usuario.nombre,
      anterior: anterior ? { instrumento: fila.instrumento, datos: anterior.datos, fecha: dia(anterior.completada_at) } : null,
      riasec: (ria as { datos: Record<string, unknown> | null } | null)?.datos ?? null,
    }
  );
  const test = testPorId(fila.instrumento);

  return (
    <div className="grid gap-5">
      <Link className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800" href="/tests/cuenta">
        <ChevronLeft className="h-4 w-4" /> Mi cuenta
      </Link>

      {fila.alerta ? (
        <section className="grid gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <LifeBuoy className="h-5 w-5" /> Usted no está solo: busque ayuda hoy
          </h2>
          <p className="text-sm leading-6">
            Por lo que respondió, es importante que hable hoy con alguien. Si tiene pensamientos de hacerse daño, busque ayuda inmediata:
          </p>
          <ul className="list-disc pl-5 text-sm leading-6">
            {RECURSOS_CRISIS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
        {informe ? (
          <InformePacienteVista informe={informe} />
        ) : (
          <p className="text-sm text-slate-600">Sus respuestas quedaron guardadas, pero no fue posible generar el informe. Escríbanos y lo revisamos.</p>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link className="grid gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 hover:shadow-sm" href="/agendar">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CalendarHeart className="h-5 w-5" /> Conversar mis resultados con un psicólogo
          </span>
          <span className="text-sm leading-6 text-emerald-900/80">Agende una consulta para profundizar y recibir un acompañamiento a su medida.</span>
        </Link>
        <Link className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm" href={`/tests/${fila.instrumento}`}>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <RotateCcw className="h-5 w-5 text-emerald-600" /> Reevaluarme más adelante
          </span>
          <span className="text-sm leading-6 text-slate-600">
            Le recomendamos repetir «{test?.nombre}» en unas 4 semanas para ver su avance (US${PRECIO_REEVALUACION}).
          </span>
        </Link>
      </section>
    </div>
  );
}
