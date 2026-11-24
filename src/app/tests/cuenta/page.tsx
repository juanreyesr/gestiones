import { ArrowRight, FileText, Play, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AccesoTests } from "@/components/tests/acceso-tests";
import { BotonSalir, CambiarContrasena, PreferenciasContacto } from "@/components/tests/cuenta-acciones";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { usuarioActual } from "@/lib/server/tests/sesion";
import { PRECIO_REEVALUACION, testPorId } from "@/lib/tests/catalogo";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };
export const dynamic = "force-dynamic";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });

type Fila = { id: string; instrumento: string; created_at: string; completada_at: string | null };

export default async function CuentaTests({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  const { siguiente } = await searchParams;
  // Solo rutas internas de /tests (evita redirecciones abiertas).
  const destino = typeof siguiente === "string" && /^\/tests(\/[\w-]*)*$/.test(siguiente) ? siguiente : "/tests/cuenta";
  const usuario = await usuarioActual();
  if (!usuario) {
    return (
      <div className="grid gap-4">
        <div className="mx-auto grid max-w-lg gap-1 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Su cuenta de tests</h1>
          <p className="text-sm leading-6 text-slate-600">Guarde sus resultados, continúe donde se quedó y compare su avance cada vez que se reevalúe.</p>
        </div>
        <AccesoTests siguiente={destino} />
      </div>
    );
  }

  const admin = getSupabaseAdmin();
  const { data } = admin
    ? await admin
        .from("tests_aplicaciones")
        .select("id,instrumento,created_at,completada_at")
        .eq("usuario_id", usuario.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const filas = (data ?? []) as Fila[];
  const pendientes = filas.filter((f) => !f.completada_at);
  const porTest = new Map<string, Fila[]>();
  for (const f of filas.filter((x) => x.completada_at)) porTest.set(f.instrumento, [...(porTest.get(f.instrumento) ?? []), f]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Hola, {usuario.nombre.split(" ")[0]}</h1>
          <p className="text-sm text-slate-600">{usuario.correo}</p>
        </div>
        <BotonSalir />
      </div>

      {pendientes.length ? (
        <section className="grid gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-900">Tests por terminar</h2>
          {pendientes.map((p) => (
            <Link className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm hover:shadow-sm" href={`/tests/aplicar/${p.id}`} key={p.id}>
              <span className="font-medium text-slate-900">{testPorId(p.instrumento)?.nombre ?? p.instrumento}</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                <Play className="h-4 w-4" /> Continuar
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Mis resultados</h2>
        {porTest.size === 0 ? (
          <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            Aún no ha completado ningún test.
            <Link className="inline-flex items-center gap-1 font-semibold text-emerald-700" href="/tests#catalogo">
              Ver el catálogo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          [...porTest.entries()].map(([instrumento, apps]) => (
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4" key={instrumento}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">{testPorId(instrumento)?.nombre ?? instrumento}</h3>
                <Link className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline" href={`/tests/${instrumento}`}>
                  <RotateCcw className="h-4 w-4" /> Reevaluarme (US${PRECIO_REEVALUACION})
                </Link>
              </div>
              <ul className="grid gap-1">
                {apps.map((a, i) => (
                  <li key={a.id}>
                    <Link className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50" href={`/tests/resultado/${a.id}`}>
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <FileText className="h-4 w-4 text-slate-400" /> {fecha(a.completada_at!)}
                        {i === 0 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Más reciente</span> : null}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">Ver informe</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {apps.length > 1 ? <p className="text-xs text-slate-500">El informe más reciente incluye la comparación con su aplicación anterior cuando el test lo permite.</p> : null}
            </div>
          ))
        )}
      </section>

      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Comunicaciones</h2>
        <PreferenciasContacto acepta={usuario.aceptaContacto} intereses={usuario.intereses} />
      </section>

      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Seguridad</h2>
        <CambiarContrasena />
      </section>
    </div>
  );
}
