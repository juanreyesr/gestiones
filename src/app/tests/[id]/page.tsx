import { CheckCircle2, ChevronLeft, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonCompra } from "@/components/tests/boton-compra";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { aplicacionPendiente, precioPara } from "@/lib/server/tests/compras";
import { usuarioActual } from "@/lib/server/tests/sesion";
import { AREAS_TESTS, PRECIO_PRIMERA, PRECIO_REEVALUACION, testPorId } from "@/lib/tests/catalogo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const t = testPorId((await params).id);
  return t ? { title: t.nombre, description: t.resumen } : {};
}

export default async function DetalleTest({ params }: { params: Promise<{ id: string }> }) {
  const test = testPorId((await params).id);
  if (!test) notFound();
  const area = AREAS_TESTS.find((a) => a.id === test.area)!;
  const usuario = await usuarioActual();
  const admin = getSupabaseAdmin();
  const precio = usuario && admin ? await precioPara(admin, usuario.id, test.id) : { tipo: "primera" as const, monto: PRECIO_PRIMERA };
  const pendiente = usuario && admin ? await aplicacionPendiente(admin, usuario.id, test.id) : null;

  return (
    <div className="grid gap-6">
      <Link className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800" href="/tests#catalogo">
        <ChevronLeft className="h-4 w-4" /> Catálogo
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="grid content-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{area.nombre}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{test.nombre}</h1>
          {test.explicacion.map((p) => (
            <p className="text-sm leading-7 text-slate-700" key={p}>
              {p}
            </p>
          ))}
          <p className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" /> Duración aproximada: {test.minutos}
          </p>
          <div className="grid gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Qué recibe</h2>
            <ul className="grid gap-1.5">
              {test.recibe.map((r) => (
                <li className="flex items-start gap-2 text-sm text-slate-700" key={r}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {r}
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Antes de comenzar aceptará un breve consentimiento: el test es una autoevaluación general de cómo se encuentra hoy y no constituye un diagnóstico
            clínico.
          </p>
        </article>
        <aside className="grid content-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-3xl font-semibold text-slate-900">
            US${precio.monto}
            <span className="ml-1 text-sm font-normal text-slate-500">{precio.tipo === "reevaluacion" ? "reevaluación" : "pago único"}</span>
          </p>
          <p className="text-xs text-slate-500">
            {precio.tipo === "reevaluacion"
              ? "Ya hizo este test: la reevaluación le permite comparar sus resultados."
              : `Después, cada reevaluación cuesta US$${PRECIO_REEVALUACION}.`}
          </p>
          <BotonCompra instrumento={test.id} logueado={Boolean(usuario)} monto={precio.monto} pendienteId={pendiente} tipo={precio.tipo} />
        </aside>
      </div>
    </div>
  );
}
