import type { Metadata } from "next";
import { citaDeToken, leerCitaPublica, urlGoogleCalendar } from "@/lib/server/cita-publica";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu cita · Ps. Juan J. Reyes",
  robots: { index: false, follow: false },
};

/**
 * Pagina que recibe el paciente en el mensaje de confirmacion: datos basicos
 * de la cita (sin informacion clinica) y botones para agregarla al calendario.
 */
export default async function CitaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const citaId = citaDeToken(token);
  const admin = getSupabaseAdmin();
  const cita = citaId && admin ? await leerCitaPublica(admin, citaId) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#171918] px-4 py-10 text-[#f4f1ea]">
      <section className="w-full max-w-md border border-white/15 bg-[#1f2120] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9a6b35]">Ps. Juan J. Reyes</p>
        {!cita ? (
          <>
            <h1 className="mt-3 font-serif text-3xl">Enlace no válido</h1>
            <p className="mt-3 text-sm text-[#b8b5ad]">No encontramos esta cita. Escríbenos por WhatsApp si necesitas ayuda.</p>
          </>
        ) : cita.estado === "cancelada" ? (
          <>
            <h1 className="mt-3 font-serif text-3xl">Cita cancelada</h1>
            <p className="mt-3 text-sm text-[#b8b5ad]">Esta cita ya no está vigente.</p>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-serif text-3xl leading-tight">
              {cita.primerNombre ? `${cita.primerNombre}, tu cita está confirmada` : "Tu cita está confirmada"}
            </h1>
            <dl className="mt-6 grid gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-[#b8b5ad]">Fecha</dt>
                <dd className="mt-0.5 text-base first-letter:uppercase">{cita.fecha}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-[#b8b5ad]">Hora</dt>
                <dd className="mt-0.5 text-base">
                  {cita.hora}
                  {cita.aclaracion}
                </dd>
              </div>
              {cita.modalidad ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-[#b8b5ad]">Modalidad</dt>
                  <dd className="mt-0.5 text-base">{cita.modalidad === "virtual" ? "Virtual" : "Presencial"}</dd>
                </div>
              ) : null}
              {cita.modalidad !== "virtual" && cita.direccion ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-[#b8b5ad]">Lugar</dt>
                  <dd className="mt-0.5 text-base">
                    {cita.direccion}
                    {cita.mapsUrl ? (
                      <>
                        {" · "}
                        <a className="text-[#c99a5f] underline" href={cita.mapsUrl} rel="noopener" target="_blank">
                          Ver en el mapa
                        </a>
                      </>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>

            {cita.pasada ? (
              <p className="mt-6 text-sm text-[#b8b5ad]">Esta cita ya pasó.</p>
            ) : (
              <div className="mt-7 grid gap-3">
                <a
                  className="flex min-h-12 items-center justify-center bg-[#9a6b35] px-4 text-sm font-semibold uppercase tracking-[0.1em] text-[#f4f1ea] transition hover:bg-[#ad7a3f]"
                  href={`/api/cita/ics?t=${encodeURIComponent(token)}`}
                >
                  Agregar a mi calendario
                </a>
                <a
                  className="flex min-h-12 items-center justify-center border border-white/25 px-4 text-sm font-semibold uppercase tracking-[0.1em] transition hover:border-[#9a6b35]"
                  href={urlGoogleCalendar(cita)}
                  rel="noopener"
                  target="_blank"
                >
                  Agregar a Google Calendar
                </a>
                <p className="text-xs leading-5 text-[#b8b5ad]">
                  &quot;Agregar a mi calendario&quot; incluye un recordatorio un día antes (iPhone, Samsung, Outlook). En
                  Google Calendar el aviso sigue la configuración de tu calendario.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
